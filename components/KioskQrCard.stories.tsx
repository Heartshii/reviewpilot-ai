import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { KioskQrCard } from "./KioskQrCard";

const meta = {
  title: "Settings/Kiosk QR Card",
  component: KioskQrCard,
  args: {
    slug: "north-branch-check-in",
    accentColor: "#34d399",
  },
  parameters: {
    docs: {
      description: {
        component:
          "Settings card used to preview, copy, and download the branded kiosk QR entry point for a workspace or location.",
      },
    },
  },
} satisfies Meta<typeof KioskQrCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DentalVariant: Story = {
  args: {
    slug: "oak-smile-clinic-check-in",
    accentColor: "#38bdf8",
  },
};
