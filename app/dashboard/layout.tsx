"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton, useAuth } from "@clerk/nextjs";
import { useEnsureUser } from "@/hooks/useEnsureUser";
import { useRestaurantId } from "@/hooks/useRestaurantId";

const nav = [
  { href: "/dashboard", label: "Overview", badge: "OV" },
  { href: "/dashboard/customers", label: "Customers", badge: "CU" },
  { href: "/dashboard/reviews", label: "Reviews", badge: "RV" },
  { href: "/dashboard/sms", label: "SMS Center", badge: "SM" },
  { href: "/dashboard/billing", label: "Billing", badge: "BI" },
  { href: "/dashboard/settings", label: "Settings", badge: "SE" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const restaurantId = useRestaurantId();
  const { userId } = useAuth();
  const { convexUser, isLoading } = useEnsureUser();

  if (userId && (isLoading || convexUser === undefined)) {
    return (
      <div
        suppressHydrationWarning={true}
        className="flex min-h-screen items-center justify-center bg-transparent text-white"
      >
        <p className="text-zinc-400">Loading workspace...</p>
      </div>
    );
  }

  if (userId && convexUser && !restaurantId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent px-6 text-white">
        <div className="w-full max-w-xl rounded-[2rem] border border-white/8 bg-white/[0.03] p-8 text-center backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.16em] text-white/30">
            Setup required
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-white">
            Finish creating your business workspace
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/58">
            Your account is signed in, but it is not attached to a business
            workspace yet. Complete onboarding first, then come back to the
            dashboard.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/setup"
              className="rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-5 py-3 text-sm font-semibold text-slate-950"
            >
              Open setup
            </Link>
            <Link
              href="/"
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm text-white/72"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!userId && !restaurantId) {
    return (
      <div
        suppressHydrationWarning={true}
        className="flex min-h-screen items-center justify-center bg-transparent text-white"
      >
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-white/6 bg-[#07111d]/82 px-4 py-4 backdrop-blur-xl lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="dashboard-surface rounded-[1.75rem] p-4">
          <div className="border-b border-white/6 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] text-sm font-semibold text-slate-950">
                RP
              </div>
              <div>
                <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-white/90">
                  ReviewPilot
                </p>
                <p className="text-xs text-white/35">Client workspace</p>
              </div>
            </div>
          </div>

          <nav className="mt-4 space-y-2">
            {nav.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all ${
                    active
                      ? "bg-white/8 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                      : "text-white/50 hover:bg-white/5 hover:text-white/80"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border text-[11px] font-semibold tracking-[0.14em] ${
                      active
                        ? "border-emerald-300/30 bg-emerald-300/12 text-emerald-200"
                        : "border-white/8 bg-white/4 text-white/35"
                    }`}
                  >
                    {item.badge}
                  </span>
                  <span>{item.label}</span>
                  {active && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-emerald-300" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-2xl border border-white/7 bg-white/4 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/30">
              Daily focus
            </p>
              <p className="mt-2 text-sm leading-7 text-white/58">
                Check approvals, monitor SMS usage, review customer activity, and
                stay on top of billing from one place.
              </p>
          </div>

          <div className="mt-4 border-t border-white/6 pt-4">
            <SignOutButton>
              <button className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white/60 hover:bg-white/7 hover:text-white">
                Sign out
                <span className="text-white/30">Exit</span>
              </button>
            </SignOutButton>
          </div>
        </div>
      </aside>

      <main className="min-w-0">
        <div className="sticky top-0 z-20 border-b border-white/6 bg-[#08111d]/62 px-5 py-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                ReviewPilot workspace
              </p>
              <p className="mt-1 text-sm text-white/52">
                A calmer place to manage review growth, recovery, retention, and
                billing
              </p>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs text-emerald-200 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Live data
            </div>
          </div>
        </div>

        <div className="px-5 py-6 sm:px-6">{children}</div>
      </main>
    </div>
  );
}
