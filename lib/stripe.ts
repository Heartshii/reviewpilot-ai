import "server-only";

import Stripe from "stripe";
import type {
  BillingInterval,
  PersistedSubscriptionStatus,
} from "@/lib/billing-plans";
import { PREMIUM_AI_ADDON, getSmsPackAddon } from "@/lib/billing-addons";
import {
  getOptionalEnvValue,
  getRequiredEnvValue,
  getStripeReferralCreditCentsValue,
  getStripeTrialDaysValue,
} from "@/lib/env";

let cachedStripe: Stripe | null = null;

export function getStripe() {
  const secretKey = getRequiredEnvValue("STRIPE_SECRET_KEY");

  if (!cachedStripe) {
    cachedStripe = new Stripe(secretKey);
  }

  return cachedStripe;
}

export function getStripeWebhookSecret() {
  return getRequiredEnvValue("STRIPE_WEBHOOK_SECRET");
}

export function getStripePriceIdForTier(
  tier: number,
  interval: BillingInterval = "MONTHLY"
) {
  const mapping: Record<number, { MONTHLY?: string; ANNUAL?: string }> = {
    1: {
      MONTHLY: getOptionalEnvValue("STRIPE_PRICE_STARTER"),
      ANNUAL: getOptionalEnvValue("STRIPE_PRICE_STARTER_ANNUAL"),
    },
    2: {
      MONTHLY: getOptionalEnvValue("STRIPE_PRICE_GROWTH"),
      ANNUAL: getOptionalEnvValue("STRIPE_PRICE_GROWTH_ANNUAL"),
    },
    3: {
      MONTHLY: getOptionalEnvValue("STRIPE_PRICE_SCALE"),
      ANNUAL: getOptionalEnvValue("STRIPE_PRICE_SCALE_ANNUAL"),
    },
  };

  const priceId = mapping[tier]?.[interval];
  if (!priceId) {
    throw new Error(`Missing Stripe price ID for tier ${tier} (${interval.toLowerCase()})`);
  }

  return priceId;
}

export function getStripePriceIdForAddon(addonKey: string) {
  const mapping: Record<string, string | undefined> = {
    sms_500: getOptionalEnvValue("STRIPE_PRICE_SMS_PACK_500"),
    sms_1500: getOptionalEnvValue("STRIPE_PRICE_SMS_PACK_1500"),
    [PREMIUM_AI_ADDON.key]: getOptionalEnvValue("STRIPE_PRICE_PREMIUM_AI"),
  };

  const priceId = mapping[addonKey];
  if (!priceId) {
    throw new Error(`Missing Stripe price ID for add-on ${addonKey}`);
  }

  return priceId;
}

export function getStripeReferralCouponId() {
  return getOptionalEnvValue("STRIPE_REFERRAL_COUPON");
}

export function getStripeReferralCreditCents() {
  const parsed = getStripeReferralCreditCentsValue();
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("STRIPE_REFERRAL_CREDIT_CENTS must be a positive number");
  }

  return Math.floor(parsed);
}

export function getStripeTrialDays() {
  const parsed = getStripeTrialDaysValue();
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("STRIPE_TRIAL_DAYS must be a non-negative number");
  }

  return Math.floor(parsed);
}

export function getTierFromPriceId(priceId?: string | null) {
  if (!priceId) return null;
  if (priceId === getOptionalEnvValue("STRIPE_PRICE_STARTER")) return 1;
  if (priceId === getOptionalEnvValue("STRIPE_PRICE_STARTER_ANNUAL")) return 1;
  if (priceId === getOptionalEnvValue("STRIPE_PRICE_GROWTH")) return 2;
  if (priceId === getOptionalEnvValue("STRIPE_PRICE_GROWTH_ANNUAL")) return 2;
  if (priceId === getOptionalEnvValue("STRIPE_PRICE_SCALE")) return 3;
  if (priceId === getOptionalEnvValue("STRIPE_PRICE_SCALE_ANNUAL")) return 3;
  return null;
}

export function getBillingIntervalFromPriceId(
  priceId?: string | null
): BillingInterval | null {
  if (!priceId) return null;
  if (
    priceId === getOptionalEnvValue("STRIPE_PRICE_STARTER_ANNUAL") ||
    priceId === getOptionalEnvValue("STRIPE_PRICE_GROWTH_ANNUAL") ||
    priceId === getOptionalEnvValue("STRIPE_PRICE_SCALE_ANNUAL")
  ) {
    return "ANNUAL";
  }
  if (
    priceId === getOptionalEnvValue("STRIPE_PRICE_STARTER") ||
    priceId === getOptionalEnvValue("STRIPE_PRICE_GROWTH") ||
    priceId === getOptionalEnvValue("STRIPE_PRICE_SCALE")
  ) {
    return "MONTHLY";
  }
  return null;
}

export function getAddonFromPriceId(priceId?: string | null) {
  if (!priceId) return null;
  if (priceId === getOptionalEnvValue("STRIPE_PRICE_PREMIUM_AI")) {
    return { type: "PREMIUM_AI" as const, key: PREMIUM_AI_ADDON.key };
  }

  const sms500 = getOptionalEnvValue("STRIPE_PRICE_SMS_PACK_500");
  if (priceId === sms500) {
    const pack = getSmsPackAddon("sms_500");
    return pack
      ? { type: "SMS_PACK" as const, key: pack.key, credits: pack.credits }
      : null;
  }

  const sms1500 = getOptionalEnvValue("STRIPE_PRICE_SMS_PACK_1500");
  if (priceId === sms1500) {
    const pack = getSmsPackAddon("sms_1500");
    return pack
      ? { type: "SMS_PACK" as const, key: pack.key, credits: pack.credits }
      : null;
  }

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
    getOptionalEnvValue("NEXT_PUBLIC_APP_URL") ??
    getOptionalEnvValue("APP_URL") ??
    "http://localhost:3000"
  );
}
