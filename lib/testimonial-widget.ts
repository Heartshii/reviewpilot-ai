export type TestimonialWidgetTheme = "EMERALD" | "MIDNIGHT" | "GLASS";

export type PublicTestimonialWidgetItem = {
  id: string;
  quote: string;
  customerName: string;
  rating: number;
  visitCount: number;
  createdAt: number;
};

export type PublicTestimonialWidgetData = {
  slug: string;
  businessName: string;
  scopeLabel: string;
  headline: string;
  subheadline: string;
  theme: TestimonialWidgetTheme;
  badgeLabel: string;
  footerLabel: string;
  supportEmail?: string;
  items: PublicTestimonialWidgetItem[];
};

export const TESTIMONIAL_WIDGET_THEMES: Array<{
  value: TestimonialWidgetTheme;
  label: string;
  description: string;
}> = [
  {
    value: "EMERALD",
    label: "Emerald glow",
    description: "A high-contrast SaaS card with bright green accents.",
  },
  {
    value: "MIDNIGHT",
    label: "Midnight glass",
    description: "A darker polished embed for premium brand sites.",
  },
  {
    value: "GLASS",
    label: "Soft glass",
    description: "A lighter translucent style that blends into airy pages.",
  },
];

export function formatPublicCustomerName(name?: string | null) {
  if (!name?.trim()) {
    return "Verified customer";
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "Verified customer";
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;
}

export function sanitizePublicQuote(value?: string | null) {
  if (!value) {
    return "";
  }

  return value
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 240);
}

export function buildDefaultWidgetHeadline(scopeLabel: string) {
  return `Recent 5-star experiences from ${scopeLabel}`;
}

export function buildDefaultWidgetSubheadline(
  scopeLabel: string,
  brandedByReviewPilot = true
) {
  return brandedByReviewPilot
    ? `Trusted feedback highlights captured automatically through ${scopeLabel}'s ReviewPilot review funnel.`
    : `Trusted feedback highlights captured automatically through ${scopeLabel}'s review follow-up flow.`;
}
