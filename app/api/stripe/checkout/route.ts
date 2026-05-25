import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import {
  PREMIUM_AI_ADDON,
  getSmsPackAddon,
  isPremiumAiAddonKey,
} from "@/lib/billing-addons";
import { getAuthedRestaurantContext } from "@/lib/convex-server";
import {
  type BillingInterval,
  getCheckoutTrialDays,
  getPlanByTier,
} from "@/lib/billing-plans";
import { canAccessBilling } from "@/lib/permissions";
import {
  getAppUrl,
  getStripe,
  getStripePriceIdForAddon,
  getStripeReferralCouponId,
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
    if (!canAccessBilling(context.user.role)) {
      return NextResponse.json(
        { error: "Only the workspace owner can manage billing" },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      tier?: number;
      addonKey?: string;
      billingInterval?: BillingInterval;
    };

    const stripe = getStripe();
    const { convex, user, restaurant } = context;
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

    const addonKey = body.addonKey?.trim();

    if (addonKey) {
      if (isPremiumAiAddonKey(addonKey)) {
        if (restaurant.premiumAiEnabled && restaurant.stripePremiumAiSubscriptionId) {
          return NextResponse.json(
            { error: "Premium AI is already active for this workspace." },
            { status: 400 }
          );
        }

        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          customer: stripeCustomerId,
          client_reference_id: restaurant._id,
          success_url: `${getAppUrl()}/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${getAppUrl()}/dashboard/billing?checkout=cancelled`,
          allow_promotion_codes: true,
          line_items: [
            { price: getStripePriceIdForAddon(PREMIUM_AI_ADDON.key), quantity: 1 },
          ],
          metadata: {
            restaurantId: restaurant._id,
            checkoutType: "premium_ai",
            addonKey: PREMIUM_AI_ADDON.key,
          },
          subscription_data: {
            metadata: {
              restaurantId: restaurant._id,
              checkoutType: "premium_ai",
              addonKey: PREMIUM_AI_ADDON.key,
            },
          },
        });

        return NextResponse.json({ url: session.url });
      }

      const smsPack = getSmsPackAddon(addonKey);
      if (!smsPack) {
        return NextResponse.json({ error: "Unknown add-on requested." }, { status: 400 });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: stripeCustomerId,
        client_reference_id: restaurant._id,
        success_url: `${getAppUrl()}/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${getAppUrl()}/dashboard/billing?checkout=cancelled`,
        allow_promotion_codes: true,
        line_items: [{ price: getStripePriceIdForAddon(smsPack.key), quantity: 1 }],
        metadata: {
          restaurantId: restaurant._id,
          checkoutType: "sms_pack",
          addonKey: smsPack.key,
          smsCredits: String(smsPack.credits),
        },
      });

      return NextResponse.json({ url: session.url });
    }

    const tier = Number(body.tier);
    const plan = getPlanByTier(tier);
    const billingInterval =
      body.billingInterval === "ANNUAL" ? "ANNUAL" : "MONTHLY";
    const targetPriceId = getStripePriceIdForTier(plan.tier, billingInterval);
    const fallbackTrialDays = getStripeTrialDays();
    const trialDays = getCheckoutTrialDays({
      stripeSubscriptionId: restaurant.stripeSubscriptionId,
      trialEndsAt: restaurant.trialEndsAt,
      fallbackTrialDays,
    });

    const pendingReferral = await convex.query(
      api.billing.getPendingReferralForReferredRestaurant,
      {
        restaurantId: restaurant._id,
      }
    );
    const referralCouponId =
      !restaurant.stripeSubscriptionId && pendingReferral
        ? getStripeReferralCouponId()
        : undefined;

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
        billingInterval,
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
      discounts: referralCouponId ? [{ coupon: referralCouponId }] : undefined,
      metadata: {
        restaurantId: restaurant._id,
        tier: String(plan.tier),
        billingInterval,
        checkoutType: "plan",
      },
      subscription_data: {
        trial_period_days: trialDays,
        metadata: {
          restaurantId: restaurant._id,
          tier: String(plan.tier),
          billingInterval,
          checkoutType: "plan",
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
