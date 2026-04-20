import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-transparent text-white">

      {/* NAV */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 max-w-7xl mx-auto">
        <div>
          <span className="text-xl font-bold text-emerald-400">ReviewPilot</span>
          <span className="text-xl font-bold text-white"> AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-400 hover:text-white transition-colors px-4 py-2"
          >
            Business Login
          </Link>
          <Link
            href="/admin"
            className="text-sm bg-emerald-500 hover:bg-emerald-400 text-black font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Admin
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <div className="inline-block bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm px-4 py-1.5 rounded-full mb-6">
          AI-Powered Customer Engagement Platform
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          Turn Every Visit Into a
          <span className="text-emerald-400"> 5-Star Review</span>
          <br />and a Loyal Customer
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
          ReviewPilot AI automatically collects feedback, sends personalized SMS,
          fixes bad experiences before they go public, and builds a loyal customer
          base — all on autopilot.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 py-4 rounded-xl text-lg transition-colors"
          >
            Start Free Trial →
          </Link>
          <a
            href="#how-it-works"
            className="border border-zinc-700 hover:border-zinc-500 text-white px-8 py-4 rounded-xl text-lg transition-colors"
          >
            See How It Works
          </a>
        </div>
        <p className="text-zinc-500 text-sm mt-4">No credit card required · Setup in 10 minutes</p>
      </section>

      {/* PAIN POINTS — what you're missing */}
      <section className="bg-zinc-900/50 border-y border-zinc-800 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4">
              Every Day Without ReviewPilot AI,
              <span className="text-red-400"> You&apos;re Losing Customers</span>
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Most businesses have no idea what their customers really think —
              until they see a 1-star review online. By then it&apos;s too late.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "😤",
                title: "Unhappy customers leave silently",
                desc: "93% of unhappy customers never complain to you. They just leave and tell their friends — and post a 1-star review online.",
              },
              {
                icon: "📉",
                title: "1-star reviews kill your reputation",
                desc: "A single bad review can cost you 30 new customers. Most businesses have no system to catch complaints before they go public.",
              },
              {
                icon: "🔁",
                title: "Customers don't come back",
                desc: "Without follow-ups, loyalty programs, or birthday offers — your customers forget about you and go to your competitor.",
              },
              {
                icon: "👻",
                title: "No Google reviews = invisible",
                desc: "Businesses with fewer than 10 Google reviews are invisible in local search. Happy customers rarely leave reviews unless you ask.",
              },
              {
                icon: "💸",
                title: "You spend on ads but lose regulars",
                desc: "It costs 5x more to get a new customer than keep an existing one. Yet most businesses invest nothing in retention.",
              },
              {
                icon: "🤷",
                title: "You don't know what's working",
                desc: "Without data on ratings, visit frequency, and feedback — you're running your business blind with no way to improve.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-red-950/30 border border-red-900/40 rounded-xl p-6"
              >
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-semibold text-red-300 mb-2">{item.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="py-20 max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-4">
            ReviewPilot AI
            <span className="text-emerald-400"> Fixes All of This</span>
            {" "}Automatically
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            One platform that handles feedback collection, review generation,
            customer recovery, loyalty, and re-engagement — without any manual work.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              icon: "📱",
              title: "Smart Feedback Kiosk",
              desc: "Customers check in on your iPad kiosk when they visit. No app download needed. Captures name, phone, and birthday in seconds.",
              badge: "Any Business",
            },
            {
              icon: "⭐",
              title: "Automated Google Review Funnel",
              desc: "Happy customers (4-5 stars) automatically get a text with your Google review link. Watch your review count grow on autopilot.",
              badge: "Most Popular",
            },
            {
              icon: "🤖",
              title: "AI-Powered Complaint Recovery",
              desc: "Unhappy customers (1-3 stars) trigger an AI-drafted apology. You approve it, then it sends automatically. Fix problems before they go public.",
              badge: "AI Feature",
            },
            {
              icon: "🎂",
              title: "Birthday & Re-engagement SMS",
              desc: "Automatically send birthday offers and re-engage customers who haven't visited in 30, 60, or 90 days. Bring them back without lifting a finger.",
              badge: "Automated",
            },
            {
              icon: "🏆",
              title: "Loyalty Points Program",
              desc: "Customers earn points on every visit based on their bill amount. They redeem points for rewards you define. Build real loyalty — not just visits.",
              badge: "Retention",
            },
            {
              icon: "📊",
              title: "Business Intelligence Dashboard",
              desc: "See your ratings, visit trends, at-risk customers, and SMS performance in one clean dashboard. Make decisions based on real data.",
              badge: "Insights",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-emerald-500/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{item.icon}</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">
                  {item.badge}
                </span>
              </div>
              <h3 className="font-semibold text-white text-lg mb-2">{item.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-zinc-900/50 border-y border-zinc-800 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4">Up and Running in 3 Steps</h2>
            <p className="text-zinc-400 text-lg">No technical knowledge needed. Setup takes 10 minutes.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Set up your kiosk",
                desc: "We give you a kiosk URL. Open it on any iPad or tablet at your front desk. Your customers check in when they visit.",
              },
              {
                step: "02",
                title: "Customers check in",
                desc: "They enter their name, phone number, and bill amount. ReviewPilot AI takes it from there — SMS, reviews, loyalty points, all automatic.",
              },
              {
                step: "03",
                title: "Watch your business grow",
                desc: "More Google reviews, fewer public complaints, loyal repeat customers. You manage it all from your dashboard in minutes a day.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 font-bold text-xl mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">{item.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO IS IT FOR */}
      <section className="py-20 max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-4">
            Works for
            <span className="text-emerald-400"> Any Business</span>
            {" "}with Walk-In Customers
          </h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            If customers visit your location in person, ReviewPilot AI works for you.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: "🍕", label: "Restaurants" },
            { icon: "💇", label: "Salons & Spas" },
            { icon: "🏋️", label: "Gyms & Fitness" },
            { icon: "🦷", label: "Dental Clinics" },
            { icon: "🛍️", label: "Retail Stores" },
            { icon: "🏨", label: "Hotels & Stays" },
            { icon: "🚗", label: "Auto Services" },
            { icon: "🐾", label: "Pet Services" },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center hover:border-emerald-500/40 transition-colors"
            >
              <div className="text-3xl mb-2">{item.icon}</div>
              <p className="text-sm text-zinc-300 font-medium">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-zinc-900/50 border-y border-zinc-800 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-zinc-400 text-lg">Start free for 30 days. No credit card required.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Starter",
                price: "$49",
                sms: "300 SMS/month",
                features: [
                  "Customer check-in kiosk",
                  "Welcome SMS automation",
                  "Google review funnel",
                  "AI complaint recovery",
                  "Basic dashboard",
                ],
                highlight: false,
              },
              {
                name: "Growth",
                price: "$99",
                sms: "750 SMS/month",
                features: [
                  "Everything in Starter",
                  "Bulk SMS campaigns",
                  "AI deal message drafting",
                  "Customer segments",
                  "Advanced analytics",
                ],
                highlight: true,
              },
              {
                name: "Pro",
                price: "$179",
                sms: "2,000 SMS/month",
                features: [
                  "Everything in Growth",
                  "Loyalty points program",
                  "Birthday automation",
                  "Re-engagement SMS",
                  "Priority support",
                ],
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-6 border ${
                  plan.highlight
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-zinc-800 bg-zinc-900/50"
                }`}
              >
                {plan.highlight && (
                  <div className="text-center mb-3">
                    <span className="text-xs bg-emerald-500 text-black font-bold px-3 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                <h3 className="font-bold text-xl mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-emerald-400">{plan.price}</span>
                  <span className="text-zinc-400">/month</span>
                </div>
                <p className="text-zinc-500 text-sm mb-6">{plan.sms}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                      <span className="text-emerald-400">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/dashboard"
                  className={`block text-center py-3 rounded-lg font-medium transition-colors ${
                    plan.highlight
                      ? "bg-emerald-500 hover:bg-emerald-400 text-black"
                      : "border border-zinc-700 hover:border-zinc-500 text-white"
                  }`}
                >
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-bold mb-6">
          Ready to Stop Losing Customers
          <span className="text-emerald-400"> Silently?</span>
        </h2>
        <p className="text-zinc-400 text-lg mb-10">
          Join businesses already using ReviewPilot AI to grow their reputation,
          retain customers, and make data-driven decisions — automatically.
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-10 py-5 rounded-xl text-xl transition-colors"
        >
          Get Started Free →
        </Link>
        <p className="text-zinc-500 text-sm mt-4">14-day free trial · No credit card · Cancel anytime</p>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-800 py-8 text-center text-zinc-500 text-sm">
        <p>© 2026 ReviewPilot AI · Built for businesses that care about their customers</p>
      </footer>

    </main>
  );
}