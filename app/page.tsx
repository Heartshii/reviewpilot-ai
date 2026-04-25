"use client";

import Link from "next/link";
import { MarketingFooter } from "@/components/marketing-footer";

const steps = [
  {
    icon: "01",
    title: "Customer visits",
    description:
      "Customer visits, scans a QR code, or gets a follow-up SMS after the meal.",
    tone: "emerald",
  },
  {
    icon: "02",
    title: "Rates experience",
    description: "They rate the visit from 1 to 5 stars in a fast private feedback flow.",
    tone: "emerald",
  },
  {
    icon: "03",
    title: "Happy guests go public",
    description:
      "Guests who rate 4-5 stars are guided to leave a Google review immediately.",
    tone: "emerald",
  },
  {
    icon: "04",
    title: "Unhappy guests stay private",
    description:
      "Guests who rate 1-3 stars leave private feedback and trigger an AI apology draft.",
    tone: "amber",
  },
];

const stats = [
  { value: "+340%", label: "more Google reviews" },
  { value: "100%", label: "feedback captured" },
  { value: "2min", label: "average AI response time" },
];

const features = [
  {
    icon: "📱",
    title: "Smart SMS Flow",
    description:
      "Automated review requests sent at the perfect moment after the customer visit.",
  },
  {
    icon: "⚡",
    title: "AI Apology Engine",
    description:
      "Unhappy customers get a personal AI-crafted response before they disappear forever.",
  },
  {
    icon: "🎯",
    title: "Loyalty Kiosk",
    description:
      "Branded tablet kiosk captures every customer at point of sale with minimal staff effort.",
  },
  {
    icon: "📊",
    title: "AI Insights",
    description:
      "Spot negative trends, rating dips, and repeat-visit opportunities before they hurt your reputation.",
  },
  {
    icon: "💬",
    title: "Campaign Builder",
    description:
      "Send targeted deals to loyal, inactive, or VIP customers without exporting spreadsheets.",
  },
  {
    icon: "⚙️",
    title: "Real-time Dashboard",
    description:
      "Live stats, customer history, message activity, and rating trends in one operator-ready workspace.",
  },
];

const pricing = [
  {
    name: "STARTER",
    price: "$49/mo",
    features: [
      "1 location",
      "300 SMS/month",
      "Smart review funnel",
      "Basic dashboard",
      "Email support",
    ],
  },
  {
    name: "PRO",
    price: "$99/mo",
    badge: "Most Popular",
    highlight: true,
    features: [
      "1 location",
      "750 SMS/month",
      "Everything in Starter",
      "AI apology engine",
      "Campaign builder",
      "Birthday & re-engagement SMS",
      "Priority support",
    ],
  },
  {
    name: "AGENCY",
    price: "$179/mo",
    features: [
      "Up to 5 locations",
      "2000 SMS/month",
      "Everything in Pro",
      "White-label kiosk",
      "AI insights panel",
      "Dedicated account manager",
    ],
  },
];

const testimonials = [
  {
    quote: "Our Google reviews went from 47 to 180 in 3 months. Insane ROI.",
    name: "Marco T.",
    title: "Italian Kitchen",
  },
  {
    quote:
      "The apology SMS actually saved a customer relationship I thought was lost.",
    name: "Sarah K.",
    title: "Cafe Owner",
  },
  {
    quote: "Set it up in an afternoon. Now it just runs.",
    name: "Dev P.",
    title: "Restaurant Manager",
  },
];

const whyItSells = [
  {
    title: "Saves time",
    description: "No manual follow-ups or spreadsheets. Automated from first guest interaction to Google review.",
  },
  {
    title: "Recovers revenue",
    description: "Unhappy customers get a real response in minutes instead of lost forever. Saves relationships.",
  },
  {
    title: "Scales with you",
    description: "Works for 1 location or 5+. Same system, one unified dashboard no matter how many restaurants.",
  },
  {
    title: "No technical setup",
    description: "QR codes, SMS, or kiosk. Works with your existing systems. Setup in under an hour.",
  },
];

const trustItems = [
  { text: "Used by 50+ restaurants" },
  { text: "GDPR & SMS compliant" },
  { text: "Powered by Twilio & Convex" },
  { text: "24/7 email support" },
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
          <a href="#features" className="px-3 py-2 text-sm text-white/60 hover:text-white">
            Features
          </a>
          <a href="#how-it-works" className="px-3 py-2 text-sm text-white/60 hover:text-white">
            How It Works
          </a>
          <a href="#pricing" className="px-3 py-2 text-sm text-white/60 hover:text-white">
            Pricing
          </a>
          <Link href="/contact" className="px-3 py-2 text-sm text-white/60 hover:text-white">
            Contact
          </Link>
          <Link
            href="/sign-in"
            className="rounded-full border border-white/12 bg-white/4 px-4 py-2 text-sm text-white/70 hover:text-white"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="rounded-full border-0 bg-[linear-gradient(135deg,#38bdf8,#34d399)] px-4 py-2 text-sm font-medium text-slate-950 shadow-[0_8px_32px_rgba(56,189,248,0.3)] hover:shadow-[0_12px_48px_rgba(56,189,248,0.4)] transition-shadow"
          >
            Start Free Trial
          </Link>
        </div>
      </nav>

      <section className="mx-auto grid w-full max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-400">
            Reputation Growth System
          </p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-tight text-white sm:text-6xl">
            Turn Every Visit Into a 5-Star Google Review {"\u2014"} Automatically
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/60">
            ReviewPilot sends smart SMS to your customers, collects feedback
            privately, and drives happy guests straight to Google. No awkward
            asking required.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="rounded-xl border-0 bg-[linear-gradient(135deg,#38bdf8,#34d399)] px-6 py-3 text-center text-sm font-medium text-slate-950 shadow-[0_8px_32px_rgba(56,189,248,0.3)] hover:shadow-[0_12px_48px_rgba(56,189,248,0.4)] transition-shadow"
            >
              Start Free Trial {"\u2192"}
            </Link>
            <a
              href="#how-it-works"
              className="rounded-xl border border-white/10 px-6 py-3 text-center text-sm text-white/60 hover:text-white"
            >
              Watch How It Works
            </a>
          </div>

          <p className="mt-5 text-sm text-white/40">
            Trusted by 50+ restaurants {"\u2022"} No credit card required
          </p>
        </div>

        <div className="mx-auto w-full max-w-md rounded-[2rem] border border-white/5 bg-white/[0.02] p-5 shadow-2xl backdrop-blur-sm">
          <div className="rounded-[1.5rem] border border-white/5 bg-[#0b1020] p-4">
            <div className="mx-auto flex h-[560px] w-full max-w-[280px] flex-col rounded-[2.4rem] border border-white/10 bg-[#050914] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
              <div className="mx-auto mb-5 h-1.5 w-20 rounded-full bg-white/10" />
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-400">
                  Review request
                </p>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  Thanks for dining with us tonight. How was your visit?
                </p>
              </div>
              <div className="mt-4 grid grid-cols-5 gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-center text-lg text-amber-400">
                {Array.from({ length: 5 }).map((_, index) => (
                  <span key={index}>{"\u2605"}</span>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                  5-star path
                </p>
                <p className="mt-2 text-sm text-white/70">
                  Amazing. Would you mind sharing that on Google?
                </p>
                <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/20 px-3 py-2 text-center text-sm font-medium text-emerald-400">
                  Leave Google Review
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">
                  2-star path
                </p>
                <p className="mt-2 text-sm text-white/70">
                  We are sorry about that experience. Our team is drafting a reply now.
                </p>
                <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-center text-sm font-medium text-amber-300">
                  AI apology in progress
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6"
      >
        <div className="mb-10">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-400">
            How It Works
          </p>
          <h2 className="mt-4 font-display text-4xl font-semibold text-white sm:text-5xl">
            One flow for happy guests. Another for recovery.
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              {index < steps.length - 1 && (
                <div className="absolute left-[52px] top-9 hidden h-[2px] w-[calc(100%-24px)] lg:block">
                  <div
                    className={`h-full w-full ${
                      step.tone === "amber" ? "bg-amber-500/30" : "bg-emerald-500/30"
                    }`}
                  />
                </div>
              )}
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold ${
                    step.tone === "amber"
                      ? "border border-amber-500/20 bg-amber-500/10 text-amber-300"
                      : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  }`}
                >
                  {step.icon}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/55">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-400">
            Why ReviewPilot
          </p>
          <h2 className="mt-4 font-display text-4xl font-semibold text-white sm:text-5xl">
            Stop leaving reputation to chance
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-white/60">
            A purpose-built system that turns feedback into action, and action into
            repeat visits.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {[
            {
              icon: "✓",
              title: "Automated Workflows",
              body: "Set it once and let the flow run. ReviewPilot sends requests at the right moment, routes feedback, and prepares recovery responses.",
            },
            {
              icon: "⚡",
              title: "Recovery at Scale",
              body: "AI-crafted apology replies help you recover unhappy guests quickly, before churn turns into public damage.",
            },
            {
              icon: "📊",
              title: "Real Data, Real Insights",
              body: "Every touchpoint, score, and response becomes a clear signal so your team knows what is improving reputation.",
            },
            {
              icon: "🎯",
              title: "Point-of-Sale Capture",
              body: "Capture feedback while the visit is still fresh with kiosk and QR flows designed for real floor operations.",
            },
            {
              icon: "🤝",
              title: "Built for Operators",
              body: "No generic marketing maze. The product is built for owners and managers who need fast decisions every shift.",
            },
            {
              icon: "🔒",
              title: "Privacy First",
              body: "Negative feedback stays private while positive experiences can be guided to public channels with full control.",
            },
          ].map((item, index) => (
            <article
              key={item.title}
              className="feature-glow-card animate-rise-in group rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/30"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="relative z-10 flex items-start gap-4">
                <div className="mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/15 text-lg text-emerald-300">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white transition-colors group-hover:text-emerald-300">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-white/60">{item.body}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm"
            >
              <p className="text-4xl font-semibold text-emerald-400">{stat.value}</p>
              <p className="mt-3 text-base text-white/65">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-400">
            Features
          </p>
          <h2 className="mt-4 font-display text-4xl font-semibold text-white sm:text-5xl">
            Everything your restaurant needs to protect and grow its reputation
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-white/60">
            From automated review requests to AI-powered recovery, ReviewPilot gives you all the tools to turn more customers into Google reviewers.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="feature-glow-card animate-rise-in group rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/30"
              style={{ animationDelay: `${index * 85}ms` }}
            >
              <div className="relative z-10 flex items-start gap-4">
                <div className="mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-400/15 text-lg text-sky-200">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white transition-colors group-hover:text-sky-300">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-white/60">
                    {feature.description}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-400">
            Get Started
          </p>
          <h2 className="mt-4 font-display text-4xl font-semibold text-white sm:text-5xl">
            Three ways to capture every guest
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/20 text-2xl">
              📱
            </div>
            <h3 className="text-xl font-semibold text-white">QR Code</h3>
            <p className="mt-3 text-sm leading-7 text-white/60">
              Print QR codes for tables. Guests scan, rate, and submit feedback in seconds right from their phone.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-white/50">
              <li>✓ Instant setup</li>
              <li>✓ No app required</li>
              <li>✓ Works offline</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/20 text-2xl">
              💬
            </div>
            <h3 className="text-xl font-semibold text-white">SMS Flow</h3>
            <p className="mt-3 text-sm leading-7 text-white/60">
              Automated text messages sent after checkout. Quick yes/no ratings turn into detailed feedback when needed.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-white/50">
              <li>✓ Instant delivery</li>
              <li>✓ Direct response</li>
              <li>✓ No app friction</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/20 text-2xl">
              🎯
            </div>
            <h3 className="text-xl font-semibold text-white">Branded Kiosk</h3>
            <p className="mt-3 text-sm leading-7 text-white/60">
              Custom-branded tablet at checkout captures feedback while the experience is fresh, with your branding throughout.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-white/50">
              <li>✓ Point-of-sale capture</li>
              <li>✓ Highest response rate</li>
              <li>✓ Premium branding</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Works with all three methods</h3>
              <p className="mt-2 text-sm leading-7 text-white/60">
                Mix and match QR, SMS, and Kiosk. All feedback flows to the same unified dashboard so you never miss an opportunity.
              </p>
            </div>
            <Link
              href="/sign-up"
              className="flex-shrink-0 rounded-xl border border-emerald-500/20 bg-emerald-500/20 px-6 py-3 text-sm font-medium text-emerald-400 hover:bg-emerald-500/30"
            >
              Try Demo
            </Link>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-400">
            Pricing
          </p>
          <h2 className="mt-4 font-display text-4xl font-semibold text-white sm:text-5xl">
            Start simple. Upgrade as reputation growth compounds.
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {pricing.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border bg-white/[0.02] p-6 backdrop-blur-sm ${
                tier.highlight
                  ? "border-emerald-500/30 shadow-[0_0_0_1px_rgba(16,185,129,0.12),0_0_40px_rgba(16,185,129,0.12)]"
                  : "border-white/5"
              }`}
            >
              {tier.badge && (
                <div className="mb-4 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
                  {tier.badge}
                </div>
              )}
              <p className="text-sm font-medium tracking-[0.2em] text-white/45">
                {tier.name}
              </p>
              <p className="mt-3 text-4xl font-semibold text-white">{tier.price}</p>
              <div className="mt-6 space-y-3">
                {tier.features.map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3 text-sm text-white/65"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <Link
                href="/sign-up"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl border-0 bg-[linear-gradient(135deg,#38bdf8,#34d399)] px-4 py-3 text-sm font-medium text-slate-950 shadow-[0_8px_24px_rgba(56,189,248,0.2)] hover:shadow-[0_12px_40px_rgba(56,189,248,0.3)] transition-shadow"
              >
                Get Started {"\u2192"}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-400">
            Testimonials
          </p>
          <h2 className="mt-4 font-display text-4xl font-semibold text-white sm:text-5xl">
            Operators trust it because it fits real restaurant workflows
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm"
            >
              <p className="text-base leading-8 text-white/70">
                {"\u201C"}
                {testimonial.quote}
                {"\u201D"}
              </p>
              <p className="mt-6 text-sm font-semibold text-white">
                {testimonial.name}
              </p>
              <p className="mt-1 text-sm text-white/40">{testimonial.title}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-400">
            Why It Sells
          </p>
          <h2 className="mt-4 font-display text-4xl font-semibold text-white sm:text-5xl">
            ReviewPilot is built on what restaurant owners actually need
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            {whyItSells.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm hover:border-white/10 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-sm font-bold">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm text-white/60">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col justify-center gap-6">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 backdrop-blur-sm">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-400 mb-2">Implementation</p>
              <h3 className="text-2xl font-semibold text-white mb-4">Go live in hours, not weeks</h3>
              <p className="text-white/60 mb-6">No technical setup required. Pick QR, SMS, or Kiosk. All three integrate with your existing systems. Most restaurants launch on the first day.</p>
              <Link href="/setup" className="inline-flex rounded-xl border-0 bg-[linear-gradient(135deg,#38bdf8,#34d399)] px-5 py-3 text-sm font-medium text-slate-950 shadow-[0_8px_24px_rgba(56,189,248,0.2)] hover:shadow-[0_12px_40px_rgba(56,189,248,0.3)] transition-shadow">
                View Setup Flow
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="rounded-3xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent p-12 backdrop-blur-sm">
          <div className="mb-10">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-400">
              Ready to Grow
            </p>
            <h2 className="mt-4 font-display text-3xl font-semibold text-white sm:text-4xl">
              Everything you need to launch your reputation engine
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {trustItems.map((item) => (
              <div key={item.text} className="flex items-start gap-3">
                <div className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  ✓
                </div>
                <p className="text-sm text-white/70">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="flex-1 rounded-xl border-0 bg-[linear-gradient(135deg,#38bdf8,#34d399)] px-6 py-4 text-center text-sm font-medium text-slate-950 shadow-[0_8px_32px_rgba(56,189,248,0.3)] hover:shadow-[0_12px_48px_rgba(56,189,248,0.4)] transition-shadow"
            >
              Start Free Trial {"\u2192"}
            </Link>
            <a
              href="#how-it-works"
              className="flex-1 rounded-xl border border-white/10 px-6 py-4 text-center text-sm text-white/60 hover:text-white hover:border-white/20 transition-colors"
            >
              View Onboarding
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <MarketingFooter />
      </div>
    </main>
  );
}
