"use client";

import Link from "next/link";
import { MarketingFooter } from "@/components/marketing-footer";

const steps = [
  {
    icon: "01",
    title: "Customer checks in",
    description:
      "A customer scans a QR code, uses the kiosk, or receives a follow-up SMS after their visit.",
    tone: "emerald",
  },
  {
    icon: "02",
    title: "Private rating captured",
    description:
      "They rate the experience from 1 to 5 stars in a fast, private feedback flow.",
    tone: "emerald",
  },
  {
    icon: "03",
    title: "Happy visits go public",
    description:
      "4-5 star experiences are guided into a Google review request immediately.",
    tone: "emerald",
  },
  {
    icon: "04",
    title: "Low ratings stay private",
    description:
      "1-3 star experiences stay in your workspace and trigger an AI-assisted recovery draft.",
    tone: "amber",
  },
];

const stats = [
  { value: "+340%", label: "more Google reviews" },
  { value: "100%", label: "feedback captured" },
  { value: "2min", label: "average AI response time" },
];

const proofCards = [
  {
    icon: "AI",
    title: "Automated workflows",
    body: "Set the rules once. ReviewPilot handles timing, routing, follow-up, and approval-ready recovery drafts.",
  },
  {
    icon: "RX",
    title: "Recovery before churn",
    body: "Private negative feedback gives teams a chance to fix the relationship before it becomes a public review.",
  },
  {
    icon: "DA",
    title: "Signals you can act on",
    body: "Every score, visit, and response becomes a clean signal for operations, service quality, and retention.",
  },
  {
    icon: "KS",
    title: "On-site capture",
    body: "The kiosk and QR flow help teams capture feedback while the experience is still fresh.",
  },
  {
    icon: "CM",
    title: "Campaign-ready customer memory",
    body: "Track visit counts, loyalty points, spend, and recovery history before you send your next message.",
  },
  {
    icon: "TR",
    title: "Built for trust",
    body: "Consent-aware messaging, privacy pages, review controls, and business settings keep the platform buyer-ready.",
  },
];

const features = [
  {
    icon: "SMS",
    title: "Smart SMS Flow",
    description:
      "Automated review requests sent at the right moment after a visit or service interaction.",
  },
  {
    icon: "AI",
    title: "AI Recovery Engine",
    description:
      "Low ratings trigger an owner-reviewable apology draft so teams can respond faster.",
  },
  {
    icon: "KSK",
    title: "Branded Kiosk",
    description:
      "A branded front-desk or checkout kiosk captures customer details, loyalty visits, and feedback on-site.",
  },
  {
    icon: "INS",
    title: "AI Insights",
    description:
      "Spot rating dips, unhappy segments, and rising activity before problems become reputation damage.",
  },
  {
    icon: "CMP",
    title: "Campaign Builder",
    description:
      "Send targeted messages to loyal, inactive, VIP, or at-risk customers without exporting spreadsheets.",
  },
  {
    icon: "DAS",
    title: "Operator Dashboard",
    description:
      "Live stats, customer history, approvals, activity, billing, and usage in one calm control room.",
  },
];

const pricing = [
  {
    name: "STARTER",
    price: "$49/mo",
    features: [
      "1 location",
      "500 SMS/month",
      "Smart review funnel",
      "Basic dashboard",
      "Email support",
    ],
  },
  {
    name: "PRO",
    price: "$79/mo",
    badge: "Most Popular",
    highlight: true,
    features: [
      "1 location",
      "1000 SMS/month",
      "Everything in Starter",
      "AI recovery engine",
      "Campaign builder",
      "Birthday and re-engagement SMS",
      "Priority support",
    ],
  },
  {
    name: "AGENCY",
    price: "$149/mo",
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
    quote: "Our review volume jumped fast, and the recovery flow helped us save conversations we would have lost before.",
    name: "Marco T.",
    title: "Multi-location owner",
  },
  {
    quote: "The apology SMS actually saved a customer relationship I thought was gone.",
    name: "Sarah K.",
    title: "Clinic operator",
  },
  {
    quote: "Set it up in an afternoon. Now it just runs.",
    name: "Dev P.",
    title: "Local business manager",
  },
];

const whyItSells = [
  {
    title: "Works across service categories",
    description:
      "Restaurants, clinics, stores, and service brands can use the same system without awkward industry mismatches.",
  },
  {
    title: "Reduces manual follow-up",
    description:
      "No more scattered texts, spreadsheets, or missed unhappy customers after the visit.",
  },
  {
    title: "Turns feedback into retention",
    description:
      "Private recovery workflows help protect revenue before a bad experience becomes public damage.",
  },
  {
    title: "Grows with the operator",
    description:
      "Start with one location, then expand into more teams, more messages, and more locations from the same workspace.",
  },
];

const trustItems = [
  { text: "Used by growth-focused local businesses" },
  { text: "Consent-aware SMS workflows" },
  { text: "Powered by Twilio, Convex, Clerk, and Stripe" },
  { text: "Owner-ready onboarding, settings, and billing" },
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
              Reputation and retention operating system
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
            className="rounded-full border-0 bg-[linear-gradient(135deg,#38bdf8,#34d399)] px-4 py-2 text-sm font-medium text-slate-950 shadow-[0_8px_32px_rgba(56,189,248,0.3)] transition-shadow hover:shadow-[0_12px_48px_rgba(56,189,248,0.4)]"
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
            Turn Every Visit Into a 5-Star Google Review - Automatically
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/60">
            ReviewPilot sends smart SMS to your customers, collects feedback
            privately, and drives happy customers straight to Google. No awkward
            asking required.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="rounded-xl border-0 bg-[linear-gradient(135deg,#38bdf8,#34d399)] px-6 py-3 text-center text-sm font-medium text-slate-950 shadow-[0_8px_32px_rgba(56,189,248,0.3)] transition-shadow hover:shadow-[0_12px_48px_rgba(56,189,248,0.4)]"
            >
              Start Free Trial -&gt;
            </Link>
            <a
              href="#how-it-works"
              className="rounded-xl border border-white/10 px-6 py-3 text-center text-sm text-white/60 hover:text-white"
            >
              Watch How It Works
            </a>
          </div>

          <p className="mt-5 text-sm text-white/40">
            Trusted by fast-moving local businesses • No credit card required
          </p>
        </div>

        <div className="mx-auto w-full max-w-md rounded-[2rem] border border-white/5 bg-white/[0.02] p-5 shadow-2xl backdrop-blur-sm">
          <div className="rounded-[1.5rem] border border-white/5 bg-[#0b1020] p-4">
            <div className="mx-auto flex h-[560px] w-full max-w-[280px] flex-col rounded-[2.4rem] border border-white/10 bg-[#050914] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
              <div className="mx-auto mb-5 h-1.5 w-20 rounded-full bg-white/10" />
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-400">
                  Follow-up prompt
                </p>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  Thanks for visiting us today. How was your experience?
                </p>
              </div>
              <div className="mt-4 grid grid-cols-5 gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-center text-lg text-amber-400">
                {Array.from({ length: 5 }).map((_, index) => (
                  <span key={index}>*</span>
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
                  Low-rating path
                </p>
                <p className="mt-2 text-sm text-white/70">
                  We are sorry about that experience. A recovery draft is ready for owner approval.
                </p>
                <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-center text-sm font-medium text-amber-300">
                  AI recovery ready
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-400">
            How It Works
          </p>
          <h2 className="mt-4 font-display text-4xl font-semibold text-white sm:text-5xl">
            One flow for happy customers. Another for recovery.
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
            A purpose-built system that turns feedback into action, and action
            into repeat business.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {proofCards.map((item, index) => (
            <article
              key={item.title}
              className="feature-glow-card animate-rise-in group rounded-2xl border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/30"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="relative z-10 flex items-start gap-4">
                <div className="mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/15 text-sm text-emerald-300">
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
            Everything a modern local business needs to protect and grow its reputation
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-white/60">
            From automated review requests to AI-assisted recovery, ReviewPilot
            gives teams the tools to turn more customers into public advocates.
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
                <div className="mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-400/15 text-[11px] font-semibold tracking-[0.14em] text-sky-200">
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
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl border-0 bg-[linear-gradient(135deg,#38bdf8,#34d399)] px-4 py-3 text-sm font-medium text-slate-950 shadow-[0_8px_24px_rgba(56,189,248,0.2)] transition-shadow hover:shadow-[0_12px_40px_rgba(56,189,248,0.3)]"
              >
                Get Started -&gt;
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
            Operators trust it because it fits real-world workflows
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm"
            >
              <p className="text-base leading-8 text-white/70">
                &ldquo;{testimonial.quote}&rdquo;
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
            ReviewPilot is built on what real operators actually need
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            {whyItSells.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm transition-colors hover:border-white/10"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-sm font-bold text-emerald-400">
                    +
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
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.24em] text-emerald-400">
                Implementation
              </p>
              <h3 className="mb-4 text-2xl font-semibold text-white">
                Go live in hours, not weeks
              </h3>
              <p className="mb-6 text-white/60">
                Pick QR, SMS, or kiosk. Add the review link, brand the flow,
                and start a trial. Most teams can be ready in a single
                afternoon.
              </p>
              <Link
                href="/setup"
                className="inline-flex rounded-xl border-0 bg-[linear-gradient(135deg,#38bdf8,#34d399)] px-5 py-3 text-sm font-medium text-slate-950 shadow-[0_8px_24px_rgba(56,189,248,0.2)] transition-shadow hover:shadow-[0_12px_40px_rgba(56,189,248,0.3)]"
              >
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
                  +
                </div>
                <p className="text-sm text-white/70">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="flex-1 rounded-xl border-0 bg-[linear-gradient(135deg,#38bdf8,#34d399)] px-6 py-4 text-center text-sm font-medium text-slate-950 shadow-[0_8px_32px_rgba(56,189,248,0.3)] transition-shadow hover:shadow-[0_12px_48px_rgba(56,189,248,0.4)]"
            >
              Start Free Trial -&gt;
            </Link>
            <a
              href="#how-it-works"
              className="flex-1 rounded-xl border border-white/10 px-6 py-4 text-center text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white"
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
