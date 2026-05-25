import { NextResponse } from "next/server";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { getSmsPackAddon } from "@/lib/billing-addons";
import { getConvexServerClient } from "@/lib/convex-server";
import {
  getAddonFromPriceId,
  getBillingIntervalFromPriceId,
  getStripeReferralCreditCents,
  getStripe,
  getStripeWebhookSecret,
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
    return;
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
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  const rawBody = await request.text();

  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret()
    );
    const convex = getConvexServerClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const restaurantId = session.metadata?.restaurantId;
        const checkoutType = session.metadata?.checkoutType;
        const stripeCustomerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;

        if (restaurantId && stripeCustomerId) {
          await convex.mutation(api.billing.setStripeCustomerId, {
            restaurantId: restaurantId as Id<"restaurants">,
            stripeCustomerId,
          });

          if (checkoutType === "sms_pack" && session.payment_status === "paid") {
            const addonKey = session.metadata?.addonKey ?? "";
            const pack = getSmsPackAddon(addonKey);
            if (pack) {
              await convex.mutation(api.billing.grantSmsCreditsFromCheckout, {
                restaurantId: restaurantId as Id<"restaurants">,
                stripeCheckoutSessionId: session.id,
                stripeCustomerId,
                credits: pack.credits,
                amountPaid:
                  typeof session.amount_total === "number"
                    ? session.amount_total
                    : undefined,
                reference: pack.key,
              });
            }
          }

          if (checkoutType === "plan") {
            await maybeRewardReferral({
              convex,
              stripe,
              restaurantId: restaurantId as Id<"restaurants">,
              referredStripeCustomerId: stripeCustomerId,
              stripeCheckoutSessionId: session.id,
            });
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const stripeCustomerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        const restaurant = await convex.query(
          api.billing.getRestaurantByStripeCustomerId,
          {
            stripeCustomerId,
          }
        );

        if (!restaurant) {
          break;
        }

        const currentPriceId = subscription.items.data[0]?.price.id;
        const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
        const addon = getAddonFromPriceId(currentPriceId);

        if (addon?.type === "PREMIUM_AI") {
          await convex.mutation(api.billing.syncPremiumAiAddon, {
            restaurantId: restaurant._id,
            stripeCustomerId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: currentPriceId,
            enabled:
              subscription.status !== "canceled" &&
              subscription.status !== "unpaid" &&
              subscription.status !== "incomplete_expired",
          });
          break;
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
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook validation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
