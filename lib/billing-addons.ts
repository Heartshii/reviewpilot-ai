export type SmsPackAddon = {
  key: "sms_500" | "sms_1500";
  name: string;
  description: string;
  credits: number;
  price: number;
};

export type PremiumAiAddon = {
  key: "premium_ai";
  name: string;
  description: string;
  price: number;
  features: string[];
};

export const SMS_PACK_ADDONS: SmsPackAddon[] = [
  {
    key: "sms_500",
    name: "SMS Boost 500",
    description: "Add 500 extra SMS credits on top of the current plan.",
    credits: 500,
    price: 29,
  },
  {
    key: "sms_1500",
    name: "SMS Boost 1500",
    description: "Add 1,500 extra SMS credits for busier campaigns and follow-up.",
    credits: 1500,
    price: 69,
  },
];

export const PREMIUM_AI_ADDON: PremiumAiAddon = {
  key: "premium_ai",
  name: "Premium AI",
  description: "Sharper AI drafting for recovery, campaigns, sentiment, and public review replies.",
  price: 39,
  features: [
    "Higher-quality AI message generation",
    "Premium model for sentiment analysis",
    "Premium model for public review replies",
    "Premium model for recovery and campaign drafting",
  ],
};

export function getSmsPackAddon(key: string) {
  return SMS_PACK_ADDONS.find((addon) => addon.key === key) ?? null;
}

export function isPremiumAiAddonKey(key: string) {
  return key === PREMIUM_AI_ADDON.key;
}
