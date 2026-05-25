import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MarketingFooter } from "./marketing-footer";

const meta = {
  title: "Marketing/Footer",
  component: MarketingFooter,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Shared marketing footer used across the landing page and trust pages.",
      },
    },
  },
} satisfies Meta<typeof MarketingFooter>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
