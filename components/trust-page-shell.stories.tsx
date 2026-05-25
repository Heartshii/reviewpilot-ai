import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TrustPageShell } from "./trust-page-shell";

const meta = {
  title: "Marketing/Trust Page Shell",
  component: TrustPageShell,
  args: {
    eyebrow: "Trust and readiness",
    title: "Customers should trust the product before they request a demo.",
    description:
      "Use this shell for about, contact, privacy, and terms pages so trust content feels native to the same premium system as the landing page.",
    children: (
      <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm">
        <p className="text-sm leading-7 text-white/65">
          This slot is designed for dense trust content, structured policy copy,
          founder context, or customer support details without losing the product
          visual consistency.
        </p>
      </div>
    ),
  },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Shared frame for the public trust pages so legal and credibility content follows the same visual system as the landing experience.",
      },
    },
  },
} satisfies Meta<typeof TrustPageShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
