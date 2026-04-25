"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { CustomerDrawer } from "@/components/CustomerDrawer";
import type { Id } from "@/convex/_generated/dataModel";
import { useRestaurantId } from "@/hooks/useRestaurantId";

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  return (
    <span className="flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index}>
          {index < full ? "\u2605" : index === full && hasHalf ? "\u00BD" : "\u2606"}
        </span>
      ))}
    </span>
  );
}

function formatTimeAgo(ts: number) {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(ts).toLocaleDateString();
}

const typeColors: Record<string, string> = {
  GOOGLE_REVIEW: "bg-emerald-500/20 text-emerald-400",
  APOLOGY: "bg-amber-500/20 text-amber-400",
  WELCOME: "bg-blue-500/20 text-blue-400",
  BIRTHDAY: "bg-pink-500/20 text-pink-400",
  REENGAGEMENT: "bg-violet-500/20 text-violet-400",
  DEAL: "bg-zinc-500/20 text-zinc-400",
};

function GlowCard({
  children,
  href,
}: {
  children: React.ReactNode;
  href?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [glow, setGlow] = useState({ x: 0, y: 0, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setGlow({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      opacity: 1,
    });
  };

  const inner = (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setGlow((prev) => ({ ...prev, opacity: 0 }))}
      className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/20 hover:bg-white/[0.04] ${
        href ? "cursor-pointer" : ""
      }`}
    >
      <div
        className="pointer-events-none absolute transition-opacity duration-300"
        style={{
          left: glow.x - 80,
          top: glow.y - 80,
          width: 160,
          height: 160,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)",
          opacity: glow.opacity,
        }}
      />
      <div className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-emerald-500/40 transition-transform duration-500 group-hover:scale-x-100" />
      {children}
    </div>
  );

  if (!href) return inner;
  return <Link href={href}>{inner}</Link>;
}

export default function DashboardPage() {
  const restaurantId = useRestaurantId();
  const stats = useQuery(
    api.queries.getDashboardStats,
    restaurantId ? { restaurantId } : "skip"
  );
  const activity = useQuery(
    api.queries.getRecentActivity,
    restaurantId ? { restaurantId } : "skip"
  );
  const customers = useQuery(
    api.queries.getCustomers,
    restaurantId ? { restaurantId } : "skip"
  );
  const [drawerId, setDrawerId] = useState<Id<"customers"> | null>(null);
  const smsHistory = useQuery(
    api.queries.getCustomerSmsHistory,
    restaurantId && drawerId ? { restaurantId, customerId: drawerId } : "skip"
  );
  const receiptHistory = useQuery(
    api.queries.getCustomerReceiptHistory,
    restaurantId && drawerId ? { restaurantId, customerId: drawerId } : "skip"
  );

  if (!restaurantId) return null;

  if (stats === undefined || activity === undefined) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-emerald-500/60" />
          <p className="text-xs text-white/20">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const insights = [
    ...(stats.pendingApprovals > 0
      ? [
          {
            icon: "\u26A0",
            text: `${stats.pendingApprovals} customers had a negative experience this week`,
            tone: "border-red-500/20 bg-red-500/10 text-red-300",
          },
        ]
      : []),
    ...(stats.avgRatingThisWeek < 4 && stats.avgRatingThisWeek > 0
      ? [
          {
            icon: "\uD83D\uDCC9",
            text: `Rating dipped to ${stats.avgRatingThisWeek.toFixed(1)} \u2014 check recent feedback`,
            tone: "border-amber-500/20 bg-amber-500/10 text-amber-200",
          },
        ]
      : []),
    ...(stats.avgRatingThisWeek >= 4
      ? [
          {
            icon: "\u2726",
            text: `Strong week \u2014 ${stats.avgRatingThisWeek.toFixed(1)}\u2605 average rating`,
            tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
          },
        ]
      : []),
    ...(stats.customersChangeThisWeek > 0
      ? [
          {
            icon: "\u2191",
            text: `${stats.customersChangeThisWeek} new customers joined this week`,
            tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
          },
        ]
      : []),
    ...(stats.smsSentThisMonth > 0
      ? [
          {
            icon: "\uD83D\uDCF2",
            text: `${stats.smsSentThisMonth} SMS sent \u2014 review funnel is active`,
            tone: "border-blue-500/20 bg-blue-500/10 text-blue-300",
          },
        ]
      : []),
    {
      icon: "\uD83D\uDCA1",
      text: "Tip: Respond to negative feedback within 24hrs to recover the customer",
      tone: "border-white/10 bg-white/[0.04] text-white/70",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-white/30">
          Your restaurant performance at a glance
        </p>
      </div>

      {stats.pendingApprovals > 0 && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-red-300">
              <span className="font-semibold">{stats.pendingApprovals}</span>{" "}
              {stats.pendingApprovals === 1
                ? "apology is waiting for approval"
                : "apologies are waiting for approval"}
            </span>
            <Link
              href="/dashboard/reviews"
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-300"
            >
              Review now
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GlowCard href="/dashboard/customers">
          <p className="text-xs font-medium uppercase tracking-widest text-white/30">
            Total Customers
          </p>
          <p className="mt-3 text-4xl font-light tabular-nums text-white">
            {stats.totalCustomers}
          </p>
          {stats.customersChangeThisWeek > 0 && (
            <p className="mt-2 text-xs text-emerald-400">
              +{stats.customersChangeThisWeek} this week
            </p>
          )}
        </GlowCard>

        <GlowCard href="/dashboard/sms">
          <p className="text-xs font-medium uppercase tracking-widest text-white/30">
            SMS This Month
          </p>
          <p className="mt-3 text-4xl font-light tabular-nums text-white">
            {stats.smsSentThisMonth}
            <span className="ml-1 text-lg text-white/20">/ {stats.smsLimit}</span>
          </p>
        </GlowCard>

        <GlowCard href="/dashboard/reviews">
          <p className="text-xs font-medium uppercase tracking-widest text-white/30">
            Avg Rating
          </p>
          <div className="mt-3">
            {stats.avgRatingThisWeek > 0 ? (
              <>
                <p className="text-4xl font-light tabular-nums text-white">
                  {stats.avgRatingThisWeek.toFixed(1)}
                </p>
                <div className="mt-2">
                  <Stars rating={stats.avgRatingThisWeek} />
                </div>
              </>
            ) : (
              <p className="text-4xl font-light text-white/20">-</p>
            )}
          </div>
          <p className="mt-1 text-xs text-white/20">This week</p>
        </GlowCard>

        <GlowCard href="/dashboard/reviews">
          <p className="text-xs font-medium uppercase tracking-widest text-white/30">
            Google Links
          </p>
          <p className="mt-3 text-4xl font-light tabular-nums text-emerald-400">
            {stats.googleLinksClicked}
          </p>
          <p className="mt-2 text-xs text-white/20">Estimated reviews generated</p>
        </GlowCard>
      </div>

      <GlowCard>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            {"\u2726"}
          </div>
          <div>
            <p className="text-sm font-medium text-white/80">AI Insights</p>
            <p className="text-xs text-white/30">
              Live guidance derived from your current dashboard metrics
            </p>
          </div>
        </div>
        <div className="space-y-3 border-l-2 border-emerald-500/30 pl-4">
          {insights.map((insight) => (
            <div
              key={insight.text}
              className={`rounded-2xl border px-4 py-3 text-sm ${insight.tone}`}
            >
              <span className="mr-2">{insight.icon}</span>
              {insight.text}
            </div>
          ))}
        </div>
      </GlowCard>

      <GlowCard>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-white/70">Recent Activity</p>
          <Link
            href="/dashboard/sms"
            className="text-xs text-emerald-500/50 hover:text-emerald-400"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {activity.length === 0 ? (
            <div className="py-8 text-center text-sm text-white/20">No activity yet</div>
          ) : (
            activity.map((item) => {
              const isFailed = item.status === "FAILED";
              const rowContent = (
                <>
                  <div className="flex items-center gap-3">
                    <div className={`h-1.5 w-1.5 rounded-full ${isFailed ? "bg-red-400/70" : "bg-white/20"}`} />
                    <span className="text-sm font-medium text-white/80">
                      {item.customerName}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs ${
                        typeColors[item.smsType] ?? "bg-zinc-600/20"
                      }`}
                    >
                      {item.smsType.replace("_", " ")}
                    </span>
                    {isFailed && (
                      <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs text-red-300">
                        Failed
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-white/20">
                    {formatTimeAgo(item.sentAt)}
                  </span>
                </>
              );

              if (isFailed) {
                return (
                  <Link
                    key={item._id}
                    href="/dashboard/sms?tab=history&status=FAILED"
                    className="flex items-center justify-between py-3 transition-colors hover:bg-white/[0.02]"
                  >
                    {rowContent}
                  </Link>
                );
              }

              return (
                <div
                  key={item._id}
                  className="flex items-center justify-between py-3 transition-colors hover:bg-white/[0.02]"
                >
                  {rowContent}
                </div>
              );
            })
          )}
        </div>
      </GlowCard>

      <GlowCard>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-white/70">Recent Customers</p>
          <Link
            href="/dashboard/customers"
            className="text-xs text-emerald-500/50 hover:text-emerald-400"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {customers && customers.length === 0 ? (
            <div className="py-8 text-center text-sm text-white/20">
              No customers yet
            </div>
          ) : (
            (customers ?? [])
              .sort((a, b) => (b.lastVisitAt ?? 0) - (a.lastVisitAt ?? 0))
              .slice(0, 8)
              .map((customer) => (
                <button
                  key={customer._id}
                  type="button"
                  onClick={() => setDrawerId(customer._id)}
                  className="flex w-full items-center justify-between py-3 text-left transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                    <span className="text-sm font-medium text-white/80">
                      {customer.name}
                    </span>
                    <span className="text-xs text-white/30">
                      {customer.visitCount} visits
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-emerald-400">
                      {customer.points} pts
                    </p>
                    <p className="text-xs text-white/20">
                      {customer.lastVisitAt
                        ? formatTimeAgo(customer.lastVisitAt)
                        : "Never"}
                    </p>
                  </div>
                </button>
              ))
          )}
        </div>
      </GlowCard>

      {drawerId && customers && (
        <CustomerDrawer
          customer={customers.find((customer) => customer._id === drawerId)!}
          smsHistory={smsHistory ?? []}
          receiptHistory={receiptHistory ?? []}
          restaurantId={restaurantId}
          onClose={() => setDrawerId(null)}
          isLoadingSms={smsHistory === undefined}
          isLoadingReceipts={receiptHistory === undefined}
        />
      )}
    </div>
  );
}
