import { NextResponse } from "next/server";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";
import {
  getStripe,
  getStripeWebhookSecret,
  getTierFromPriceId,
  normalizeSubscriptionStatus,
} from "@/lib/stripe";

export const runtime = "nodejs";

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
        const stripeCustomerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;

        if (restaurantId && stripeCustomerId) {
          await convex.mutation(api.billing.setStripeCustomerId, {
            restaurantId: restaurantId as Id<"restaurants">,
            stripeCustomerId,
          });
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
