"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useRef, useState } from "react";

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

// ── Glow card with mouse-follow emerald effect ──────────
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
      className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all duration-300 hover:border-emerald-500/20 hover:bg-white/[0.04] ${href ? "cursor-pointer" : ""} ${className}`}
    >
      {/* Mouse-follow glow */}
      <div
        className="pointer-events-none absolute transition-opacity duration-300"
        style={{
          left: glow.x - 80,
          top: glow.y - 80,
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)",
          opacity: glow.opacity,
        }}
      />
      {/* Bottom border sweep on hover */}
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

  if (!restaurantId) return null;
  if (stats === undefined || activity === undefined) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-emerald-500/60" />
          <p className="text-xs text-white/20">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-light tracking-tight text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-white/30">Your restaurant performance at a glance</p>
      </div>

      {/* Pending approvals alert */}
      {stats.pendingApprovals > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
            <span className="text-sm text-red-300">
              <span className="font-semibold">{stats.pendingApprovals}</span> apolog{stats.pendingApprovals === 1 ? "y" : "ies"} waiting for your approval
            </span>
          </div>
          <Link
            href="/dashboard/sms"
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-1.5 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20"
          >
            Review Now →
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Customers */}
        <GlowCard href="/dashboard/customers">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-white/30">Total Customers</p>
            <span className="text-xs text-emerald-500/50 opacity-0 transition-opacity group-hover:opacity-100">
              View all →
            </span>
          </div>
          <p className="mt-3 text-4xl font-light tabular-nums text-white">{stats.totalCustomers}</p>
          {stats.customersChangeThisWeek > 0 && (
            <p className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
              <span>↑</span> +{stats.customersChangeThisWeek} this week
            </p>
          )}
        </GlowCard>

        {/* SMS Sent */}
        <GlowCard href="/dashboard/sms">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-white/30">SMS This Month</p>
            <span className="text-xs text-emerald-500/50 opacity-0 transition-opacity group-hover:opacity-100">
              History →
            </span>
          </div>
          <p className="mt-3 text-4xl font-light tabular-nums text-white">
            {stats.smsSentThisMonth}
            <span className="ml-1 text-lg text-white/20">/ {stats.smsLimit}</span>
          </p>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-emerald-500/60 transition-all"
              style={{ width: `${Math.min(100, (stats.smsSentThisMonth / stats.smsLimit) * 100)}%` }}
            />
          </div>
        </GlowCard>

        {/* Avg Rating */}
        <GlowCard href="/dashboard/customers">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-white/30">Avg Rating</p>
            <span className="text-xs text-emerald-500/50 opacity-0 transition-opacity group-hover:opacity-100">
              See history →
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
              <p className="text-4xl font-light text-white/20">—</p>
            )}
          </div>
          <p className="mt-1 text-xs text-white/20">This week</p>
        </GlowCard>

        {/* Google Links */}
        <GlowCard href="/dashboard/sms">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-white/30">Google Links</p>
            <span className="text-xs text-emerald-500/50 opacity-0 transition-opacity group-hover:opacity-100">
              History →
            </span>
          </div>
          <p className="mt-3 text-4xl font-light tabular-nums text-emerald-400">{stats.googleLinksClicked}</p>
          <p className="mt-2 text-xs text-white/20">Est. reviews generated</p>
        </GlowCard>
      </div>

      {/* Recent Activity */}
      <GlowCard>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-white/70">Recent Activity</p>
          <Link
            href="/dashboard/sms"
            className="text-xs text-emerald-500/50 transition-colors hover:text-emerald-400"
          >
            View all →
          </Link>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {activity.length === 0 ? (
            <div className="py-8 text-center text-sm text-white/20">No activity yet</div>
          ) : (
            activity.map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between py-3 transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                  <span className="text-sm font-medium text-white/80">{item.customerName}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs ${typeColors[item.smsType] ?? "bg-zinc-600/20"}`}>
                    {item.smsType.replace("_", " ")}
                  </span>
                </div>
                <span className="text-xs text-white/20">{formatTimeAgo(item.sentAt)}</span>
              </div>
            ))
          )}
        </div>
      </GlowCard>
    </div>
  );
}