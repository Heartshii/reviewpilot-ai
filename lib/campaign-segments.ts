export const CAMPAIGN_SEGMENTS = [
  {
    key: "ALL",
    label: "All opted-in customers",
    description: "Reach every customer who can receive SMS from this workspace.",
  },
  {
    key: "NEW",
    label: "New customers",
    description: "Guests with their first recorded visit.",
  },
  {
    key: "LOYAL",
    label: "Loyal regulars",
    description: "Frequent repeat customers worth rewarding.",
  },
  {
    key: "VIP",
    label: "VIP spenders",
    description: "Customers with strong lifetime value or points balance.",
  },
  {
    key: "HIGH_SPEND",
    label: "High spenders",
    description: "Customers whose tracked spend is above your normal baseline.",
  },
  {
    key: "RECENT",
    label: "Recently active",
    description: "Customers seen in the last few weeks and still warm.",
  },
  {
    key: "INACTIVE_30",
    label: "30+ day inactive",
    description: "Customers who have not visited in at least 30 days.",
  },
  {
    key: "INACTIVE_60",
    label: "60+ day inactive",
    description: "Customers drifting away and ready for a win-back message.",
  },
  {
    key: "NEEDS_ATTENTION",
    label: "Needs attention",
    description: "Customers whose latest feedback was negative.",
  },
  {
    key: "REVIEW_READY",
    label: "Review-ready regulars",
    description: "Happy repeat customers who are strong candidates for review or referral asks.",
  },
] as const;

export type CampaignSegmentKey = (typeof CAMPAIGN_SEGMENTS)[number]["key"];

export function getCampaignSegmentMeta(segment: CampaignSegmentKey) {
  return (
    CAMPAIGN_SEGMENTS.find((entry) => entry.key === segment) ?? CAMPAIGN_SEGMENTS[0]
  );
}
