"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function formatTimeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function AdminPage() {
  const stats = useQuery(api.adminMutations.getAdminStats);
  const upgradeTier = useMutation(api.adminMutations.updateRestaurantTier);

  if (stats === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-zinc-400">Active Clients</p>
          <p className="text-3xl font-bold">{stats.totalActiveClients}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-zinc-400">SMS Sent Today</p>
          <p className="text-3xl font-bold">{stats.totalSmsTodayCount}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-zinc-400">Google Conversion</p>
          <p className="text-3xl font-bold">{stats.googleConversionRate}%</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-zinc-400">Total MRR</p>
          <p className="text-3xl font-bold">
            ${stats.totalMRR.toLocaleString()}
          </p>
        </div>
      </div>

      {stats.upsellAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-amber-400">
            ⚠️ Upsell Opportunities ({stats.upsellAlerts.length})
          </h2>
          {stats.upsellAlerts.map((r) => (
            <div
              key={r._id}
              className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-4"
            >
              <div className="flex-1">
                <p className="font-medium">{r.name}</p>
                <p className="text-sm text-zinc-400">
                  Tier {r.tier} — {r.smsUsed} / {r.smsLimit} SMS used
                </p>
                <div className="mt-2 h-2 w-48 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full bg-amber-400"
                    style={{
                      width: `${Math.min(100, (r.smsUsed / r.smsLimit) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <button
                onClick={() =>
                  upgradeTier({
                    restaurantId: r._id,
                    tier: Math.min(r.tier + 1, 3),
                  })
                }
                disabled={r.tier >= 3}
                className="ml-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50"
              >
                Upgrade to Tier {Math.min(r.tier + 1, 3)}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}