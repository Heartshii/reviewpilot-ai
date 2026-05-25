import { NextResponse } from "next/server";
import { getAuthedRestaurantContext } from "@/lib/convex-server";
import { canAccessBilling } from "@/lib/permissions";
import { getAppUrl, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
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

    if (!context.restaurant.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer found for this restaurant" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: context.restaurant.stripeCustomerId,
      return_url: `${getAppUrl()}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to open billing portal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
