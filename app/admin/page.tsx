"use client";

import Link from "next/link";
import { useRef, useState, type ComponentProps } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AppIcon, IconBadge } from "@/components/ui/premium-icon";

type UpsellAlert = {
  _id: Id<"restaurants">;
  name: string;
  tier: number;
  smsUsed: number;
  smsLimit: number;
};

function StatCard({
  label,
  value,
  sub,
  accent = false,
  prefix = "",
  suffix = "",
  icon,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
  prefix?: string;
  suffix?: string;
  icon: ComponentProps<typeof AppIcon>["name"];
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [glow, setGlow] = useState({ x: 0, y: 0, opacity: 0 });

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setGlow({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      opacity: 1,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setGlow((current) => ({ ...current, opacity: 0 }))}
      className="group relative overflow-hidden rounded-[1.9rem] border border-white/6 bg-white/[0.03] p-6 transition-all duration-300 hover:border-emerald-500/16 hover:bg-white/[0.05]"
    >
      {accent ? (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/6 to-transparent" />
      ) : null}
      <div
        className="pointer-events-none absolute transition-opacity duration-300"
        style={{
          left: glow.x - 90,
          top: glow.y - 90,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(16,185,129,0.13) 0%, transparent 70%)",
          opacity: glow.opacity,
        }}
      />
      <div className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-emerald-500/40 transition-transform duration-500 group-hover:scale-x-100" />
      <div className="mb-4 flex items-center gap-3">
        <IconBadge
          name={icon}
          className={`h-11 w-11 ${
            accent
              ? "border-emerald-400/18 bg-[linear-gradient(180deg,rgba(52,211,153,0.14),rgba(76,201,240,0.06))] text-emerald-100"
              : "border-white/10 bg-white/[0.04] text-white/70"
          }`}
          iconClassName="h-[18px] w-[18px]"
        />
        <p className="text-xs font-medium uppercase tracking-widest text-white/30">
          {label}
        </p>
      </div>
      <p
        className={`text-4xl font-light tabular-nums tracking-tight ${
          accent ? "text-emerald-400" : "text-white"
        }`}
      >
        {prefix}
        {typeof value === "number" ? value.toLocaleString() : value}
        {suffix}
      </p>
      {sub ? <p className="mt-2 text-xs text-white/30">{sub}</p> : null}
    </div>
  );
}

export default function AdminPage() {
  const { user } = useUser();
  const stats = useQuery(api.adminMutations.getAdminStats);
  const auditLogs = useQuery(api.adminMutations.getRecentAdminAuditLogs);
  type AuditLogRow = NonNullable<typeof auditLogs>[number];
  const upgradeTier = useMutation(api.adminMutations.updateRestaurantTier);
  const actorEmail =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress;

  if (stats === undefined) {
    return (
      <div suppressHydrationWarning className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-emerald-500/60" />
          <p className="text-xs text-white/20">Loading platform data...</p>
        </div>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="space-y-8">
      <section className="overflow-hidden rounded-[2.25rem] border border-white/6 bg-[linear-gradient(135deg,rgba(5,150,105,0.12),rgba(8,17,29,0.94)_34%,rgba(8,17,29,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/18 bg-emerald-300/10 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-emerald-100/80">
              <AppIcon name="shield" className="h-3.5 w-3.5" />
              Platform command center
            </div>
            <div>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Support every client, control platform growth, and see billing risk before it becomes churn.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
                The admin workspace should feel like an operator console, not a
                spreadsheet. Use it to enter client support mode, watch revenue
                movement, and steer the whole product with confidence.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/clients"
                className="rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-4 py-3 text-sm font-semibold text-slate-950"
              >
                Open support board
              </Link>
              <Link
                href="/admin/settings"
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/80 transition hover:bg-white/[0.08]"
              >
                Platform defaults
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                eyebrow: "Revenue",
                label: "Monthly recurring revenue",
                value: `$${stats.totalMRR.toLocaleString()}`,
                note: `${stats.annualClients} annual clients boosting retention`,
                icon: "billing" as const,
              },
              {
                eyebrow: "Clients",
                label: "Active clients",
                value: stats.totalActiveClients,
                note: `${stats.trialingClients} still trialing`,
                icon: "customers" as const,
              },
              {
                eyebrow: "Risk",
                label: "Billing watchlist",
                value: stats.pastDueClients,
                note: "Accounts needing intervention",
                icon: "alert" as const,
              },
              {
                eyebrow: "Reviews",
                label: "Review funnel",
                value: `${stats.googleConversionRate}%`,
                note: `${stats.totalSmsTodayCount} SMS sent today`,
                icon: "reviews" as const,
              },
            ].map((card) => (
              <div
                key={card.label}
                className="flex min-h-[13.5rem] flex-col rounded-[1.8rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-5 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 max-w-[13rem]">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/28">
                      {card.eyebrow}
                    </p>
                    <p className="mt-3 font-display text-[1.05rem] font-medium leading-6 tracking-[-0.03em] text-white/94">
                      {card.label}
                    </p>
                  </div>
                  <IconBadge
                    name={card.icon}
                    className="h-11 w-11 shrink-0 border-white/10 bg-white/[0.04] text-white/75"
                    iconClassName="h-[18px] w-[18px]"
                  />
                </div>
                <p className="mt-8 font-display text-[2rem] font-semibold leading-none tracking-[-0.04em] text-white">
                  {card.value}
                </p>
                <p className="mt-auto pt-4 text-sm leading-6 text-white/42">{card.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Clients"
          value={stats.totalActiveClients}
          accent
          icon="customers"
        />
        <StatCard
          label="SMS Sent Today"
          value={stats.totalSmsTodayCount}
          sub="Across all client workspaces"
          icon="message"
        />
        <StatCard
          label="Google Conversion"
          value={stats.googleConversionRate}
          suffix="%"
          sub="Welcome to review rate"
          icon="reviews"
        />
        <StatCard
          label="Monthly Revenue"
          value={stats.totalMRR.toLocaleString()}
          prefix="$"
          sub="Estimated MRR"
          accent
          icon="billing"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-white/30">
                Support priorities
              </p>
              <p className="mt-1 text-sm text-white/42">
                The client situations most likely to need your attention right now.
              </p>
            </div>
            <Link
              href="/admin/clients"
              className="text-sm text-emerald-200/80 transition hover:text-emerald-100"
            >
              Open support board
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.75rem] border border-amber-400/16 bg-amber-400/[0.05] p-5">
              <div className="flex items-center gap-3">
                <IconBadge
                  name="alert"
                  className="h-11 w-11 border-amber-300/18 bg-amber-400/12 text-amber-100"
                  iconClassName="h-[18px] w-[18px]"
                />
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                    Billing intervention
                  </p>
                  <p className="mt-1 text-sm text-white/45">
                    Accounts needing retry, outreach, or plan changes
                  </p>
                </div>
              </div>
              <p className="mt-4 text-3xl font-semibold text-white">
                {stats.pastDueClients}
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/8 bg-black/12 p-5">
              <div className="flex items-center gap-3">
                <IconBadge
                  name="clock"
                  className="h-11 w-11 border-white/10 bg-white/[0.04] text-white/72"
                  iconClassName="h-[18px] w-[18px]"
                />
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                    Trial conversion
                  </p>
                  <p className="mt-1 text-sm text-white/45">
                    Workspaces still inside onboarding and activation
                  </p>
                </div>
              </div>
              <p className="mt-4 text-3xl font-semibold text-white">
                {stats.trialingClients}
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/8 bg-black/12 p-5">
              <div className="flex items-center gap-3">
                <IconBadge
                  name="spark"
                  className="h-11 w-11 border-emerald-300/18 bg-emerald-400/12 text-emerald-100"
                  iconClassName="h-[18px] w-[18px]"
                />
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                    Premium AI adoption
                  </p>
                  <p className="mt-1 text-sm text-white/45">
                    Higher-value accounts using advanced AI features
                  </p>
                </div>
              </div>
              <p className="mt-4 text-3xl font-semibold text-white">
                {stats.premiumAiClients}
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/8 bg-black/12 p-5">
              <div className="flex items-center gap-3">
                <IconBadge
                  name="agency"
                  className="h-11 w-11 border-white/10 bg-white/[0.04] text-white/72"
                  iconClassName="h-[18px] w-[18px]"
                />
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                    Platform footprint
                  </p>
                  <p className="mt-1 text-sm text-white/45">
                    Customer and location scale across the platform
                  </p>
                </div>
              </div>
              <p className="mt-4 text-3xl font-semibold text-white">
                {stats.totalLocations}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-white/30">
                Revenue and footprint
              </p>
              <p className="mt-1 text-sm text-white/42">
                Value, scale, and retention quality across all workspaces.
              </p>
            </div>
            <Link
              href="/admin/settings"
              className="text-sm text-white/55 transition hover:text-white/82"
            >
              Edit platform defaults
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.75rem] border border-white/8 bg-black/12 p-5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/28">
                ARR
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                ${stats.totalARR.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-white/40">
                Annualized platform run-rate from active subscriptions
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-white/8 bg-black/12 p-5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/28">
                Customer records
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {stats.totalCustomers.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-white/40">
                End-customer profiles stored across all workspaces
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-white/8 bg-black/12 p-5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/28">
                Annual plans
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {stats.annualClients}
              </p>
              <p className="mt-2 text-xs text-white/40">
                Lower-churn accounts already committed to yearly billing
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-white/8 bg-black/12 p-5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/28">
                Upsell candidates
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {stats.upsellAlerts.length}
              </p>
              <p className="mt-2 text-xs text-white/40">
                Accounts approaching SMS ceilings and ready for expansion
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3">
            <IconBadge
              name="clock"
              className="h-11 w-11 border-white/10 bg-white/[0.04] text-white/72"
              iconClassName="h-[18px] w-[18px]"
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-white/30">
                Billing health
              </p>
              <p className="mt-1 text-sm text-white/42">
                Subscription and collection visibility
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/8 bg-black/12 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/28">
                Trialing
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {stats.trialingClients}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/12 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/28">
                Past due
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {stats.pastDueClients}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/12 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/28">
                Annual
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {stats.annualClients}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3">
            <IconBadge
              name="agency"
              className="h-11 w-11 border-white/10 bg-white/[0.04] text-white/72"
              iconClassName="h-[18px] w-[18px]"
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-white/30">
                Platform footprint
              </p>
              <p className="mt-1 text-sm text-white/42">
                Total customer and location volume
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/8 bg-black/12 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/28">
                Customers
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {stats.totalCustomers}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/12 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/28">
                Locations
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {stats.totalLocations}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3">
            <IconBadge
              name="spark"
              className="h-11 w-11 border-emerald-400/18 bg-[linear-gradient(180deg,rgba(52,211,153,0.14),rgba(76,201,240,0.06))] text-emerald-100"
              iconClassName="h-[18px] w-[18px]"
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-white/30">
                Expansion view
              </p>
              <p className="mt-1 text-sm text-white/42">
                Growth signals you can act on today
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/8 bg-black/12 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/28">
                Upsell alerts
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {stats.upsellAlerts.length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/12 px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/28">
                Premium AI
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {stats.premiumAiClients}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6">
          <div className="flex items-center gap-3">
            <IconBadge
              name="billing"
              className="h-11 w-11 border-white/10 bg-white/[0.04] text-white/72"
              iconClassName="h-[18px] w-[18px]"
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-white/30">
                Revenue run-rate
              </p>
              <p className="mt-1 text-sm text-white/42">
                Stripe invoice detail stays in Stripe, but billing risk is visible here
              </p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-white/8 bg-black/12 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/28">
              ARR
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              ${stats.totalARR.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {stats.upsellAlerts.length > 0 ? (
        <section className="rounded-[2rem] border border-amber-400/12 bg-amber-400/[0.04] p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-amber-200/80">
                Upsell opportunities
              </p>
              <p className="mt-1 text-sm text-white/45">
                Workspaces close to SMS ceilings and ready for plan expansion.
              </p>
            </div>
            <Link
              href="/admin/clients"
              className="text-sm text-amber-100/80 transition hover:text-amber-50"
            >
              Open support board
            </Link>
          </div>

          <div className="space-y-3">
            {stats.upsellAlerts.map((workspace: UpsellAlert) => {
              const percent = Math.min(
                100,
                Math.round((workspace.smsUsed / workspace.smsLimit) * 100)
              );

              return (
                <div
                  key={workspace._id}
                  className="flex flex-col gap-4 rounded-[1.75rem] border border-amber-400/12 bg-black/14 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-medium text-white">{workspace.name}</p>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/35">
                        Tier {workspace.tier}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <div className="h-1.5 w-56 overflow-hidden rounded-full bg-white/6">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="text-xs text-white/38">
                        {workspace.smsUsed} / {workspace.smsLimit} SMS ({percent}%)
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/admin/clients/${workspace._id}`}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/72 transition hover:bg-white/[0.08]"
                    >
                      Support console
                    </Link>
                    <button
                      onClick={() =>
                        upgradeTier({
                          restaurantId: workspace._id,
                          tier: Math.min(workspace.tier + 1, 3),
                          actorEmail,
                        })
                      }
                      disabled={workspace.tier >= 3}
                      className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-40"
                    >
                      Upgrade to Tier {Math.min(workspace.tier + 1, 3)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-6 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-white/60">
            <AppIcon name="shield" className="h-6 w-6" />
          </div>
          <p className="mt-2 text-sm text-white/30">
            All clients are within SMS limits
          </p>
        </div>
      )}

      <section className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-white">Admin audit timeline</h2>
            <p className="mt-1 text-sm text-white/30">
              Recent tier changes, status actions, credit adjustments, and workspace updates
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {(auditLogs ?? []).map((log: AuditLogRow) => (
            <div
              key={log._id}
              className="flex flex-col gap-2 rounded-[1.6rem] border border-white/6 bg-black/12 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm text-white">{log.summary}</p>
                <p className="mt-1 text-xs text-white/30">
                  {log.actorEmail ?? "system"}
                  {log.restaurantName ? ` • ${log.restaurantName}` : ""}
                </p>
              </div>
              <p className="text-xs text-white/25">
                {new Date(log.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
          {(auditLogs ?? []).length === 0 ? (
            <p className="text-sm text-white/30">No admin actions logged yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
