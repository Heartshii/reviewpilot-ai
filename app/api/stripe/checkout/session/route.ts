import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getAuthedRestaurantContext } from "@/lib/convex-server";
import {
  getStripe,
  getTierFromPriceId,
  normalizeSubscriptionStatus,
} from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const context = await getAuthedRestaurantContext();
    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
