import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  formatSubscriptionStatus,
  getPlanByTier,
  getSmsLimitForTier,
  hasActiveSubscription,
  type DisplaySubscriptionStatus,
} from "../lib/billing-plans";

const subscriptionStatusValidator = v.union(
  v.literal("TRIALING"),
  v.literal("ACTIVE"),
  v.literal("PAST_DUE"),
  v.literal("CANCELED"),
  v.literal("UNPAID"),
  v.literal("INCOMPLETE"),
  v.literal("INCOMPLETE_EXPIRED")
);

export const getBillingSummary = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const restaurant = await ctx.db.get(restaurantId);
    if (!restaurant) throw new Error("Restaurant not found");

    const plan = getPlanByTier(restaurant.tier);
    const status =
      (restaurant.subscriptionStatus as DisplaySubscriptionStatus | undefined) ??
      "NONE";

    return {
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      tier: restaurant.tier,
      planName: plan.name,
      monthlyPrice: plan.price,
      smsLimit: restaurant.smsLimit,
      smsUsed: restaurant.smsUsed,
      stripeCustomerId: restaurant.stripeCustomerId ?? null,
      stripeSubscriptionId: restaurant.stripeSubscriptionId ?? null,
      stripePriceId: restaurant.stripePriceId ?? null,
      subscriptionStatus: status,
      subscriptionStatusLabel: formatSubscriptionStatus(status),
      subscriptionCurrentPeriodEnd:
        restaurant.subscriptionCurrentPeriodEnd ?? null,
      trialEndsAt: restaurant.trialEndsAt ?? null,
      cancelAtPeriodEnd: restaurant.cancelAtPeriodEnd ?? false,
      active: restaurant.active,
    };
  },
});

export const getRestaurantByStripeCustomerId = query({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, { stripeCustomerId }) => {
    return await ctx.db
      .query("restaurants")
      .withIndex("by_stripeCustomerId", (q) =>
        q.eq("stripeCustomerId", stripeCustomerId)
      )
      .first();
  },
});

export const setStripeCustomerId = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, { restaurantId, stripeCustomerId }) => {
    await ctx.db.patch(restaurantId, { stripeCustomerId });
    return { ok: true };
  },
});

export const syncStripeSubscription = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    subscriptionStatus: v.optional(subscriptionStatusValidator),
    subscriptionCurrentPeriodEnd: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    tier: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) throw new Error("Restaurant not found");

    const nextTier = args.tier ?? restaurant.tier;
    const nextStatus = args.subscriptionStatus ?? restaurant.subscriptionStatus;

    await ctx.db.patch(args.restaurantId, {
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId:
        args.stripeSubscriptionId ?? restaurant.stripeSubscriptionId,
      stripePriceId: args.stripePriceId ?? restaurant.stripePriceId,
      subscriptionStatus: nextStatus,
      subscriptionCurrentPeriodEnd:
        args.subscriptionCurrentPeriodEnd ??
        restaurant.subscriptionCurrentPeriodEnd,
      trialEndsAt: args.trialEndsAt ?? restaurant.trialEndsAt,
      cancelAtPeriodEnd:
        args.cancelAtPeriodEnd ?? restaurant.cancelAtPeriodEnd ?? false,
      tier: nextTier,
      smsLimit: getSmsLimitForTier(nextTier),
      active: nextStatus ? hasActiveSubscription(nextStatus) : restaurant.active,
    });

    return {
      ok: true,
      plan: getPlanByTier(nextTier).name,
    };
  },
});
