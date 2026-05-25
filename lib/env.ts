import { z } from "zod";

const nonEmpty = z.string().trim().min(1, "must be a non-empty string");

const serverEnvSchema = z.object({
  NEXT_PUBLIC_CONVEX_URL: nonEmpty,
  STRIPE_SECRET_KEY: nonEmpty.optional(),
  STRIPE_WEBHOOK_SECRET: nonEmpty.optional(),
  STRIPE_PRICE_STARTER: nonEmpty.optional(),
  STRIPE_PRICE_STARTER_ANNUAL: nonEmpty.optional(),
  STRIPE_PRICE_GROWTH: nonEmpty.optional(),
  STRIPE_PRICE_GROWTH_ANNUAL: nonEmpty.optional(),
  STRIPE_PRICE_SCALE: nonEmpty.optional(),
  STRIPE_PRICE_SCALE_ANNUAL: nonEmpty.optional(),
  STRIPE_PRICE_SMS_PACK_500: nonEmpty.optional(),
  STRIPE_PRICE_SMS_PACK_1500: nonEmpty.optional(),
  STRIPE_PRICE_PREMIUM_AI: nonEmpty.optional(),
  STRIPE_REFERRAL_COUPON: nonEmpty.optional(),
  STRIPE_REFERRAL_CREDIT_CENTS: z
    .string()
    .optional()
    .transform((value) => (value == null || value === "" ? "2000" : value))
    .refine((value) => Number.isFinite(Number(value)), {
      message: "must be numeric",
    }),
  STRIPE_TRIAL_DAYS: z
    .string()
    .optional()
    .transform((value) => (value == null || value === "" ? "14" : value))
    .refine((value) => Number.isFinite(Number(value)), {
      message: "must be numeric",
    }),
  TWILIO_ACCOUNT_SID: nonEmpty.optional(),
  TWILIO_AUTH_TOKEN: nonEmpty.optional(),
  OPENAI_API_KEY: nonEmpty.optional(),
  OPENAI_STANDARD_MODEL: nonEmpty.optional(),
  OPENAI_PREMIUM_MODEL: nonEmpty.optional(),
  VOICE_AI_HIGH_VALUE_SPEND: z
    .string()
    .optional()
    .transform((value) => (value == null || value === "" ? "150" : value))
    .refine((value) => Number.isFinite(Number(value)), {
      message: "must be numeric",
    }),
  RESEND_API_KEY: nonEmpty.optional(),
  REVIEWPILOT_ALERT_FROM_EMAIL: nonEmpty.optional(),
  NEXT_PUBLIC_APP_URL: nonEmpty.optional(),
  APP_URL: nonEmpty.optional(),
  SUPER_ADMIN_EMAILS: z
    .string()
    .optional()
    .transform((value) =>
      value
        ?.split(",")
        .map((item) => item.trim())
        .filter(Boolean) ?? []
    ),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedServerEnv: ServerEnv | null = null;

function formatIssues(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
}

export function getServerEnv() {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  const parsed = serverEnvSchema.safeParse({
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_STARTER: process.env.STRIPE_PRICE_STARTER,
    STRIPE_PRICE_STARTER_ANNUAL: process.env.STRIPE_PRICE_STARTER_ANNUAL,
    STRIPE_PRICE_GROWTH: process.env.STRIPE_PRICE_GROWTH,
    STRIPE_PRICE_GROWTH_ANNUAL: process.env.STRIPE_PRICE_GROWTH_ANNUAL,
    STRIPE_PRICE_SCALE: process.env.STRIPE_PRICE_SCALE,
    STRIPE_PRICE_SCALE_ANNUAL: process.env.STRIPE_PRICE_SCALE_ANNUAL,
    STRIPE_PRICE_SMS_PACK_500: process.env.STRIPE_PRICE_SMS_PACK_500,
    STRIPE_PRICE_SMS_PACK_1500: process.env.STRIPE_PRICE_SMS_PACK_1500,
    STRIPE_PRICE_PREMIUM_AI: process.env.STRIPE_PRICE_PREMIUM_AI,
    STRIPE_REFERRAL_COUPON: process.env.STRIPE_REFERRAL_COUPON,
    STRIPE_REFERRAL_CREDIT_CENTS: process.env.STRIPE_REFERRAL_CREDIT_CENTS,
    STRIPE_TRIAL_DAYS: process.env.STRIPE_TRIAL_DAYS,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_STANDARD_MODEL: process.env.OPENAI_STANDARD_MODEL,
    OPENAI_PREMIUM_MODEL: process.env.OPENAI_PREMIUM_MODEL,
    VOICE_AI_HIGH_VALUE_SPEND: process.env.VOICE_AI_HIGH_VALUE_SPEND,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    REVIEWPILOT_ALERT_FROM_EMAIL: process.env.REVIEWPILOT_ALERT_FROM_EMAIL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    APP_URL: process.env.APP_URL,
    SUPER_ADMIN_EMAILS: process.env.SUPER_ADMIN_EMAILS,
  });

  if (!parsed.success) {
    throw new Error(`Invalid server environment. ${formatIssues(parsed.error)}`);
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

export function getRequiredEnvValue(
  key: Exclude<keyof ServerEnv, "SUPER_ADMIN_EMAILS" | "STRIPE_TRIAL_DAYS">
) {
  const value = getServerEnv()[key];
  if (!value) {
    throw new Error(`Missing ${key}`);
  }
  return value;
}

export function getOptionalEnvValue(
  key: Exclude<keyof ServerEnv, "SUPER_ADMIN_EMAILS" | "STRIPE_TRIAL_DAYS">
) {
  return getServerEnv()[key];
}

export function getSuperAdminEmails() {
  return getServerEnv().SUPER_ADMIN_EMAILS;
}

export function getStripeTrialDaysValue() {
  return Number(getServerEnv().STRIPE_TRIAL_DAYS);
}

export function getStripeReferralCreditCentsValue() {
  return Number(getServerEnv().STRIPE_REFERRAL_CREDIT_CENTS);
}

export function getVoiceAiHighValueSpendValue() {
  return Number(getServerEnv().VOICE_AI_HIGH_VALUE_SPEND);
}
