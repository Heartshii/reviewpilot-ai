import { z } from "zod";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/business-copy";

export const DUPLICATE_CHECKIN_WINDOW_MS = 45_000;
export const TWILIO_INBOUND_DEDUP_WINDOW_MS = 15_000;

export type PhoneMessagingChannel = "SMS" | "WHATSAPP";

const businessTypeSchema = z.enum(BUSINESS_TYPES);

function collapseWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function ensureAbsoluteUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return z.url().parse(withProtocol);
}

export function slugifyWorkspace(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function normalizeUsPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  throw new Error("Enter a valid US phone number.");
}

export function stripTwilioChannelPrefix(value: string) {
  return value.replace(/^whatsapp:/i, "").trim();
}

export function normalizeInboundPhoneNumber(value: string) {
  return normalizeUsPhoneNumber(stripTwilioChannelPrefix(value));
}

export function toTwilioMessagingAddress(
  channel: PhoneMessagingChannel,
  value: string
) {
  const normalized = normalizeUsPhoneNumber(value);
  return channel === "WHATSAPP" ? `whatsapp:${normalized}` : normalized;
}

export function getPhoneLookupCandidates(value: string) {
  const normalized = normalizeUsPhoneNumber(value);
  const local = normalized.slice(-10);
  return Array.from(new Set([normalized, local, value.trim()])).filter(Boolean);
}

const optionalPhoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (!value) {
      return undefined;
    }

    try {
      return normalizeUsPhoneNumber(value);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid US phone number.",
      });
      return z.NEVER;
    }
  });

const optionalUrlSchema = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (!value) {
      return undefined;
    }

    try {
      return ensureAbsoluteUrl(value);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid URL.",
      });
      return z.NEVER;
    }
  });

const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (!value) {
      return undefined;
    }

    const email = value.toLowerCase();
    const result = z.email().safeParse(email);
    if (!result.success) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid email address.",
      });
      return z.NEVER;
    }

    return email;
  });

const locationSchema = z.object({
  locationName: z
    .string()
    .trim()
    .min(2, "Add a location name.")
    .max(80, "Location name is too long.")
    .transform(collapseWhitespace),
  locationSlug: z
    .string()
    .trim()
    .min(2, "Add a location slug.")
    .max(50, "Location slug is too long.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Location slug can only use lowercase letters, numbers, and hyphens."
    ),
  contactPhone: optionalPhoneSchema,
  googleBusinessUrl: optionalUrlSchema,
  twilioNumber: optionalPhoneSchema,
  kioskDisplayName: z
    .string()
    .trim()
    .max(80, "Kiosk display name is too long.")
    .optional()
    .transform((value) => (value ? collapseWhitespace(value) : undefined)),
  kioskAccentColor: z
    .string()
    .trim()
    .regex(/^#?[0-9a-fA-F]{6}$/, "Use a valid 6-digit hex color.")
    .optional()
    .transform((value) =>
      value ? (value.startsWith("#") ? value : `#${value}`) : undefined
    ),
  kioskLogoUrl: optionalUrlSchema,
  kioskBgImageUrl: optionalUrlSchema,
});

const onboardingSchema = z.object({
  restaurantName: z
    .string()
    .trim()
    .min(2, "Add a business name first.")
    .max(80, "Business name is too long.")
    .transform(collapseWhitespace),
  restaurantSlug: z
    .string()
    .trim()
    .min(2, "Add a workspace slug.")
    .max(50, "Workspace slug is too long.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Workspace slug can only use lowercase letters, numbers, and hyphens."
    ),
  businessType: businessTypeSchema,
  businessSubtype: z
    .string()
    .trim()
    .max(60, "Business specialty is too long.")
    .optional()
    .transform((value) => (value ? collapseWhitespace(value) : undefined)),
  contactPhone: optionalPhoneSchema,
  websiteUrl: optionalUrlSchema,
  googleBusinessUrl: optionalUrlSchema,
});

const customerCheckInSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter the customer's name.")
    .max(80, "Customer name is too long.")
    .transform(collapseWhitespace),
  phone: z.string().transform((value, ctx) => {
    try {
      return normalizeUsPhoneNumber(value);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid US phone number.",
      });
      return z.NEVER;
    }
  }),
  email: optionalEmailSchema,
  restaurantId: z.string(),
  birthdayMonth: z.number().int().min(1).max(12).optional(),
  birthdayDay: z.number().int().min(1).max(31).optional(),
  optedInSms: z.boolean(),
  optedInEmail: z.boolean().optional(),
  billAmount: z
    .number()
    .finite("Enter a valid amount.")
    .min(0, "Amount cannot be negative.")
    .max(100_000, "Amount is too large.")
    .optional(),
});

export function validateOnboardingInput(input: {
  restaurantName: string;
  restaurantSlug: string;
  businessType: BusinessType;
  businessSubtype?: string;
  contactPhone?: string;
  websiteUrl?: string;
  googleBusinessUrl?: string;
}) {
  return onboardingSchema.safeParse(input);
}

export function parseOnboardingInput(input: {
  restaurantName: string;
  restaurantSlug: string;
  businessType: BusinessType;
  businessSubtype?: string;
  contactPhone?: string;
  websiteUrl?: string;
  googleBusinessUrl?: string;
}) {
  return onboardingSchema.parse(input);
}

export function parseCustomerCheckInInput(input: {
  name: string;
  phone: string;
  email?: string;
  restaurantId: string;
  birthdayMonth?: number;
  birthdayDay?: number;
  optedInSms: boolean;
  optedInEmail?: boolean;
  billAmount?: number;
}) {
  return customerCheckInSchema.parse(input);
}

export function validateLocationInput(input: {
  locationName: string;
  locationSlug: string;
  contactPhone?: string;
  googleBusinessUrl?: string;
  twilioNumber?: string;
  kioskDisplayName?: string;
  kioskAccentColor?: string;
  kioskLogoUrl?: string;
  kioskBgImageUrl?: string;
}) {
  return locationSchema.safeParse(input);
}

export function parseLocationInput(input: {
  locationName: string;
  locationSlug: string;
  contactPhone?: string;
  googleBusinessUrl?: string;
  twilioNumber?: string;
  kioskDisplayName?: string;
  kioskAccentColor?: string;
  kioskLogoUrl?: string;
  kioskBgImageUrl?: string;
}) {
  return locationSchema.parse(input);
}
