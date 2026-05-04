import "server-only";

import Stripe from "stripe";
import type { PersistedSubscriptionStatus } from "@/lib/billing-plans";

let cachedStripe: Stripe | null = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  if (!cachedStripe) {
    cachedStripe = new Stripe(secretKey);
  }

  return cachedStripe;
}

export function getStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  }
  return secret;
}

export function getStripePriceIdForTier(tier: number) {
  const mapping: Record<number, string | undefined> = {
    1: process.env.STRIPE_PRICE_STARTER,
    2: process.env.STRIPE_PRICE_GROWTH,
    3: process.env.STRIPE_PRICE_SCALE,
  };

  const priceId = mapping[tier];
  if (!priceId) {
    throw new Error(`Missing Stripe price ID for tier ${tier}`);
  }

  return priceId;
}

export function getStripeTrialDays() {
  const raw = process.env.STRIPE_TRIAL_DAYS;
  if (!raw) return 14;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("STRIPE_TRIAL_DAYS must be a non-negative number");
  }

  return Math.floor(parsed);
}

export function getTierFromPriceId(priceId?: string | null) {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_STARTER) return 1;
  if (priceId === process.env.STRIPE_PRICE_GROWTH) return 2;
  if (priceId === process.env.STRIPE_PRICE_SCALE) return 3;
  return null;
}

export function normalizeSubscriptionStatus(
  status?: Stripe.Subscription.Status | null
): PersistedSubscriptionStatus {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "unpaid":
      return "UNPAID";
    case "incomplete":
      return "INCOMPLETE";
    case "incomplete_expired":
      return "INCOMPLETE_EXPIRED";
    default:
      return "INCOMPLETE";
  }
}

export function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000"
  );
}
