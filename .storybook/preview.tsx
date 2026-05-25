import type { Preview } from "@storybook/nextjs-vite";
import "../app/globals.css";

const preview: Preview = {
  parameters: {
    layout: "padded",
    nextjs: {
      appDirectory: true,
    },
    backgrounds: {
      default: "ReviewPilot Night",
      values: [
        { name: "ReviewPilot Night", value: "#090b18" },
        { name: "Deep Glass", value: "#08111d" },
        { name: "Slate", value: "#111827" },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: ["Foundations", "Marketing", "Settings"],
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-transparent px-4 py-6 text-white sm:px-8">
        <Story />
      </div>
    ),
  ],
};

export default preview;
