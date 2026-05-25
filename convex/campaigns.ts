import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { CAMPAIGN_SEGMENTS, type CampaignSegmentKey } from "../lib/campaign-segments";
import { hasFeatureForTier, hasWorkspaceBillingAccess } from "../lib/billing-plans";
import { getCustomersForSegment, getSegmentCounts } from "./segmentUtils";

type WorkspaceRole = "SUPER_ADMIN" | "OWNER" | "MANAGER" | "STAFF";

async function requireCampaignPermission(
  ctx: { db: unknown },
  actorClerkId: string,
  restaurantId: string,
  allowedRoles: WorkspaceRole[]
) {
  const actor = await (
    ctx.db as {
      query: (table: "users") => {
        withIndex: (
          name: "by_clerkId",
          cb: (q: { eq: (field: "clerkId", value: string) => unknown }) => unknown
        ) => {
          first: () => Promise<{
            role: WorkspaceRole;
            restaurantId?: string;
          } | null>;
        };
      };
    }
  )
    .query("users")
    .withIndex("by_clerkId", (q: { eq: (field: "clerkId", value: string) => unknown }) =>
      q.eq("clerkId", actorClerkId)
    )
    .first();

  if (!actor) {
    throw new Error("User record not found");
  }
  if (!allowedRoles.includes(actor.role)) {
    throw new Error("You do not have permission for this action");
  }
  if (actor.role !== "SUPER_ADMIN" && actor.restaurantId !== restaurantId) {
    throw new Error("Workspace access denied");
  }

  return actor;
}

const segmentValidator = v.union(
  v.literal("ALL"),
  v.literal("NEW"),
  v.literal("LOYAL"),
  v.literal("VIP"),
  v.literal("HIGH_SPEND"),
  v.literal("RECENT"),
  v.literal("INACTIVE_30"),
  v.literal("INACTIVE_60"),
  v.literal("NEEDS_ATTENTION"),
  v.literal("REVIEW_READY")
);

export const getCampaignAudienceSegments = query({
  args: {
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
    channel: v.optional(
      v.union(v.literal("SMS"), v.literal("WHATSAPP"), v.literal("EMAIL"))
    ),
  },
  handler: async (ctx, { restaurantId, locationId, channel }) => {
    const counts = await getSegmentCounts({
      ctx,
      restaurantId,
      locationId,
      channel: channel ?? "SMS",
      segments: CAMPAIGN_SEGMENTS.map((segment) => segment.key),
    });

    return CAMPAIGN_SEGMENTS.map((segment) => ({
      ...segment,
      count: counts.find((entry) => entry.segment === segment.key)?.count ?? 0,
    }));
  },
});

export const getScheduledCampaigns = query({
  args: {
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, { restaurantId, locationId }) => {
    const campaigns = await ctx.db
      .query("campaigns")
      .withIndex("by_restaurant_createdAt", (q) => q.eq("restaurantId", restaurantId))
      .order("desc")
      .collect();

    return campaigns
      .filter((campaign) => (locationId ? campaign.locationId === locationId : true))
      .slice(0, 12)
      .map((campaign) => ({
        ...campaign,
        segmentLabel:
          campaign.segment &&
          CAMPAIGN_SEGMENTS.find((segment) => segment.key === campaign.segment)?.label,
      }));
  },
});

export const scheduleCampaign = mutation({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
    channel: v.union(
      v.literal("SMS"),
      v.literal("WHATSAPP"),
      v.literal("EMAIL")
    ),
    title: v.string(),
    subject: v.optional(v.string()),
    message: v.string(),
    audienceType: v.union(v.literal("SEGMENT"), v.literal("MANUAL")),
    segment: v.optional(segmentValidator),
    customerIds: v.optional(v.array(v.id("customers"))),
    scheduledFor: v.number(),
  },
  handler: async (ctx, args) => {
    await requireCampaignPermission(ctx, args.actorClerkId, args.restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
      "MANAGER",
    ]);

    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }
    if (
      !hasWorkspaceBillingAccess({
        subscriptionStatus: restaurant.subscriptionStatus ?? "NONE",
        trialEndsAt: restaurant.trialEndsAt,
        stripeSubscriptionId: restaurant.stripeSubscriptionId,
      })
    ) {
      throw new Error(
        "This workspace trial has ended. Activate billing before scheduling more campaigns."
      );
    }
    if (!hasFeatureForTier(restaurant.tier, "campaigns")) {
      throw new Error("Campaign Builder is available on Pro and Agency.");
    }
    if (!args.title.trim()) {
      throw new Error("Campaign title is required.");
    }
    if (!args.message.trim()) {
      throw new Error("Campaign message is required.");
    }
    if (args.channel === "EMAIL" && !args.subject?.trim()) {
      throw new Error("Email campaigns need a subject line.");
    }
    if (args.scheduledFor <= Date.now() + 60_000) {
      throw new Error("Schedule campaigns at least one minute in the future.");
    }
    if (args.audienceType === "SEGMENT" && !args.segment) {
      throw new Error("Choose a segment for this scheduled campaign.");
    }
    if (
      args.audienceType === "MANUAL" &&
      (!args.customerIds || args.customerIds.length === 0)
    ) {
      throw new Error("Choose at least one customer for this scheduled campaign.");
    }

    const uniqueCustomerIds =
      args.audienceType === "MANUAL"
        ? Array.from(new Set(args.customerIds ?? []))
        : undefined;

    return await ctx.db.insert("campaigns", {
      restaurantId: args.restaurantId,
      locationId: args.locationId,
      channel: args.channel,
      title: args.title.trim(),
      subject: args.subject?.trim() || undefined,
      message: args.message.trim(),
      audienceType: args.audienceType,
      segment: args.segment,
      customerIds: uniqueCustomerIds,
      status: "SCHEDULED",
      createdByClerkId: args.actorClerkId,
      createdAt: Date.now(),
      scheduledFor: args.scheduledFor,
    });
  },
});

export const cancelScheduledCampaign = mutation({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, { actorClerkId, restaurantId, campaignId }) => {
    await requireCampaignPermission(ctx, actorClerkId, restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
      "MANAGER",
    ]);

    const campaign = await ctx.db.get(campaignId);
    if (!campaign || campaign.restaurantId !== restaurantId) {
      throw new Error("Campaign not found");
    }
    if (campaign.status !== "SCHEDULED") {
      throw new Error("Only scheduled campaigns can be canceled.");
    }

    await ctx.db.patch(campaignId, {
      status: "CANCELED",
      failureReason: undefined,
    });

    return { ok: true };
  },
});

export const getCampaignById = internalQuery({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    return await ctx.db.get(campaignId);
  },
});

export const getDueCampaignIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const due = await ctx.db
      .query("campaigns")
      .withIndex("by_status_scheduledFor", (q) =>
        q.eq("status", "SCHEDULED").lte("scheduledFor", now)
      )
      .collect();

    return due.map((campaign) => campaign._id);
  },
});

export const claimScheduledCampaign = internalMutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const campaign = await ctx.db.get(campaignId);
    if (!campaign || campaign.status !== "SCHEDULED") {
      return null;
    }
    await ctx.db.patch(campaignId, {
      status: "RUNNING",
      startedAt: Date.now(),
      failureReason: undefined,
    });
    return campaign;
  },
});

export const finalizeScheduledCampaign = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    status: v.union(v.literal("SENT"), v.literal("FAILED")),
    sentCount: v.number(),
    failedCount: v.number(),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.campaignId, {
      status: args.status,
      sentCount: args.sentCount,
      failedCount: args.failedCount,
      failureReason: args.failureReason,
      sentAt: Date.now(),
    });
  },
});

export const getScheduledCampaignRecipients = internalQuery({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const campaign = await ctx.db.get(campaignId);
    if (!campaign) {
      return [];
    }

    if (campaign.audienceType === "SEGMENT") {
      const customers = await getCustomersForSegment({
        ctx,
        restaurantId: campaign.restaurantId,
        locationId: campaign.locationId,
        channel: campaign.channel,
        segment: (campaign.segment ?? "ALL") as CampaignSegmentKey,
      });
      return customers.map((customer) => customer._id);
    }

    return campaign.customerIds ?? [];
  },
});
