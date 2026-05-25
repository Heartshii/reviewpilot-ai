import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getInitialTrialEndsAt, getPlanByTier } from "../lib/billing-plans";
import { parseLocationInput, parseOnboardingInput } from "../lib/validation";

const businessTypeValidator = v.union(
  v.literal("RESTAURANT"),
  v.literal("DENTAL_CLINIC"),
  v.literal("GROCERY_STORE"),
  v.literal("SALON_SPA"),
  v.literal("FITNESS_STUDIO"),
  v.literal("HOME_SERVICE"),
  v.literal("AUTOMOTIVE_SERVICE"),
  v.literal("RETAIL_STORE"),
  v.literal("PROFESSIONAL_SERVICE"),
  v.literal("GENERAL_SERVICE")
);

async function getActorAndAgencyRestaurant(
  ctx: Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">,
  actorClerkId: string,
  agencyRestaurantId: Id<"restaurants">
) {
  const actor = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", actorClerkId))
    .first();

  if (!actor) {
    throw new Error("User record not found");
  }

  if (!["SUPER_ADMIN", "OWNER", "MANAGER"].includes(actor.role)) {
    throw new Error("You do not have permission for agency operations");
  }

  if (actor.role !== "SUPER_ADMIN" && actor.restaurantId !== agencyRestaurantId) {
    throw new Error("Workspace access denied");
  }

  const restaurant = (await ctx.db.get(agencyRestaurantId)) as
    | {
        _id: Id<"restaurants">;
        name: string;
        tier: number;
      }
    | null;

  if (!restaurant) {
    throw new Error("Agency workspace not found");
  }

  if (restaurant.tier < 3 && actor.role !== "SUPER_ADMIN") {
    throw new Error("Agency tools require the Agency plan");
  }

  return { actor, restaurant };
}

async function createUniqueReferralCode(
  ctx: Pick<MutationCtx, "db">,
  slug: string
) {
  const base = slug.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6) || "REVIEW";

  while (true) {
    const candidate = `${base}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const existing = await ctx.db
      .query("restaurants")
      .filter((q) => q.eq(q.field("referralCode"), candidate))
      .first();

    if (!existing) {
      return candidate;
    }
  }
}

export const getAgencyDashboard = query({
  args: {
    agencyRestaurantId: v.id("restaurants"),
  },
  handler: async (ctx, { agencyRestaurantId }) => {
    const agencyRestaurant = await ctx.db.get(agencyRestaurantId);
    if (!agencyRestaurant) {
      throw new Error("Agency workspace not found");
    }

    const relationships = await ctx.db
      .query("agencyClients")
      .withIndex("by_agencyRestaurantId", (q) =>
        q.eq("agencyRestaurantId", agencyRestaurantId)
      )
      .collect();

    const clientRestaurants = await Promise.all(
      relationships.map(async (relationship) => {
        const restaurant = await ctx.db.get(relationship.clientRestaurantId);
        if (!restaurant) {
          return null;
        }

        const customerCount = (
          await ctx.db
            .query("customers")
            .filter((q) => q.eq(q.field("restaurantId"), relationship.clientRestaurantId))
            .collect()
        ).length;

        return {
          ...relationship,
          restaurant,
          customerCount,
          planName: getPlanByTier(restaurant.tier).name,
          monthlyPlanValue: getPlanByTier(restaurant.tier).price,
        };
      })
    );

    const items = clientRestaurants
      .filter((item): item is NonNullable<(typeof clientRestaurants)[number]> => !!item)
      .sort((a, b) => b.createdAt - a.createdAt);

    const activeClients = items.filter((item) => item.status === "ACTIVE");
    const managedMrr = activeClients.reduce(
      (sum, item) => sum + item.monthlyPlanValue,
      0
    );
    const monthlyRetainerCents = activeClients.reduce(
      (sum, item) => sum + (item.monthlyRetainerCents ?? 0),
      0
    );
    const totalSmsUsed = activeClients.reduce(
      (sum, item) => sum + item.restaurant.smsUsed,
      0
    );
    const totalSmsLimit = activeClients.reduce(
      (sum, item) => sum + item.restaurant.smsLimit,
      0
    );

    return {
      agencyRestaurant: agencyRestaurant.name,
      tier: agencyRestaurant.tier,
      activeClients: activeClients.length,
      pausedClients: items.filter((item) => item.status === "PAUSED").length,
      managedMrr,
      monthlyRetainerCents,
      totalSmsUsed,
      totalSmsLimit,
      items,
    };
  },
});

export const createManagedClient = mutation({
  args: {
    actorClerkId: v.string(),
    agencyRestaurantId: v.id("restaurants"),
    name: v.string(),
    slug: v.string(),
    ownerEmail: v.string(),
    businessType: businessTypeValidator,
    businessSubtype: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    googleBusinessUrl: v.optional(v.string()),
    twilioNumber: v.optional(v.string()),
    contactName: v.optional(v.string()),
    notes: v.optional(v.string()),
    monthlyRetainerCents: v.optional(v.number()),
    tier: v.number(),
  },
  handler: async (ctx, args) => {
    await getActorAndAgencyRestaurant(ctx, args.actorClerkId, args.agencyRestaurantId);

    const parsed = parseOnboardingInput({
      restaurantName: args.name,
      restaurantSlug: args.slug,
      businessType: args.businessType,
      businessSubtype: args.businessSubtype,
      contactPhone: args.contactPhone,
      websiteUrl: args.websiteUrl,
      googleBusinessUrl: args.googleBusinessUrl,
    });

    const referralCode = await createUniqueReferralCode(ctx, parsed.restaurantSlug);
    const trialEndsAt = getInitialTrialEndsAt();

    const restaurantId = await ctx.db.insert("restaurants", {
      name: parsed.restaurantName,
      slug: parsed.restaurantSlug,
      businessType: parsed.businessType,
      businessSubtype: parsed.businessSubtype,
      contactPhone: parsed.contactPhone,
      websiteUrl: parsed.websiteUrl,
      referralCode,
      tier: args.tier,
      smsLimit: getPlanByTier(args.tier).smsLimit,
      smsUsed: 0,
      smsCreditsBalance: 0,
      overageRate: 0.05,
      premiumAiEnabled: false,
      referralCreditsEarnedCents: 0,
      googleBusinessUrl: parsed.googleBusinessUrl,
      twilioNumber: args.twilioNumber,
      active: true,
      billingInterval: "MONTHLY",
      subscriptionStatus: "TRIALING",
      trialEndsAt,
    });

    await ctx.db.insert("restaurantSettings", {
      restaurantId,
      sendDelayMinutes: 60,
      birthdayEnabled: true,
      reengagement30: true,
      reengagement60: true,
      reengagement90: true,
      aiTone: "Friendly",
      responseLength: "Medium",
      autoApprove: false,
      includeReviewLink: true,
      kioskDisplayName: parsed.restaurantName,
    });

    const primaryLocation = parseLocationInput({
      locationName: `${parsed.restaurantName} Main Location`,
      locationSlug: parsed.restaurantSlug,
      contactPhone: parsed.contactPhone,
      googleBusinessUrl: parsed.googleBusinessUrl,
      twilioNumber: args.twilioNumber,
      kioskDisplayName: parsed.restaurantName,
    });

    await ctx.db.insert("locations", {
      restaurantId,
      name: primaryLocation.locationName,
      slug: primaryLocation.locationSlug,
      contactPhone: primaryLocation.contactPhone,
      googleBusinessUrl: primaryLocation.googleBusinessUrl,
      twilioNumber: primaryLocation.twilioNumber,
      kioskDisplayName: primaryLocation.kioskDisplayName,
      active: true,
    });

    await ctx.db.insert("users", {
      clerkId: `pending_${Date.now()}`,
      email: args.ownerEmail,
      role: "OWNER",
      restaurantId,
    });

    await ctx.db.insert("agencyClients", {
      agencyRestaurantId: args.agencyRestaurantId,
      clientRestaurantId: restaurantId,
      ownerEmail: args.ownerEmail.trim().toLowerCase(),
      contactName: args.contactName?.trim(),
      notes: args.notes?.trim(),
      monthlyRetainerCents:
        typeof args.monthlyRetainerCents === "number"
          ? Math.max(0, Math.round(args.monthlyRetainerCents))
          : undefined,
      status: "ACTIVE",
      createdAt: Date.now(),
      activatedAt: Date.now(),
    });

    return { ok: true, restaurantId };
  },
});

export const updateManagedClientStatus = mutation({
  args: {
    actorClerkId: v.string(),
    agencyRestaurantId: v.id("restaurants"),
    relationshipId: v.id("agencyClients"),
    status: v.union(v.literal("ACTIVE"), v.literal("PAUSED"), v.literal("REMOVED")),
    notes: v.optional(v.string()),
    monthlyRetainerCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await getActorAndAgencyRestaurant(ctx, args.actorClerkId, args.agencyRestaurantId);

    const relationship = await ctx.db.get(args.relationshipId);
    if (!relationship || relationship.agencyRestaurantId !== args.agencyRestaurantId) {
      throw new Error("Managed client relationship not found");
    }

    await ctx.db.patch(args.relationshipId, {
      status: args.status,
      notes: args.notes?.trim(),
      monthlyRetainerCents:
        typeof args.monthlyRetainerCents === "number"
          ? Math.max(0, Math.round(args.monthlyRetainerCents))
          : relationship.monthlyRetainerCents,
      activatedAt:
        args.status === "ACTIVE"
          ? relationship.activatedAt ?? Date.now()
          : relationship.activatedAt,
    });

    return { ok: true };
  },
});
