import { v } from "convex/values";
import {
  action,
  mutation,
  query,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

type AllowedRole = "SUPER_ADMIN" | "OWNER" | "MANAGER";

function assertCompetitorAccess(
  actor:
    | Doc<"users">
    | null,
  restaurantId: Id<"restaurants">,
  allowedRoles: AllowedRole[]
) {
  if (
    !actor ||
    actor.restaurantId !== restaurantId ||
    !allowedRoles.some((role) => role === actor.role)
  ) {
    throw new Error("Not authorized");
  }
}

export const searchCompetitors = action({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    query: v.string(),
  },
  handler: async (ctx, { actorClerkId, restaurantId, query }) => {
    const actor = await ctx.runQuery(api.users.getCurrentUserByClerkId, {
      clerkId: actorClerkId,
    });
    assertCompetitorAccess(actor, restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
      "MANAGER",
    ]);

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GOOGLE_PLACES_API_KEY");
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 3) {
      return [];
    }

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.rating,places.userRatingCount,places.primaryTypeDisplayName",
      },
      body: JSON.stringify({
        textQuery: trimmedQuery,
        maxResultCount: 8,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Google Places search failed: ${message}`);
    }

    const payload = (await response.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        googleMapsUri?: string;
        rating?: number;
        userRatingCount?: number;
        primaryTypeDisplayName?: { text?: string };
      }>;
    };

    return (payload.places ?? [])
      .filter((place) => place.id && place.displayName?.text)
      .map((place) => ({
        placeId: place.id as string,
        name: place.displayName?.text?.trim() || "Competitor",
        formattedAddress: place.formattedAddress?.trim() || undefined,
        googleMapsUri: place.googleMapsUri?.trim() || undefined,
        rating: typeof place.rating === "number" ? place.rating : undefined,
        reviewCount:
          typeof place.userRatingCount === "number" ? place.userRatingCount : undefined,
        primaryType: place.primaryTypeDisplayName?.text?.trim() || undefined,
      }));
  },
});

export const addCompetitor = mutation({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
    placeId: v.string(),
    name: v.string(),
    formattedAddress: v.optional(v.string()),
    googleMapsUri: v.optional(v.string()),
    primaryType: v.optional(v.string()),
    rating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const actor = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.actorClerkId))
      .first();
    assertCompetitorAccess(actor, args.restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
      "MANAGER",
    ]);

    const existing = await ctx.db
      .query("competitors")
      .withIndex("by_restaurant_placeId", (q) =>
        q.eq("restaurantId", args.restaurantId).eq("placeId", args.placeId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        locationId: args.locationId,
        name: args.name.trim(),
        formattedAddress: args.formattedAddress?.trim() || undefined,
        googleMapsUri: args.googleMapsUri?.trim() || undefined,
        primaryType: args.primaryType?.trim() || undefined,
        active: true,
      });
      return existing._id;
    }

    const competitorId = await ctx.db.insert("competitors", {
      restaurantId: args.restaurantId,
      locationId: args.locationId,
      placeId: args.placeId.trim(),
      name: args.name.trim(),
      formattedAddress: args.formattedAddress?.trim() || undefined,
      googleMapsUri: args.googleMapsUri?.trim() || undefined,
      primaryType: args.primaryType?.trim() || undefined,
      active: true,
      addedAt: Date.now(),
    });

    await ctx.db.insert("competitorSnapshots", {
      competitorId,
      restaurantId: args.restaurantId,
      locationId: args.locationId,
      rating: args.rating,
      reviewCount: args.reviewCount,
      fetchedAt: Date.now(),
    });

    return competitorId;
  },
});

export const removeCompetitor = mutation({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    competitorId: v.id("competitors"),
  },
  handler: async (ctx, { actorClerkId, restaurantId, competitorId }) => {
    const actor = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", actorClerkId))
      .first();
    assertCompetitorAccess(actor, restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
      "MANAGER",
    ]);

    const competitor = await ctx.db.get(competitorId);
    if (!competitor || competitor.restaurantId !== restaurantId) {
      throw new Error("Competitor not found");
    }

    await ctx.db.patch(competitorId, { active: false });
    return { ok: true };
  },
});

export const refreshCompetitor = action({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    competitorId: v.id("competitors"),
  },
  handler: async (ctx, { actorClerkId, restaurantId, competitorId }) => {
    const actor = await ctx.runQuery(api.users.getCurrentUserByClerkId, {
      clerkId: actorClerkId,
    });
    assertCompetitorAccess(actor, restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
      "MANAGER",
    ]);

    await ctx.runAction(internal.competitorInternal.syncCompetitorSnapshot, {
      competitorId,
    });
    return { ok: true };
  },
});

export const getCompetitorWatchlist = query({
  args: {
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, { restaurantId, locationId }) => {
    const competitors = (await ctx.db
      .query("competitors")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurantId))
      .collect()).filter((competitor) =>
      competitor.active && (locationId ? competitor.locationId === locationId : true)
    );

    const competitorIds = new Set(competitors.map((competitor) => competitor._id));
    const snapshots = (await ctx.db
      .query("competitorSnapshots")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurantId))
      .collect()).filter((snapshot) => competitorIds.has(snapshot.competitorId));

    const byCompetitor = new Map<
      string,
      {
        latest?: Doc<"competitorSnapshots">;
        previous?: Doc<"competitorSnapshots">;
      }
    >();

    const sortedSnapshots = snapshots.sort((a, b) => b.fetchedAt - a.fetchedAt);
    for (const snapshot of sortedSnapshots) {
      const existing = byCompetitor.get(snapshot.competitorId) ?? {};
      if (!existing.latest) {
        existing.latest = snapshot;
      } else if (!existing.previous) {
        existing.previous = snapshot;
      }
      byCompetitor.set(snapshot.competitorId, existing);
    }

    const items = competitors.map((competitor) => {
      const snapshotInfo = byCompetitor.get(competitor._id);
      const latest = snapshotInfo?.latest;
      const previous = snapshotInfo?.previous;

      return {
        ...competitor,
        latestRating: latest?.rating,
        latestReviewCount: latest?.reviewCount,
        previousRating: previous?.rating,
        previousReviewCount: previous?.reviewCount,
        ratingDelta:
          typeof latest?.rating === "number" && typeof previous?.rating === "number"
            ? latest.rating - previous.rating
            : undefined,
        reviewCountDelta:
          typeof latest?.reviewCount === "number" &&
          typeof previous?.reviewCount === "number"
            ? latest.reviewCount - previous.reviewCount
            : undefined,
        reviewSummary: latest?.reviewSummary,
        latestReviewSnippet: latest?.latestReviewSnippet,
        latestReviewPublishedAt: latest?.latestReviewPublishedAt,
        highlights: latest?.highlights ?? [],
      };
    });

    const averageCompetitorRating =
      items.filter((item) => typeof item.latestRating === "number").length > 0
        ? items
            .filter((item) => typeof item.latestRating === "number")
            .reduce((sum, item) => sum + (item.latestRating ?? 0), 0) /
          items.filter((item) => typeof item.latestRating === "number").length
        : 0;

    const totalCompetitorReviews = items.reduce(
      (sum, item) => sum + (item.latestReviewCount ?? 0),
      0
    );

    return {
      items: items.sort(
        (a, b) => (b.latestReviewCount ?? 0) - (a.latestReviewCount ?? 0)
      ),
      summary: {
        averageCompetitorRating,
        totalCompetitorReviews,
        trackedCount: items.length,
      },
    };
  },
});
