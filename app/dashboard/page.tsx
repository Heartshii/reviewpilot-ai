"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRestaurantId } from "@/hooks/useRestaurantId";

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  return (
    <span className="flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i}>
          {i < full ? "★" : i === full && hasHalf ? "½" : "☆"}
        </span>
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
      <div className="flex items-center justify-center py-12">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {stats.pendingApprovals > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                {stats.pendingApprovals}
              </span>
              <span className="ml-2">
                You have {stats.pendingApprovals} apologies waiting for approval
              </span>
            </div>
            <Link
              href="/dashboard/sms"
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              Review Now
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-zinc-400">Total Customers</p>
          <p className="text-2xl font-bold">{stats.totalCustomers}</p>
          {stats.customersChangeThisWeek > 0 && (
            <p className="text-xs text-emerald-400">
              +{stats.customersChangeThisWeek} this week
            </p>
          )}
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-zinc-400">SMS Sent This Month</p>
          <p className="text-2xl font-bold">
            {stats.smsSentThisMonth} / {stats.smsLimit}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-blue-500"
              style={{
                width: `${Math.min(100, (stats.smsSentThisMonth / stats.smsLimit) * 100)}%`,
              }}
            />
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-zinc-400">Avg Rating This Week</p>
          <p className="text-2xl font-bold">
            {stats.avgRatingThisWeek > 0 ? (
              <Stars rating={stats.avgRatingThisWeek} />
            ) : (
              "—"
            )}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-zinc-400">Google Links Sent</p>
          <p className="text-2xl font-bold">{stats.googleLinksClicked}</p>
          <p className="text-xs text-zinc-500">Est. reviews generated</p>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50">
        <h2 className="border-b border-zinc-800 px-4 py-3 font-semibold">
          Recent Activity
        </h2>
        <div className="divide-y divide-zinc-800">
          {activity.length === 0 ? (
            <p className="p-4 text-zinc-500">No activity yet</p>
          ) : (
            activity.map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <span className="font-medium">{item.customerName}</span>
                  <span
                    className={`ml-2 rounded px-2 py-0.5 text-xs ${
                      typeColors[item.smsType] ?? "bg-zinc-600/20"
                    }`}
                  >
                    {item.smsType.replace("_", " ")}
                  </span>
                </div>
                <span className="text-sm text-zinc-500">
                  {formatTimeAgo(item.sentAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
