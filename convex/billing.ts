import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  type BillingInterval,
  formatSubscriptionStatus,
  getPlanByTier,
  getPlanPriceByInterval,
  getSmsLimitForTier,
  getRemainingTrialDays,
  hasActiveSubscription,
  hasWorkspaceBillingAccess,
  isTrialExpired,
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
    const trialExpired = isTrialExpired({
      trialEndsAt: restaurant.trialEndsAt,
    });
    const trialDaysRemaining = getRemainingTrialDays(restaurant.trialEndsAt);
    const billingAccessActive = hasWorkspaceBillingAccess({
      subscriptionStatus: status,
      trialEndsAt: restaurant.trialEndsAt,
      stripeSubscriptionId: restaurant.stripeSubscriptionId,
    });

    return {
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      tier: restaurant.tier,
      planName: plan.name,
      billingInterval:
        (restaurant.billingInterval as BillingInterval | undefined) ?? "MONTHLY",
      monthlyPrice: plan.price,
      annualPrice: plan.annualPrice,
      activePlanPrice: getPlanPriceByInterval(
        restaurant.tier,
        (restaurant.billingInterval as BillingInterval | undefined) ?? "MONTHLY"
      ),
      referralCode: restaurant.referralCode ?? null,
      smsLimit: restaurant.smsLimit,
      smsUsed: restaurant.smsUsed,
      smsCreditsBalance: restaurant.smsCreditsBalance ?? 0,
      effectiveSmsLimit: restaurant.smsLimit + (restaurant.smsCreditsBalance ?? 0),
      premiumAiEnabled: restaurant.premiumAiEnabled ?? false,
      referralCreditsEarnedCents: restaurant.referralCreditsEarnedCents ?? 0,
      stripeCustomerId: restaurant.stripeCustomerId ?? null,
      stripeSubscriptionId: restaurant.stripeSubscriptionId ?? null,
      stripePriceId: restaurant.stripePriceId ?? null,
      stripePremiumAiSubscriptionId:
        restaurant.stripePremiumAiSubscriptionId ?? null,
      subscriptionStatus: status,
      subscriptionStatusLabel: formatSubscriptionStatus(status),
      subscriptionCurrentPeriodEnd:
        restaurant.subscriptionCurrentPeriodEnd ?? null,
      trialEndsAt: restaurant.trialEndsAt ?? null,
      trialDaysRemaining,
      trialExpired,
      cancelAtPeriodEnd: restaurant.cancelAtPeriodEnd ?? false,
      billingAccessActive,
      active: restaurant.active,
    };
  },
});

export const getReferralProgramSummary = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const restaurant = await ctx.db.get(restaurantId);
    if (!restaurant) throw new Error("Restaurant not found");

    const referrals = await ctx.db
      .query("referrals")
      .withIndex("by_referrerRestaurantId", (q) =>
        q.eq("referrerRestaurantId", restaurantId)
      )
      .collect();

    const detailed = await Promise.all(
      referrals
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 12)
        .map(async (referral) => {
          const referredRestaurant = referral.referredRestaurantId
            ? await ctx.db.get(referral.referredRestaurantId)
            : null;

          return {
            ...referral,
            referredRestaurantName: referredRestaurant?.name ?? null,
            referredRestaurantTier: referredRestaurant?.tier ?? null,
          };
        })
    );

    return {
      referralCode: restaurant.referralCode ?? null,
      referralCreditsEarnedCents: restaurant.referralCreditsEarnedCents ?? 0,
      totalReferrals: referrals.length,
      onboardedReferrals: referrals.filter((item) => item.status !== "PENDING").length,
      subscribedReferrals: referrals.filter((item) =>
        item.status === "SUBSCRIBED" || item.status === "REWARDED"
      ).length,
      rewardedReferrals: referrals.filter((item) => item.status === "REWARDED").length,
      items: detailed,
    };
  },
});

export const ensureRestaurantMonetizationDefaults = mutation({
  args: {
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, { restaurantId }) => {
    const restaurant = await ctx.db.get(restaurantId);
    if (!restaurant) throw new Error("Restaurant not found");

    const patch: Partial<{
      referralCode: string;
      smsCreditsBalance: number;
      premiumAiEnabled: boolean;
      referralCreditsEarnedCents: number;
      billingInterval: BillingInterval;
    }> = {};

    if (!restaurant.referralCode) {
      const base =
        restaurant.slug.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6) ||
        "REVIEW";

      while (!patch.referralCode) {
        const candidate = `${base}${Math.random()
          .toString(36)
          .slice(2, 6)
          .toUpperCase()}`;
        const existing = await ctx.db
          .query("restaurants")
          .filter((q) => q.eq(q.field("referralCode"), candidate))
          .first();

        if (!existing) {
          patch.referralCode = candidate;
        }
      }
    }
    if (restaurant.smsCreditsBalance === undefined) {
      patch.smsCreditsBalance = 0;
    }
    if (restaurant.premiumAiEnabled === undefined) {
      patch.premiumAiEnabled = false;
    }
    if (restaurant.referralCreditsEarnedCents === undefined) {
      patch.referralCreditsEarnedCents = 0;
    }
    if (restaurant.billingInterval === undefined) {
      patch.billingInterval = "MONTHLY";
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(restaurantId, patch);
    }

    return { ok: true, patched: Object.keys(patch).length > 0 };
  },
});

export const getPendingReferralForReferredRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const referral = await ctx.db
      .query("referrals")
      .withIndex("by_referredRestaurantId", (q) =>
        q.eq("referredRestaurantId", restaurantId)
      )
      .first();

    if (!referral) return null;
    if (referral.status === "REWARDED") return null;
    return referral;
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
    billingInterval: v.optional(
      v.union(v.literal("MONTHLY"), v.literal("ANNUAL"))
    ),
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
    const shouldResetUsage =
      typeof args.subscriptionCurrentPeriodEnd === "number" &&
      (!!restaurant.subscriptionCurrentPeriodEnd
        ? args.subscriptionCurrentPeriodEnd > restaurant.subscriptionCurrentPeriodEnd
        : !!args.stripeSubscriptionId);

    await ctx.db.patch(args.restaurantId, {
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId:
        args.stripeSubscriptionId ?? restaurant.stripeSubscriptionId,
      stripePriceId: args.stripePriceId ?? restaurant.stripePriceId,
      billingInterval: args.billingInterval ?? restaurant.billingInterval ?? "MONTHLY",
      subscriptionStatus: nextStatus,
      subscriptionCurrentPeriodEnd:
        args.subscriptionCurrentPeriodEnd ??
        restaurant.subscriptionCurrentPeriodEnd,
      trialEndsAt: args.trialEndsAt ?? restaurant.trialEndsAt,
      cancelAtPeriodEnd:
        args.cancelAtPeriodEnd ?? restaurant.cancelAtPeriodEnd ?? false,
      tier: nextTier,
      smsLimit: getSmsLimitForTier(nextTier),
      smsUsed: shouldResetUsage ? 0 : restaurant.smsUsed,
      active: nextStatus ? hasActiveSubscription(nextStatus) : restaurant.active,
    });

    return {
      ok: true,
      plan: getPlanByTier(nextTier).name,
    };
  },
});

export const grantSmsCreditsFromCheckout = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    stripeCheckoutSessionId: v.string(),
    stripeCustomerId: v.optional(v.string()),
    credits: v.number(),
    amountPaid: v.optional(v.number()),
    reference: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("billingPurchases")
      .withIndex("by_checkoutSessionId", (q) =>
        q.eq("stripeCheckoutSessionId", args.stripeCheckoutSessionId)
      )
      .first();

    if (existing) {
      return { ok: true, applied: false };
    }

    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) throw new Error("Restaurant not found");

    await ctx.db.patch(args.restaurantId, {
      smsCreditsBalance: (restaurant.smsCreditsBalance ?? 0) + args.credits,
    });

    await ctx.db.insert("billingPurchases", {
      restaurantId: args.restaurantId,
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      stripeCustomerId: args.stripeCustomerId,
      kind: "SMS_PACK",
      reference: args.reference,
      smsCreditsGranted: args.credits,
      amountPaid: args.amountPaid,
      createdAt: Date.now(),
    });

    return { ok: true, applied: true };
  },
});

export const syncPremiumAiAddon = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    enabled: v.boolean(),
    stripeCheckoutSessionId: v.optional(v.string()),
    amountPaid: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) throw new Error("Restaurant not found");

    await ctx.db.patch(args.restaurantId, {
      stripeCustomerId: args.stripeCustomerId ?? restaurant.stripeCustomerId,
      stripePremiumAiSubscriptionId:
        args.enabled
          ? args.stripeSubscriptionId ?? restaurant.stripePremiumAiSubscriptionId
          : undefined,
      stripePremiumAiPriceId:
        args.enabled ? args.stripePriceId ?? restaurant.stripePremiumAiPriceId : undefined,
      premiumAiEnabled: args.enabled,
    });

    if (args.enabled && args.stripeCheckoutSessionId) {
      const checkoutSessionId = args.stripeCheckoutSessionId;
      const existing = await ctx.db
        .query("billingPurchases")
        .withIndex("by_checkoutSessionId", (q) =>
          q.eq("stripeCheckoutSessionId", checkoutSessionId)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("billingPurchases", {
          restaurantId: args.restaurantId,
          stripeCheckoutSessionId: checkoutSessionId,
          stripeCustomerId: args.stripeCustomerId,
          kind: "PREMIUM_AI",
          reference: args.stripeSubscriptionId ?? "premium-ai",
          amountPaid: args.amountPaid,
          createdAt: Date.now(),
        });
      }
    }

    return { ok: true };
  },
});

export const markReferralSubscribed = mutation({
  args: {
    referredRestaurantId: v.id("restaurants"),
    referredStripeCustomerId: v.optional(v.string()),
    stripeCheckoutSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const referral = await ctx.db
      .query("referrals")
      .withIndex("by_referredRestaurantId", (q) =>
        q.eq("referredRestaurantId", args.referredRestaurantId)
      )
      .first();

    if (!referral) {
      return null;
    }

    const referrerRestaurant = await ctx.db.get(referral.referrerRestaurantId);
    if (!referrerRestaurant) {
      return null;
    }

    if (referral.status === "ONBOARDED" || referral.status === "PENDING") {
      await ctx.db.patch(referral._id, {
        status: "SUBSCRIBED",
        subscribedAt: Date.now(),
        referredStripeCustomerId:
          args.referredStripeCustomerId ?? referral.referredStripeCustomerId,
        stripeCheckoutSessionId:
          args.stripeCheckoutSessionId ?? referral.stripeCheckoutSessionId,
        referrerStripeCustomerId:
          referrerRestaurant.stripeCustomerId ?? referral.referrerStripeCustomerId,
      });
    }

    return {
      referralId: referral._id,
      rewardAmountCents: referral.rewardAmountCents,
      referrerStripeCustomerId:
        referrerRestaurant.stripeCustomerId ?? referral.referrerStripeCustomerId ?? null,
      alreadyRewarded: referral.status === "REWARDED",
    };
  },
});

export const completeReferralReward = mutation({
  args: {
    referralId: v.id("referrals"),
    referrerBalanceTransactionId: v.string(),
  },
  handler: async (ctx, { referralId, referrerBalanceTransactionId }) => {
    const referral = await ctx.db.get(referralId);
    if (!referral) throw new Error("Referral not found");
    if (referral.status === "REWARDED") return { ok: true, alreadyRewarded: true };

    const referrerRestaurant = await ctx.db.get(referral.referrerRestaurantId);
    if (!referrerRestaurant) throw new Error("Referrer restaurant not found");

    await ctx.db.patch(referralId, {
      status: "REWARDED",
      rewardedAt: Date.now(),
      referrerBalanceTransactionId,
    });

    await ctx.db.patch(referrerRestaurant._id, {
      referralCreditsEarnedCents:
        (referrerRestaurant.referralCreditsEarnedCents ?? 0) +
        referral.rewardAmountCents,
    });

    return { ok: true, alreadyRewarded: false };
  },
});
