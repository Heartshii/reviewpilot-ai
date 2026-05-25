"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SignOutButton, useAuth } from "@clerk/nextjs";
import { useEnsureUser } from "@/hooks/useEnsureUser";
import { useE2ESession } from "@/hooks/useE2ESession";
import { useMutation, useQuery } from "convex/react";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  canAccessAgency,
  canAccessBilling,
  canAccessSettings,
} from "@/lib/permissions";
import { LocationScopeProvider, useLocationScope } from "@/hooks/useLocationScope";
import { AppIcon, IconBadge } from "@/components/ui/premium-icon";

const navGroups = [
  {
    title: "Workspace",
    items: [
      { href: "/dashboard", label: "Overview", icon: "overview" },
      { href: "/dashboard/customers", label: "Customers", icon: "customers" },
      { href: "/dashboard/reviews", label: "Reviews", icon: "reviews" },
      { href: "/dashboard/loyalty", label: "Loyalty", icon: "loyalty" },
    ],
  },
  {
    title: "Growth",
    items: [
      { href: "/dashboard/sms", label: "SMS Center", icon: "sms" },
      { href: "/dashboard/widget", label: "Widget", icon: "widget" },
      { href: "/dashboard/leaderboard", label: "Leaderboard", icon: "leaderboard" },
      { href: "/dashboard/competitors", label: "Competitors", icon: "competitors" },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/dashboard/integrations", label: "Integrations", icon: "integrations" },
      { href: "/dashboard/agency", label: "Agency", icon: "agency" },
      { href: "/dashboard/billing", label: "Billing", icon: "billing" },
      { href: "/dashboard/settings", label: "Settings", icon: "settings" },
    ],
  },
] as const;

function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const restaurantId = useRestaurantId();
  const { userId } = useAuth();
  const { session: e2eSession, isLoaded: isE2ELoaded } = useE2ESession();
  const { convexUser, isLoading } = useEnsureUser();
  const ensureMonetizationDefaults = useMutation(
    api.billing.ensureRestaurantMonetizationDefaults
  );
  const locations = useQuery(
    api.queries.getLocationsForRestaurant,
    restaurantId ? { restaurantId } : "skip"
  );
  const supportRestaurant = useQuery(
    api.queries.getRestaurant,
    restaurantId ? { restaurantId } : "skip"
  );
  const activeUserId = userId ?? (isE2ELoaded ? e2eSession?.clerkId : null);
  const visibleNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.href === "/dashboard/billing") {
          return canAccessBilling(convexUser?.role);
        }
        if (item.href === "/dashboard/settings") {
          return canAccessSettings(convexUser?.role);
        }
        if (item.href === "/dashboard/agency") {
          return canAccessAgency(convexUser?.role);
        }
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  useEffect(() => {
    if (!restaurantId) {
      return;
    }

    void ensureMonetizationDefaults({ restaurantId });
  }, [ensureMonetizationDefaults, restaurantId]);

  if (activeUserId && (isLoading || convexUser === undefined)) {
    return (
      <div
        suppressHydrationWarning={true}
        className="flex min-h-screen items-center justify-center bg-transparent text-white"
      >
        <p className="text-zinc-400">Loading workspace...</p>
      </div>
    );
  }

  if (activeUserId && convexUser && !restaurantId) {
    if (convexUser.role === "SUPER_ADMIN") {
      return (
        <div className="flex min-h-screen items-center justify-center bg-transparent px-6 text-white">
          <div className="w-full max-w-2xl rounded-[2rem] border border-white/8 bg-white/[0.03] p-8 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.16em] text-white/30">
              Support mode required
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-white">
              Pick a client workspace before opening the dashboard
            </h1>
            <p className="mt-4 text-sm leading-7 text-white/58">
              Super admin accounts can jump into any client workspace, but you
              need to choose one first from the admin client list. Once you enter
              support mode, every dashboard page will operate against that client.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin/clients"
                className="rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-5 py-3 text-sm font-semibold text-slate-950"
              >
                Open client support list
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.sessionStorage.removeItem(
                      "reviewpilot-support-workspace"
                    );
                  }
                  router.replace("/admin");
                }}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm text-white/72"
              >
                Back to admin overview
              </button>
            </div>
          </div>
        </div>
      );
    }

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

  if (!activeUserId && !restaurantId) {
    return (
      <div
        suppressHydrationWarning={true}
        className="flex min-h-screen items-center justify-center bg-transparent text-white"
      >
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (restaurantId && locations === undefined) {
    return (
      <div
        suppressHydrationWarning={true}
        className="flex min-h-screen items-center justify-center bg-transparent text-white"
      >
        <p className="text-zinc-400">Loading workspace...</p>
      </div>
    );
  }

  return (
    <LocationScopeProvider restaurantId={restaurantId!} locations={locations ?? []}>
      <DashboardLayoutFrame
        pathname={pathname}
        visibleNavGroups={visibleNavGroups}
        userId={userId}
        isSupportMode={convexUser?.role === "SUPER_ADMIN"}
        supportRestaurantId={restaurantId ?? null}
        supportRestaurantName={supportRestaurant?.name ?? null}
      >
        {children}
      </DashboardLayoutFrame>
    </LocationScopeProvider>
  );
}

function DashboardLayoutFrame({
  children,
  pathname,
  visibleNavGroups,
  userId,
  isSupportMode,
  supportRestaurantId,
  supportRestaurantName,
}: {
  children: React.ReactNode;
  pathname: string;
  visibleNavGroups: Array<{
    title: string;
    items: ReadonlyArray<{
      href: string;
      label: string;
      icon:
        | "overview"
        | "customers"
        | "reviews"
        | "loyalty"
        | "sms"
        | "widget"
        | "leaderboard"
        | "competitors"
        | "integrations"
        | "agency"
        | "billing"
        | "settings";
    }>;
  }>;
  userId: string | null | undefined;
  isSupportMode: boolean;
  supportRestaurantId: Id<"restaurants"> | null;
  supportRestaurantName: string | null;
}) {
  const router = useRouter();
  const { locations, selectedLocationId, setSelectedLocationId } =
    useLocationScope();
  const supportSuffix =
    isSupportMode && supportRestaurantId
      ? `?supportRestaurantId=${supportRestaurantId}`
      : "";

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

          <nav className="mt-4 space-y-5">
            {visibleNavGroups.map((group) => (
              <div key={group.title}>
                <p className="px-3 text-[11px] uppercase tracking-[0.22em] text-white/25">
                  {group.title}
                </p>
                <div className="mt-2 space-y-2">
                  {group.items.map((item) => {
                    const active = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={`${item.href}${supportSuffix}`}
                        className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all ${
                          active
                            ? "bg-white/8 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                            : "text-white/50 hover:bg-white/5 hover:text-white/80"
                        }`}
                      >
                        <IconBadge
                          name={item.icon}
                          className={
                            active
                              ? "border-emerald-300/24 bg-[linear-gradient(180deg,rgba(52,211,153,0.16),rgba(76,201,240,0.08))] text-emerald-100"
                              : "text-white/42"
                          }
                          iconClassName="h-[18px] w-[18px]"
                        />
                        <span>{item.label}</span>
                        {active && (
                          <span className="ml-auto h-2 w-2 rounded-full bg-emerald-300" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-6 rounded-2xl border border-white/7 bg-white/4 p-4">
            <div className="flex items-start gap-3">
              <IconBadge
                name="spark"
                className="h-11 w-11 shrink-0 border-emerald-400/16 bg-[linear-gradient(180deg,rgba(52,211,153,0.14),rgba(76,201,240,0.06))] text-emerald-100"
                iconClassName="h-[18px] w-[18px]"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/30">
                  Daily focus
                </p>
                <p className="mt-2 text-sm leading-7 text-white/58">
                  Check approvals, monitor message usage, review customer activity,
                  and stay on top of billing from one place.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-white/6 pt-4">
            {userId ? (
              <SignOutButton>
                <button className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white/60 hover:bg-white/7 hover:text-white">
                  Sign out
                  <span className="text-white/30">Exit</span>
                </button>
              </SignOutButton>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/e2e/clear", { method: "POST" });
                  window.location.assign("/");
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white/60 hover:bg-white/7 hover:text-white"
              >
                End test session
                <span className="text-white/30">Exit</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      <main className="min-w-0">
        {isSupportMode && supportRestaurantId ? (
          <div className="border-b border-emerald-300/12 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(56,189,248,0.08))] px-5 py-3 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <IconBadge
                  name="shield"
                  className="h-10 w-10 border-emerald-300/20 bg-emerald-400/12 text-emerald-100"
                  iconClassName="h-[17px] w-[17px]"
                />
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-emerald-100/70">
                    Super admin support mode
                  </p>
                  <p className="mt-1 text-sm text-white/80">
                    You are operating inside{" "}
                    <span className="font-medium text-white">
                      {supportRestaurantName ?? "selected client workspace"}
                    </span>
                    .
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/admin/clients/${supportRestaurantId}`}
                  className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white/78 transition hover:bg-white/[0.1]"
                >
                  Open support console
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.sessionStorage.removeItem(
                        "reviewpilot-support-workspace"
                      );
                    }
                    router.replace("/admin/clients");
                  }}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/65 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Exit support mode
                </button>
              </div>
            </div>
          </div>
        ) : null}

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
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Link
                href={`/owner${supportSuffix}`}
                className="rounded-full border border-white/10 bg-white/4 px-3 py-2 text-xs font-medium text-white/65 transition-colors hover:bg-white/6 hover:text-white"
              >
                Owner hub
              </Link>
              <div className="hidden items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs text-emerald-200 sm:flex">
                <AppIcon name="live" className="h-3.5 w-3.5" strokeWidth={2} />
                Live data
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 px-3 py-2">
                <label className="block text-[10px] uppercase tracking-[0.16em] text-white/28">
                  Location scope
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) =>
                    setSelectedLocationId(
                      e.target.value === "ALL"
                        ? "ALL"
                        : (e.target.value as typeof locations[number]["_id"])
                    )
                  }
                  className="mt-1 min-w-[170px] rounded-xl border border-white/8 bg-[#08111d] px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="ALL">All locations</option>
                  {locations.map((location) => (
                    <option key={location._id} value={location._id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-6 sm:px-6">{children}</div>
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
