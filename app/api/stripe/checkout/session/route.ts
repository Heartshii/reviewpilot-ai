import { NextResponse } from "next/server";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import {
  PREMIUM_AI_ADDON,
  getSmsPackAddon,
} from "@/lib/billing-addons";
import {
  getAuthedRestaurantContext,
  getConvexServerClient,
} from "@/lib/convex-server";
import { canAccessBilling } from "@/lib/permissions";
import {
  getBillingIntervalFromPriceId,
  getAddonFromPriceId,
  getStripeReferralCreditCents,
  getStripe,
  getTierFromPriceId,
  normalizeSubscriptionStatus,
} from "@/lib/stripe";

export const runtime = "nodejs";

async function maybeRewardReferral(args: {
  convex: ReturnType<typeof getConvexServerClient>;
  stripe: ReturnType<typeof getStripe>;
  restaurantId: Id<"restaurants">;
  referredStripeCustomerId: string;
  stripeCheckoutSessionId: string;
}) {
  const rewardCandidate = await args.convex.mutation(api.billing.markReferralSubscribed, {
    referredRestaurantId: args.restaurantId,
    referredStripeCustomerId: args.referredStripeCustomerId,
    stripeCheckoutSessionId: args.stripeCheckoutSessionId,
  });

  if (
    !rewardCandidate ||
    rewardCandidate.alreadyRewarded ||
    !rewardCandidate.referrerStripeCustomerId
  ) {
    return null;
  }

  const amount = Math.min(
    rewardCandidate.rewardAmountCents,
    getStripeReferralCreditCents()
  );

  const balanceTransaction = await args.stripe.customers.createBalanceTransaction(
    rewardCandidate.referrerStripeCustomerId,
    {
      amount: -amount,
      currency: "usd",
      description: "Referral reward credit from ReviewPilot",
    },
    {
      idempotencyKey: `referral_reward_${rewardCandidate.referralId}`,
    }
  );

  await args.convex.mutation(api.billing.completeReferralReward, {
    referralId: rewardCandidate.referralId,
    referrerBalanceTransactionId: balanceTransaction.id,
  });

  return { rewarded: true };
}

export async function POST(request: Request) {
  try {
    const context = await getAuthedRestaurantContext();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canAccessBilling(context.user.role)) {
      return NextResponse.json(
        { error: "Only the workspace owner can manage billing" },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      sessionId?: string;
    };
    const sessionId = body.sessionId?.trim();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing checkout session id" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const { convex, restaurant } = context;
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (
      session.metadata?.restaurantId &&
      session.metadata.restaurantId !== String(restaurant._id)
    ) {
      return NextResponse.json(
        { error: "Checkout session does not belong to this workspace" },
        { status: 403 }
      );
    }

    const stripeCustomerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id;

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "Stripe customer was missing from checkout session" },
        { status: 400 }
      );
    }

    await convex.mutation(api.billing.setStripeCustomerId, {
      restaurantId: restaurant._id,
      stripeCustomerId,
    });

    const checkoutType = session.metadata?.checkoutType;

    if (checkoutType === "sms_pack") {
      const addonKey = session.metadata?.addonKey ?? "";
      const pack = getSmsPackAddon(addonKey);
      if (!pack) {
        return NextResponse.json({ error: "Unknown SMS pack" }, { status: 400 });
      }

      await convex.mutation(api.billing.grantSmsCreditsFromCheckout, {
        restaurantId: restaurant._id,
        stripeCheckoutSessionId: session.id,
        stripeCustomerId,
        credits: pack.credits,
        amountPaid: typeof session.amount_total === "number" ? session.amount_total : undefined,
        reference: pack.key,
      });

      return NextResponse.json({
        synced: true,
        checkoutType: "sms_pack",
        message: `${pack.credits} extra SMS credits were added to this workspace.`,
      });
    }

    const sessionSubscription = session.subscription;
    if (!sessionSubscription) {
      return NextResponse.json({
        synced: false,
        message:
          "Checkout completed, but Stripe has not attached the subscription yet.",
      });
    }

    const subscription =
      typeof sessionSubscription === "string"
        ? await stripe.subscriptions.retrieve(sessionSubscription)
        : sessionSubscription;

    const currentPriceId = subscription.items.data[0]?.price.id;
    const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
    const addon = getAddonFromPriceId(currentPriceId);

    if (checkoutType === "premium_ai" || addon?.type === "PREMIUM_AI") {
      await convex.mutation(api.billing.syncPremiumAiAddon, {
        restaurantId: restaurant._id,
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: currentPriceId,
        enabled: subscription.status !== "canceled" && subscription.status !== "unpaid",
        stripeCheckoutSessionId: session.id,
        amountPaid: typeof session.amount_total === "number" ? session.amount_total : undefined,
      });

      return NextResponse.json({
        synced: true,
        checkoutType: PREMIUM_AI_ADDON.key,
        subscriptionStatus: normalizeSubscriptionStatus(subscription.status),
        message: "Premium AI is now active for this workspace.",
      });
    }

    await convex.mutation(api.billing.syncStripeSubscription, {
      restaurantId: restaurant._id,
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: currentPriceId,
      subscriptionStatus: normalizeSubscriptionStatus(subscription.status),
      subscriptionCurrentPeriodEnd: currentPeriodEnd
        ? currentPeriodEnd * 1000
        : undefined,
      trialEndsAt: subscription.trial_end
        ? subscription.trial_end * 1000
        : undefined,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      tier: getTierFromPriceId(currentPriceId) ?? restaurant.tier,
      billingInterval:
        getBillingIntervalFromPriceId(currentPriceId) ??
        restaurant.billingInterval ??
        "MONTHLY",
    });

    if (checkoutType === "plan" || !checkoutType) {
      await maybeRewardReferral({
        convex,
        stripe,
        restaurantId: restaurant._id,
        referredStripeCustomerId: stripeCustomerId,
        stripeCheckoutSessionId: session.id,
      });
    }

    return NextResponse.json({
      synced: true,
      subscriptionStatus: normalizeSubscriptionStatus(subscription.status),
      trialing: subscription.status === "trialing",
      hasImmediateCharge:
        subscription.status !== "trialing" && session.payment_status === "paid",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to sync checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
