import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(52,211,153,0.18),transparent_35%),radial-gradient(circle_at_80%_65%,rgba(56,189,248,0.2),transparent_40%)]" />

      <div className="relative mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="feature-glow-card rounded-3xl border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-7 backdrop-blur-xl sm:p-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/65 hover:text-white"
          >
            {"\u2190"} Back to home
          </Link>

          <p className="mt-8 text-sm font-medium uppercase tracking-[0.24em] text-emerald-400">
            Welcome back
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Sign in to your ReviewPilot workspace
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/58 sm:text-base">
            Continue managing customer recovery, SMS campaigns, and review growth
            from one calm dashboard.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {[
              "Live customer feedback feed",
              "Smart AI recovery replies",
              "Google review funnel tracking",
              "Campaign and loyalty controls",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/65"
              >
                <span className="mr-2 text-emerald-300">{"\u2726"}</span>
                {item}
              </div>
            ))}
          </div>

          <p className="mt-7 text-sm text-white/45">
            New here?{" "}
            <Link href="/sign-up" className="text-emerald-300 hover:text-emerald-200">
              Create your account
            </Link>
          </p>
        </section>

        <section className="flex justify-center">
          <SignIn
            path="/sign-in"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/setup"
            forceRedirectUrl="/setup"
            appearance={{
              variables: {
                colorPrimary: "#34d399",
                colorBackground: "#ffffff",
                colorText: "#0f172a",
                colorInputBackground: "#f8fafc",
                colorInputText: "#0f172a",
                colorNeutral: "#94a3b8",
                borderRadius: "14px",
              },
              elements: {
                rootBox: "w-full",
                card: "w-full max-w-[440px] border border-slate-200 bg-white shadow-[0_26px_70px_rgba(15,23,42,0.28)]",
                headerTitle: "text-slate-900",
                headerSubtitle: "text-slate-600",
                socialButtonsBlockButton:
                  "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
                socialButtonsBlockButtonText: "text-slate-800",
                formButtonPrimary:
                  "bg-[linear-gradient(135deg,#34d399,#38bdf8)] text-slate-950 hover:opacity-95",
                formFieldInput:
                  "border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-500",
                formFieldLabel: "text-slate-700",
                dividerLine: "bg-slate-200",
                dividerText: "text-slate-400",
                footerActionText: "text-slate-600",
                footerActionLink: "text-emerald-600 hover:text-emerald-500",
              },
            }}
          />
        </section>
      </div>
    </main>
  );
}
