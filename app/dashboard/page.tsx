"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { CustomerDrawer } from "@/components/CustomerDrawer";
import type { Id } from "@/convex/_generated/dataModel";

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  return (
    <span className="flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i}>{i < full ? "★" : i === full && hasHalf ? "½" : "☆"}</span>
      ))}
    </span>
  );
}

function formatTimeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
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
  className = "",
  href,
}: {
  children: React.ReactNode;
  className?: string;
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

  const handleMouseLeave = () => setGlow((g) => ({ ...g, opacity: 0 }));

  const inner = (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`dashboard-surface group relative overflow-hidden rounded-[1.75rem] p-6 transition-all duration-300 hover:border-emerald-500/20 hover:bg-white/[0.04] ${href ? "cursor-pointer" : ""} ${className}`}
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

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }

  return inner;
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
  const [showAllActivity, setShowAllActivity] = useState(false);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-white/30">
          Your restaurant performance at a glance
        </p>
      </div>

      {stats.pendingApprovals > 0 && (
        <div className="dashboard-surface flex items-center justify-between rounded-[1.75rem] border-red-500/20 bg-red-500/6 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
            <span className="text-sm text-red-300">
              <span className="font-semibold">{stats.pendingApprovals}</span>{" "}
              {stats.pendingApprovals === 1
                ? "apology is waiting for approval"
                : "apologies are waiting for approval"}
            </span>
          </div>
          <Link
            href="/dashboard/sms"
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20"
          >
            Review now
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GlowCard href="/dashboard/customers">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-white/30">
              Total Customers
            </p>
            <span className="text-xs text-emerald-500/50 opacity-0 transition-opacity group-hover:opacity-100">
              View all
            </span>
          </div>
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
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-white/30">
              SMS This Month
            </p>
            <span className="text-xs text-emerald-500/50 opacity-0 transition-opacity group-hover:opacity-100">
              History
            </span>
          </div>
          <p className="mt-3 text-4xl font-light tabular-nums text-white">
            {stats.smsSentThisMonth}
            <span className="ml-1 text-lg text-white/20">/ {stats.smsLimit}</span>
          </p>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-emerald-500/60 transition-all"
              style={{
                width: `${Math.min(
                  100,
                  (stats.smsSentThisMonth / stats.smsLimit) * 100
                )}%`,
              }}
            />
          </div>
        </GlowCard>

        <GlowCard href="/dashboard/customers">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-white/30">
              Avg Rating
            </p>
            <span className="text-xs text-emerald-500/50 opacity-0 transition-opacity group-hover:opacity-100">
              See history
            </span>
          </div>
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

        <GlowCard href="/dashboard/sms">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-white/30">
              Google Links
            </p>
            <span className="text-xs text-emerald-500/50 opacity-0 transition-opacity group-hover:opacity-100">
              History
            </span>
          </div>
          <p className="mt-3 text-4xl font-light tabular-nums text-emerald-400">
            {stats.googleLinksClicked}
          </p>
          <p className="mt-2 text-xs text-white/20">Estimated reviews generated</p>
        </GlowCard>
      </div>

      {/* Analytics Charts Section */}
      <div className="dashboard-surface rounded-[1.75rem] p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Performance Analytics</h3>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-white/70 mb-4">Key Metrics</h4>
            <div className="space-y-4">
              {[
                { label: "Customer Growth Rate", value: stats.customersChangeThisWeek > 0 ? `+${stats.customersChangeThisWeek} this week` : "No new customers", color: "text-emerald-400" },
                { label: "SMS Usage", value: `${stats.smsSentThisMonth}/${stats.smsLimit} this month`, color: "text-blue-400" },
                { label: "Review Generation", value: `${stats.googleLinksClicked} Google review links sent`, color: "text-amber-400" },
                { label: "Pending Actions", value: `${stats.pendingApprovals} messages need approval`, color: stats.pendingApprovals > 0 ? "text-red-400" : "text-white/60" },
              ].map((metric) => (
                <div key={metric.label} className="flex items-center justify-between py-2">
                  <span className="text-sm text-white/60">{metric.label}</span>
                  <span className={`text-sm font-medium ${metric.color}`}>{metric.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-white/70 mb-4">Rating Trend</h4>
            <div className="flex items-center justify-center py-8">
              {stats.avgRatingThisWeek > 0 ? (
                <div className="text-center">
                  <div className="text-6xl font-light text-white mb-2">
                    {stats.avgRatingThisWeek.toFixed(1)}
                  </div>
                  <div className="flex justify-center mb-2">
                    <Stars rating={stats.avgRatingThisWeek} />
                  </div>
                  <p className="text-sm text-white/60">Average rating this week</p>
                </div>
              ) : (
                <div className="text-center text-white/40">
                  <div className="text-4xl mb-2">⭐</div>
                  <p className="text-sm">No ratings yet this week</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <GlowCard>
        <div className="mb-4 flex items-center justify-between">
          <p 
            className="text-sm font-medium text-white/70 cursor-pointer hover:text-white/90"
            onClick={() => setShowAllActivity(!showAllActivity)}
          >
            Recent Activity {activity.length > 6 && !showAllActivity ? `(showing 6 of ${activity.length})` : ''}
          </p>
          <Link
            href="/dashboard/sms"
            className="text-xs text-emerald-500/50 hover:text-emerald-400"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {activity.length === 0 ? (
            <div className="py-8 text-center text-sm text-white/20">
              No activity yet
            </div>
          ) : (
            (showAllActivity ? activity : activity.slice(0, 6)).map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between py-3 transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
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
                </div>
                <span className="text-xs text-white/20">
                  {formatTimeAgo(item.sentAt)}
                </span>
              </div>
            ))
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
              .slice(0, 10)
              .map((customer) => (
                <div
                  key={customer._id}
                  className="flex items-center justify-between py-3 transition-colors hover:bg-white/[0.02] cursor-pointer"
                  onClick={() => setDrawerId(customer._id)}
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
                    <span className="text-sm font-medium text-emerald-400">
                      {customer.points} pts
                    </span>
                    <p className="text-xs text-white/20">
                      {customer.lastVisitAt ? formatTimeAgo(customer.lastVisitAt) : "Never"}
                    </p>
                  </div>
                </div>
              ))
          )}
        </div>
      </GlowCard>

      {drawerId && customers && (
        <CustomerDrawer
          customer={customers.find((c) => c._id === drawerId)!}
          smsHistory={smsHistory ?? []}
          receiptHistory={receiptHistory ?? []}
          restaurantId={restaurantId!}
          onClose={() => setDrawerId(null)}
        />
      )}
    </div>
  );
}
