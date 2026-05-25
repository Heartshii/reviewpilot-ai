export type BillingPlan = {
  tier: 1 | 2 | 3;
  key: "starter" | "growth" | "scale";
  name: string;
  price: number;
  annualPrice: number;
  smsLimit: number;
  summary: string;
  features: string[];
  entitlements: {
    aiRecovery: boolean;
    campaigns: boolean;
    birthdayReengagement: boolean;
    aiInsights: boolean;
    whiteLabelKiosk: boolean;
    multiLocation: boolean;
  };
  highlighted?: boolean;
};

export type PersistedSubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "UNPAID"
  | "INCOMPLETE"
  | "INCOMPLETE_EXPIRED";

export type DisplaySubscriptionStatus = PersistedSubscriptionStatus | "NONE";
export type BillingInterval = "MONTHLY" | "ANNUAL";
export const DEFAULT_TRIAL_DAYS = 14;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

type BillingAccessState = {
  subscriptionStatus?: DisplaySubscriptionStatus | PersistedSubscriptionStatus | null;
  trialEndsAt?: number | null;
  stripeSubscriptionId?: string | null;
};

export const BILLING_PLANS: BillingPlan[] = [
  {
    tier: 1,
    key: "starter",
    name: "Starter",
    price: 49,
    annualPrice: 490,
    smsLimit: 500,
    summary: "Best for one local business testing reputation automation.",
    features: [
      "1 location",
      "500 SMS / month",
      "Smart review funnel",
      "Basic dashboard",
      "Email support",
    ],
    entitlements: {
      aiRecovery: false,
      campaigns: false,
      birthdayReengagement: false,
      aiInsights: false,
      whiteLabelKiosk: false,
      multiLocation: false,
    },
  },
  {
    tier: 2,
    key: "growth",
    name: "Pro",
    price: 79,
    annualPrice: 790,
    smsLimit: 1000,
    summary: "Adds recovery, campaigns, and lifecycle messaging for growing teams.",
    features: [
      "1 location",
      "1000 SMS / month",
      "Everything in Starter",
      "AI recovery engine",
      "Campaign builder",
      "Birthday and re-engagement SMS",
      "Priority support",
    ],
    entitlements: {
      aiRecovery: true,
      campaigns: true,
      birthdayReengagement: true,
      aiInsights: false,
      whiteLabelKiosk: false,
      multiLocation: false,
    },
    highlighted: true,
  },
  {
    tier: 3,
    key: "scale",
    name: "Agency",
    price: 149,
    annualPrice: 1490,
    smsLimit: 2000,
    summary: "Built for teams managing multiple locations or client accounts.",
    features: [
      "Up to 5 locations",
      "2000 SMS / month",
      "Everything in Pro",
      "White-label kiosk",
      "AI insights panel",
      "Dedicated account manager",
    ],
    entitlements: {
      aiRecovery: true,
      campaigns: true,
      birthdayReengagement: true,
      aiInsights: true,
      whiteLabelKiosk: true,
      multiLocation: true,
    },
  },
];

export function getPlanByTier(tier: number) {
  return BILLING_PLANS.find((plan) => plan.tier === tier) ?? BILLING_PLANS[0];
}

export function getPlanPriceByInterval(tier: number, interval: BillingInterval) {
  const plan = getPlanByTier(tier);
  return interval === "ANNUAL" ? plan.annualPrice : plan.price;
}

export function getSmsLimitForTier(tier: number) {
  return getPlanByTier(tier).smsLimit;
}

export function hasFeatureForTier(
  tier: number,
  feature: keyof BillingPlan["entitlements"]
) {
  return getPlanByTier(tier).entitlements[feature];
}

export function formatSubscriptionStatus(status: DisplaySubscriptionStatus) {
  if (status === "NONE") return "Not started";

  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getSubscriptionTone(status: DisplaySubscriptionStatus) {
  switch (status) {
    case "ACTIVE":
    case "TRIALING":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
    case "PAST_DUE":
    case "INCOMPLETE":
      return "border-amber-500/20 bg-amber-500/10 text-amber-200";
    case "CANCELED":
    case "UNPAID":
    case "INCOMPLETE_EXPIRED":
      return "border-red-500/20 bg-red-500/10 text-red-300";
    default:
      return "border-white/10 bg-white/[0.04] text-white/60";
  }
}

export function hasActiveSubscription(status: DisplaySubscriptionStatus) {
  return (
    status === "ACTIVE" ||
    status === "TRIALING" ||
    status === "PAST_DUE" ||
    status === "INCOMPLETE"
  );
}

export function getInitialTrialEndsAt(
  now = Date.now(),
  trialDays = DEFAULT_TRIAL_DAYS
) {
  return now + trialDays * DAY_IN_MS;
}

export function getRemainingTrialDays(
  trialEndsAt?: number | null,
  now = Date.now()
) {
  if (!trialEndsAt) return 0;
  const diff = trialEndsAt - now;
  return Math.max(0, Math.ceil(diff / DAY_IN_MS));
}

export function isTrialExpired(
  state: Pick<BillingAccessState, "trialEndsAt">,
  now = Date.now()
) {
  return !!state.trialEndsAt && state.trialEndsAt <= now;
}

export function hasWorkspaceBillingAccess(
  state: BillingAccessState,
  now = Date.now()
) {
  const normalizedStatus =
    (state.subscriptionStatus as DisplaySubscriptionStatus | undefined) ?? "NONE";

  if (
    normalizedStatus === "NONE" &&
    !state.trialEndsAt &&
    !state.stripeSubscriptionId
  ) {
    return true;
  }

  if (hasActiveSubscription(normalizedStatus)) {
    return true;
  }

  return getRemainingTrialDays(state.trialEndsAt, now) > 0;
}

export function getCheckoutTrialDays(args: {
  stripeSubscriptionId?: string | null;
  trialEndsAt?: number | null;
  fallbackTrialDays?: number;
  now?: number;
}) {
  if (args.stripeSubscriptionId) {
    return undefined;
  }

  const now = args.now ?? Date.now();
  const remaining = getRemainingTrialDays(args.trialEndsAt, now);
  if (remaining > 0) {
    return Math.max(1, remaining);
  }

  const fallback = args.fallbackTrialDays ?? 0;
  return fallback > 0 ? Math.max(1, Math.floor(fallback)) : undefined;
}
