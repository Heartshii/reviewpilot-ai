import Link from "next/link";

const metrics = [
  {
    value: "34%",
    label: "more review request clicks",
    detail:
      "Guests who enjoyed their visit get the right prompt at the right time instead of a generic blast.",
  },
  {
    value: "2.7x",
    label: "stronger win-back outreach",
    detail:
      "Inactive customers can be re-engaged with birthday, comeback, and seasonal SMS journeys.",
  },
  {
    value: "<10 min",
    label: "faster launch time",
    detail:
      "Set a kiosk name, add your review link, and go live without a complex POS-style setup process.",
  },
];

const signals = [
  {
    title: "Private recovery before public damage",
    body: "Low ratings are handled in a private flow so unhappy guests feel heard before they turn into visible one-star reviews.",
  },
  {
    title: "A usable guest database, not just a phone list",
    body: "Each visit becomes owned first-party data with loyalty context, visit activity, and consent-aware outreach.",
  },
  {
    title: "A product operators can actually run daily",
    body: "Managers get one workspace for approvals, campaigns, kiosk branding, customer health, and review growth.",
  },
];

const modules = [
  {
    name: "Branded front-desk kiosk",
    summary:
      "Capture guest check-ins on any tablet with a premium flow that matches the business brand.",
  },
  {
    name: "Review routing",
    summary:
      "Move happy guests toward public reviews while steering low ratings into recovery and follow-up.",
  },
  {
    name: "Customer segments",
    summary:
      "Find loyal guests, inactive customers, and unhappy visitors without exporting data into spreadsheets.",
  },
  {
    name: "Message campaigns",
    summary:
      "Send birthday offers, reactivation promos, and deal campaigns from the same operator workspace.",
  },
  {
    name: "Client and multi-location admin",
    summary:
      "Track usage, tiers, and expansion opportunities across locations from a single control room.",
  },
  {
    name: "Setup controls",
    summary:
      "Review links, kiosk branding, delay rules, and templates are configurable without developer help.",
  },
];

const whyReviewPilot = [
  {
    title: "Built for walk-in businesses",
    points: [
      "Restaurants and cafes collecting visit feedback after each order",
      "Salons, spas, and clinics trying to protect local reputation",
      "Gyms and service businesses that win by getting repeat visits",
    ],
  },
  {
    title: "Designed around the real operating loop",
    points: [
      "Capture the visit",
      "Measure the experience",
      "Recover bad moments",
      "Promote great ones",
      "Bring customers back again",
    ],
  },
  {
    title: "Why owners actually pay for it",
    points: [
      "More reviews without manually chasing customers",
      "Fewer negative surprises online",
      "A cleaner retention engine than ad-hoc texting",
      "A dashboard staff can use without training debt",
    ],
  },
];

const onboardingSteps = [
  {
    step: "01",
    title: "Brand the kiosk",
    text: "Set kiosk name, logo, accent color, and guest-facing experience so the front desk looks intentional on day one.",
  },
  {
    step: "02",
    title: "Connect review and messaging flows",
    text: "Add your Google review URL, choose message delay, and turn on birthday or re-engagement automations.",
  },
  {
    step: "03",
    title: "Train the daily workflow",
    text: "Managers use one dashboard for approvals, customer lookup, activity review, and campaign launches.",
  },
];

const trustBlocks = [
  "Private feedback collection before public escalation",
  "Consent-aware SMS messaging with opt-out language",
  "Business-facing settings for branding, templates, and review links",
  "Admin controls for clients, usage visibility, and operational oversight",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-transparent text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_34%),radial-gradient(circle_at_20%_20%,rgba(52,211,153,0.16),transparent_25%)]" />

      <nav className="page-shell sticky top-0 z-30 mt-4 flex items-center justify-between rounded-full border border-white/8 bg-[#08111f]/70 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] text-sm font-semibold text-slate-950 shadow-[0_0_40px_rgba(52,211,153,0.35)]">
            RP
          </div>
          <div>
            <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-white/90">
              ReviewPilot AI
            </p>
            <p className="text-xs text-white/35">
              Reputation + retention operating system
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <a href="#product" className="px-3 py-2 text-sm text-white/60 hover:text-white">
            Product
          </a>
          <Link href="/setup" className="px-3 py-2 text-sm text-white/60 hover:text-white">
            Setup
          </Link>
          <Link href="/dashboard" className="rounded-full px-4 py-2 text-sm text-white/70 hover:text-white">
            Client login
          </Link>
          <Link
            href="/admin"
            className="rounded-full border border-emerald-400/30 bg-emerald-400/12 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-400/18"
          >
            Admin
          </Link>
        </div>
      </nav>

      <section className="page-shell grid gap-10 px-4 pb-16 pt-20 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <div className="max-w-3xl">
          <span className="section-label">
            Built for local businesses with repeat visits
          </span>
          <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[0.95] text-white sm:text-6xl lg:text-7xl">
            Grow reviews, recover unhappy guests, and bring customers back from one product.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/62 sm:text-xl">
            ReviewPilot is designed for restaurants and service businesses that
            need more than a text sender. It gives you a guest kiosk, customer
            memory, review routing, recovery workflows, and repeat-visit campaigns
            in one operator-ready workspace.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/setup"
              className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-7 py-4 text-base font-semibold text-slate-950 shadow-[0_20px_60px_rgba(56,189,248,0.22)] hover:scale-[1.01]"
            >
              See setup flow
            </Link>
            <a
              href="#product"
              className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/4 px-7 py-4 text-base font-medium text-white/80 hover:bg-white/7 hover:text-white"
            >
              Explore the product
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-6 text-sm text-white/42">
            <span>Tablet kiosk + dashboard + SMS workflows</span>
            <span>Best fit for restaurants, salons, clinics, and fitness</span>
            <span>Built around guest experience and repeat visits</span>
          </div>
        </div>

        <div className="glass-panel spotlight-border mesh-card relative rounded-[2rem] p-5 sm:p-6">
          <div className="grid gap-4 rounded-[1.4rem] border border-white/8 bg-slate-950/55 p-4">
            <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Live reputation pulse
                </p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  4.8 average guest sentiment
                </p>
              </div>
              <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                +18% this month
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(8,12,23,0.94))] p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Front desk activity
                </p>
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-semibold text-white">128</p>
                    <p className="mt-1 text-sm text-white/45">
                      guest check-ins captured
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {[42, 55, 38, 74, 68, 82, 64].map((height) => (
                      <span
                        key={height}
                        className="w-2 rounded-full bg-[linear-gradient(180deg,rgba(56,189,248,0.92),rgba(52,211,153,0.4))]"
                        style={{ height }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(8,12,23,0.94))] p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                  Manager queue
                </p>
                <div className="mt-4 space-y-3">
                  {[
                    ["Low rating recovery", "3 waiting"],
                    ["Review nudges sent", "41 delivered"],
                    ["Win-back segment", "128 inactive guests"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-2xl border border-white/7 bg-white/4 px-3 py-3"
                    >
                      <span className="text-sm text-white/72">{label}</span>
                      <span className="text-xs text-white/38">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {metrics.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/8 bg-white/4 p-4"
                >
                  <p className="text-2xl font-semibold text-white">{item.value}</p>
                  <p className="mt-2 text-sm font-medium text-white/74">
                    {item.label}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-white/40">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell px-4 py-6 sm:px-6">
        <div className="grid gap-4 rounded-[2rem] border border-white/8 bg-[#08111f]/72 p-5 backdrop-blur-xl md:grid-cols-3 md:p-6">
          {signals.map((signal) => (
            <div
              key={signal.title}
              className="rounded-[1.5rem] border border-white/7 bg-white/4 p-5"
            >
              <p className="text-lg font-semibold text-white">{signal.title}</p>
              <p className="mt-3 text-sm leading-7 text-white/45">
                {signal.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="product" className="page-shell px-4 py-20 sm:px-6">
        <div className="flex max-w-3xl flex-col gap-4">
          <span className="section-label">Product experience</span>
          <h2 className="text-4xl font-semibold text-white sm:text-5xl">
            Purpose-built for guest-driven businesses, not generic marketing teams.
          </h2>
          <p className="max-w-2xl text-lg leading-8 text-white/55">
            ReviewPilot is strongest when you have frequent guest interactions,
            local reputation matters, and the same customer returning is worth more
            than one extra ad click.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {modules.map((feature, idx) => {
            const icons = ["📱", "⭐", "👥", "💬", "🏢", "⚙️"];
            return (
              <article
                key={feature.name}
                className="glass-panel mesh-card rounded-[1.8rem] p-6 hover:bg-white/[0.08] transition-all"
              >
                <div className="mb-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(56,189,248,0.22),rgba(52,211,153,0.22))] text-3xl">
                  {icons[idx]}
                </div>
                <h3 className="text-2xl font-semibold text-white">{feature.name}</h3>
                <p className="mt-4 text-sm leading-7 text-white/48">
                  {feature.summary}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-white/8 bg-[#08111f]/70 py-20">
        <div className="page-shell px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
              <div className="rounded-[1.6rem] border border-white/8 bg-slate-950/55 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                      Why operators choose it
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      It turns a messy reputation workflow into a repeatable daily system.
                    </p>
                  </div>
                  <div className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs text-amber-200">
                    Team-ready
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    ["Capture guest visits at the counter", "No app install required"],
                    ["Filter low ratings into recovery", "Protects local reputation"],
                    ["Launch comeback campaigns from one dashboard", "More repeat visits"],
                  ].map(([left, right]) => (
                    <div
                      key={left}
                      className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3"
                    >
                      <p className="text-sm text-white/74">{left}</p>
                      <p className="text-xs text-white/38">{right}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <span className="section-label">Why it sells</span>
              <h2 className="mt-5 text-4xl font-semibold text-white sm:text-5xl">
                This is not another bulk SMS tool pretending to be hospitality software.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/55">
                ReviewPilot is specifically about helping a local business capture
                the visit, understand the experience, protect its rating, and
                increase repeat traffic. That product story is much more compelling
                than generic “AI marketing” language.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {whyReviewPilot.map((block) => (
                  <div
                    key={block.title}
                    className="rounded-2xl border border-white/8 bg-white/4 p-4"
                  >
                    <p className="text-base font-semibold text-white">{block.title}</p>
                    <div className="mt-3 space-y-2">
                      {block.points.map((point) => (
                        <p key={point} className="text-sm leading-7 text-white/56">
                          {point}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="page-shell px-4 py-20 sm:px-6">
        <div className="flex max-w-3xl flex-col gap-4">
          <span className="section-label">Launch flow</span>
          <h2 className="text-4xl font-semibold text-white sm:text-5xl">
            Setup is simple, but the workflow feels like a real operating system once it is live.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {onboardingSteps.map((item) => (
            <div key={item.step} className="glass-panel rounded-[1.8rem] p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-sm font-semibold tracking-[0.16em] text-emerald-300">
                {item.step}
              </div>
              <h3 className="mt-8 text-2xl font-semibold text-white">
                {item.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-white/48">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/8 bg-[#08111f]/70 py-20">
        <div className="page-shell px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.92fr] lg:items-center">
            <div>
              <span className="section-label">Trust and readiness</span>
              <h2 className="mt-5 text-4xl font-semibold text-white sm:text-5xl">
                Customers should trust the product before they even request a demo.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/55">
                Real software businesses show setup clarity, legal pages, data-use
                language, and a product that looks maintained. ReviewPilot now has a
                stronger public story, and the next step is giving buyers a clearer
                setup and policy surface.
              </p>
            </div>

            <div className="glass-panel rounded-[1.9rem] p-6">
              <div className="space-y-3">
                {trustBlocks.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white/68"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/setup"
                  className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-5 py-3.5 text-sm font-semibold text-slate-950"
                >
                  View onboarding
                </Link>
                <Link
                  href="/privacy"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/4 px-5 py-3.5 text-sm font-semibold text-white/82 hover:bg-white/7"
                >
                  Read privacy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell px-4 py-20 sm:px-6">
        <div className="glass-panel rounded-[2rem] p-8 sm:p-10">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <span className="section-label">Next step</span>
              <h2 className="mt-5 max-w-3xl text-4xl font-semibold text-white sm:text-5xl">
                Start with setup clarity, then let the product prove itself in daily use.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/55">
                If a business owner can understand the setup, see the trust surface,
                and picture the kiosk and dashboard in their location, the product
                becomes much easier to sell.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/setup"
                className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-7 py-4 text-base font-semibold text-slate-950"
              >
                Open setup guide
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/4 px-7 py-4 text-base font-medium text-white/80"
              >
                Open dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="page-shell border-t border-white/8 px-4 py-8 text-sm text-white/35 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p>ReviewPilot AI</p>
            <p className="mt-1 text-xs text-white/28">
              Built for reputation, retention, and repeat visits
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/setup" className="hover:text-white/70">
              Setup
            </Link>
            <Link href="/privacy" className="hover:text-white/70">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white/70">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
