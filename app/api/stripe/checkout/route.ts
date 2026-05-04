import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getAuthedRestaurantContext } from "@/lib/convex-server";
import { getPlanByTier } from "@/lib/billing-plans";
import {
  getAppUrl,
  getStripe,
  getStripePriceIdForTier,
  getStripeTrialDays,
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

    const body = (await request.json().catch(() => ({}))) as { tier?: number };
    const tier = Number(body.tier);
    const plan = getPlanByTier(tier);

    const stripe = getStripe();
    const { convex, user, restaurant } = context;
    const targetPriceId = getStripePriceIdForTier(plan.tier);
    const trialDays = getStripeTrialDays();
    let stripeCustomerId = restaurant.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: restaurant.name,
        metadata: {
          restaurantId: restaurant._id,
          restaurantName: restaurant.name,
        },
      });

      stripeCustomerId = customer.id;
      await convex.mutation(api.billing.setStripeCustomerId, {
        restaurantId: restaurant._id,
        stripeCustomerId,
      });
    }

    const canUpdateExistingSubscription =
      !!restaurant.stripeSubscriptionId &&
      !!restaurant.subscriptionStatus &&
      restaurant.subscriptionStatus !== "CANCELED" &&
      restaurant.subscriptionStatus !== "UNPAID" &&
      restaurant.subscriptionStatus !== "INCOMPLETE_EXPIRED";

    if (canUpdateExistingSubscription) {
      const subscription = await stripe.subscriptions.retrieve(
        restaurant.stripeSubscriptionId!
      );
      const existingItem = subscription.items.data[0];

      if (!existingItem) {
        return NextResponse.json(
          { error: "Subscription item missing in Stripe" },
          { status: 400 }
        );
      }

      const updated = await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: false,
        proration_behavior: "create_prorations",
        items: [{ id: existingItem.id, price: targetPriceId }],
      });

      const updatedPriceId = updated.items.data[0]?.price.id;
      const updatedPeriodEnd = updated.items.data[0]?.current_period_end;

      await convex.mutation(api.billing.syncStripeSubscription, {
        restaurantId: restaurant._id,
        stripeCustomerId,
        stripeSubscriptionId: updated.id,
        stripePriceId: updatedPriceId,
        subscriptionStatus: normalizeSubscriptionStatus(updated.status),
        subscriptionCurrentPeriodEnd: updatedPeriodEnd
          ? updatedPeriodEnd * 1000
          : undefined,
        trialEndsAt: updated.trial_end ? updated.trial_end * 1000 : undefined,
        cancelAtPeriodEnd: updated.cancel_at_period_end,
        tier: getTierFromPriceId(updatedPriceId) ?? plan.tier,
      });

      return NextResponse.json({
        url: `${getAppUrl()}/dashboard/billing?plan=updated`,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      client_reference_id: restaurant._id,
      success_url: `${getAppUrl()}/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getAppUrl()}/dashboard/billing?checkout=cancelled`,
      allow_promotion_codes: true,
      line_items: [{ price: targetPriceId, quantity: 1 }],
      metadata: {
        restaurantId: restaurant._id,
        tier: String(plan.tier),
      },
      subscription_data: {
        trial_period_days: restaurant.stripeSubscriptionId
          ? undefined
          : trialDays > 0
            ? trialDays
            : undefined,
        metadata: {
          restaurantId: restaurant._id,
          tier: String(plan.tier),
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to start checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
