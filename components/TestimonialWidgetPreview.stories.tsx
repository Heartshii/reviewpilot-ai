import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TestimonialWidgetPreview } from "./TestimonialWidgetPreview";
import type { PublicTestimonialWidgetData } from "@/lib/testimonial-widget";

const baseData: PublicTestimonialWidgetData = {
  slug: "harbor-dental",
  businessName: "Harbor Dental Studio",
  scopeLabel: "Harbor Dental Studio",
  headline: "Recent 5-star experiences from Harbor Dental Studio",
  subheadline:
    "Trusted feedback highlights captured automatically through Harbor Dental Studio's review follow-up flow.",
  theme: "EMERALD",
  badgeLabel: "Live reputation proof",
  footerLabel: "Published through ReviewPilot AI",
  supportEmail: "care@harbordental.com",
  items: [
    {
      id: "1",
      quote:
        "The front desk was fast, the dentist explained every step clearly, and the follow-up felt thoughtful.",
      customerName: "Emily R.",
      rating: 5,
      visitCount: 3,
      createdAt: Date.UTC(2026, 4, 1),
    },
    {
      id: "2",
      quote:
        "Clean office, easy scheduling, and they actually remembered my previous concern at the next visit.",
      customerName: "Marcus T.",
      rating: 5,
      visitCount: 2,
      createdAt: Date.UTC(2026, 4, 3),
    },
    {
      id: "3",
      quote:
        "Best patient communication I have had from a local clinic. The reminders and staff follow-through were excellent.",
      customerName: "Nina P.",
      rating: 5,
      visitCount: 4,
      createdAt: Date.UTC(2026, 4, 4),
    },
  ],
};

const meta = {
  title: "Marketing/Testimonial Widget Preview",
  component: TestimonialWidgetPreview,
  args: {
    data: baseData,
  },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Preview surface for the public testimonial widget used in white-label and client-embed flows.",
      },
    },
  },
} satisfies Meta<typeof TestimonialWidgetPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Emerald: Story = {};

export const Midnight: Story = {
  args: {
    data: {
      ...baseData,
      theme: "MIDNIGHT",
      badgeLabel: "Top rated this month",
      footerLabel: "Trusted highlights from recent guests",
    },
  },
};

export const EmptyState: Story = {
  args: {
    data: null,
  },
};
