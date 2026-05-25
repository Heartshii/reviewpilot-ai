import type { Meta, StoryObj } from "@storybook/nextjs-vite";

function FoundationShowcase() {
  const tokens = [
    { label: "App background", value: "#0a0a14" },
    { label: "Surface background", value: "#08111d" },
    { label: "Emerald accent", value: "#34d399" },
    { label: "Sky accent", value: "#38bdf8" },
  ];

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <span className="section-label">Design foundations</span>
        <div className="glass-panel rounded-[2rem] p-8">
          <h1 className="font-display text-4xl font-semibold text-white">
            ReviewPilot SaaS surface kit
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-white/60">
            Use these reference surfaces to keep marketing, dashboard, and
            public-facing experiences visually consistent across the product.
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {tokens.map((token) => (
          <div
            key={token.label}
            className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-5"
          >
            <div
              className="h-14 rounded-2xl border border-white/8"
              style={{ backgroundColor: token.value }}
            />
            <p className="mt-4 text-sm font-medium text-white">{token.label}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/35">
              {token.value}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="dashboard-surface rounded-[1.8rem] p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-white/30">
            Dashboard card
          </p>
          <p className="mt-3 text-xl font-semibold text-white">Usage snapshot</p>
          <p className="mt-2 text-sm leading-7 text-white/55">
            Blur-heavy, dark surfaces for operators and admin workflows.
          </p>
        </div>

        <div className="glass-panel mesh-card rounded-[1.8rem] p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/70">
            Marketing card
          </p>
          <p className="mt-3 text-xl font-semibold text-white">Premium hero panel</p>
          <p className="mt-2 text-sm leading-7 text-white/55">
            Use ambient gradients and soft glows for high-intent conversion sections.
          </p>
        </div>

        <div className="feature-glow-card spotlight-border rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-sky-300/70">
            Feature tile
          </p>
          <p className="mt-3 text-xl font-semibold text-white">Interactive spotlight</p>
          <p className="mt-2 text-sm leading-7 text-white/55">
            Larger feature tiles can lean on glow accents instead of heavy illustration.
          </p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-white/30">
            Primary action
          </p>
          <button
            type="button"
            className="mt-4 rounded-[1.35rem] bg-[linear-gradient(135deg,#34d399,#4cc9f0)] px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(76,201,240,0.18)]"
          >
            Launch workflow
          </button>
        </div>

        <div className="rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-white/30">
            Secondary action
          </p>
          <button
            type="button"
            className="mt-4 rounded-[1.35rem] border border-white/10 px-6 py-3.5 text-sm font-semibold text-white/72 hover:text-white"
          >
            Review details
          </button>
        </div>
      </section>
    </div>
  );
}

const meta = {
  title: "Foundations/Surface System",
  component: FoundationShowcase,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Reference story for the dark glass surfaces, accents, and button treatments used across ReviewPilot AI.",
      },
    },
  },
} satisfies Meta<typeof FoundationShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
