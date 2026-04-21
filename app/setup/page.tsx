import Link from "next/link";

const steps = [
  {
    title: "Create the guest-facing experience",
    items: [
      "Name the kiosk and set the accent color to match the business brand.",
      "Add a logo and optional background image so the tablet looks intentional on-site.",
      "Place the kiosk at check-in, pickup, or checkout where staff can naturally point guests to it.",
    ],
  },
  {
    title: "Connect reputation and messaging",
    items: [
      "Paste the Google review URL in settings so happy guests can be routed into review requests.",
      "Choose the default SMS delay after a visit so messages feel timely instead of robotic.",
      "Turn on birthday and re-engagement flows only after the team has approved message tone.",
    ],
  },
  {
    title: "Train the manager workflow",
    items: [
      "Check the dashboard once or twice a day for pending recovery approvals and activity changes.",
      "Use customers to review visit history, loyalty signals, and SMS conversations before sending campaigns.",
      "Keep settings updated whenever the business changes branding, offers, or review destination.",
    ],
  },
];

const checklist = [
  "Google review link added",
  "Kiosk branding saved",
  "Birthday template reviewed",
  "Re-engagement toggles confirmed",
  "Team knows who approves recovery SMS",
];

export default function SetupPage() {
  return (
    <main className="page-shell px-2 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <span className="section-label">Onboarding guide</span>
        <h1 className="mt-6 text-5xl font-semibold leading-tight text-white">
          How to launch ReviewPilot cleanly for a real business.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-white/58">
          This setup flow is written for restaurant and service-business owners
          who want the product to feel polished on day one, not like a side tool
          patched into operations.
        </p>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
            <div className="space-y-8">
              {steps.map((step, index) => (
                <section key={step.title} className="rounded-[1.5rem] border border-white/8 bg-white/4 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-sm font-semibold text-emerald-200">
                      {index + 1}
                    </div>
                    <h2 className="text-2xl font-semibold text-white">{step.title}</h2>
                  </div>
                  <div className="mt-5 space-y-3">
                    {step.items.map((item) => (
                      <p key={item} className="text-sm leading-7 text-white/58">
                        {item}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="glass-panel rounded-[2rem] p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-white/30">
                Go-live checklist
              </p>
              <div className="mt-4 space-y-3">
                {checklist.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white/68"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-[2rem] p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-white/30">
                Recommended launch order
              </p>
              <p className="mt-4 text-sm leading-7 text-white/58">
                First brand the kiosk. Then add the review URL. Then approve your
                default message flows. Only after that should the team start
                sending campaigns.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href="/dashboard/settings"
                  className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-5 py-3.5 text-sm font-semibold text-slate-950"
                >
                  Open settings
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/4 px-5 py-3.5 text-sm font-semibold text-white/82"
                >
                  Open dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
