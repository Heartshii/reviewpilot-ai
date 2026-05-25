import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";

function parsePublishTime(value?: string) {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractReviewText(review: {
  text?: { text?: string };
  originalText?: { text?: string };
}) {
  return review.text?.text?.trim() || review.originalText?.text?.trim() || "";
}

async function fetchPlaceDetails(placeId: string) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_PLACES_API_KEY");
  }

  const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "id,displayName,formattedAddress,googleMapsUri,primaryTypeDisplayName,rating,userRatingCount,reviews,reviewSummary",
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Google Places details failed: ${message}`);
  }

  const place = (await response.json()) as {
    displayName?: { text?: string };
    formattedAddress?: string;
    googleMapsUri?: string;
    primaryTypeDisplayName?: { text?: string };
    rating?: number;
    userRatingCount?: number;
    reviewSummary?: { text?: string };
    reviews?: Array<{
      text?: { text?: string };
      originalText?: { text?: string };
      publishTime?: string;
    }>;
  };

  const reviews = place.reviews ?? [];
  const latestReview = reviews
    .map((review) => ({
      text: extractReviewText(review),
      publishTime: parsePublishTime(review.publishTime),
    }))
    .filter((review) => review.text)
    .sort((a, b) => (b.publishTime ?? 0) - (a.publishTime ?? 0))[0];

  return {
    name: place.displayName?.text?.trim() || "Competitor",
    formattedAddress: place.formattedAddress?.trim() || undefined,
    googleMapsUri: place.googleMapsUri?.trim() || undefined,
    primaryType: place.primaryTypeDisplayName?.text?.trim() || undefined,
    rating: typeof place.rating === "number" ? place.rating : undefined,
    reviewCount:
      typeof place.userRatingCount === "number" ? place.userRatingCount : undefined,
    reviewSummary: place.reviewSummary?.text?.trim() || undefined,
    latestReviewSnippet: latestReview?.text || undefined,
    latestReviewPublishedAt: latestReview?.publishTime,
    highlights: reviews
      .map(extractReviewText)
      .filter(Boolean)
      .slice(0, 3),
  };
}

export const getCompetitorIdsForSync = internalQuery({
  args: {},
  handler: async (ctx) => {
    const competitors = await ctx.db.query("competitors").collect();
    return competitors
      .filter((competitor) => competitor.active)
      .map((competitor) => competitor._id);
  },
});

export const getCompetitorForSync = internalQuery({
  args: {
    competitorId: v.id("competitors"),
  },
  handler: async (ctx, { competitorId }) => {
    return await ctx.db.get(competitorId);
  },
});

export const upsertCompetitorSnapshot = internalMutation({
  args: {
    competitorId: v.id("competitors"),
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
    name: v.string(),
    formattedAddress: v.optional(v.string()),
    googleMapsUri: v.optional(v.string()),
    primaryType: v.optional(v.string()),
    rating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
    reviewSummary: v.optional(v.string()),
    latestReviewSnippet: v.optional(v.string()),
    latestReviewPublishedAt: v.optional(v.number()),
    highlights: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.competitorId, {
      name: args.name,
      formattedAddress: args.formattedAddress,
      googleMapsUri: args.googleMapsUri,
      primaryType: args.primaryType,
      lastSyncedAt: Date.now(),
    });

    await ctx.db.insert("competitorSnapshots", {
      competitorId: args.competitorId,
      restaurantId: args.restaurantId,
      locationId: args.locationId,
      rating: args.rating,
      reviewCount: args.reviewCount,
      reviewSummary: args.reviewSummary,
      latestReviewSnippet: args.latestReviewSnippet,
      latestReviewPublishedAt: args.latestReviewPublishedAt,
      highlights: args.highlights,
      fetchedAt: Date.now(),
    });

    return { ok: true };
  },
});

export const syncCompetitorSnapshot = internalAction({
  args: {
    competitorId: v.id("competitors"),
  },
  handler: async (ctx, { competitorId }) => {
    const competitor = await ctx.runQuery(
      internal.competitorInternal.getCompetitorForSync,
      {
        competitorId,
      }
    );

    if (!competitor || !competitor.active) {
      return { ok: false };
    }

    const details = await fetchPlaceDetails(competitor.placeId);

    await ctx.runMutation(internal.competitorInternal.upsertCompetitorSnapshot, {
      competitorId,
      restaurantId: competitor.restaurantId,
      locationId: competitor.locationId,
      ...details,
    });

    return { ok: true };
  },
});
