"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function StatCard({
  label,
  value,
  sub,
  accent = false,
  prefix = "",
  suffix = "",
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]">
      {accent && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
      )}
      <p className="mb-3 text-xs font-medium uppercase tracking-widest text-white/30">{label}</p>
      <p className={`text-4xl font-light tabular-nums tracking-tight ${accent ? "text-emerald-400" : "text-white"}`}>
        {prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}
      </p>
      {sub && <p className="mt-2 text-xs text-white/30">{sub}</p>}
      <div className={`absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100 ${accent ? "bg-emerald-500/40" : "bg-white/10"}`} />
    </div>
  );
}

export default function AdminPage() {
  const stats = useQuery(api.adminMutations.getAdminStats);
  const upgradeTier = useMutation(api.adminMutations.updateRestaurantTier);

  if (stats === undefined) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-emerald-500/60" />
          <p className="text-xs text-white/20">Loading platform data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-light tracking-tight text-white">Platform Overview</h1>
        <p className="mt-1 text-sm text-white/30">Real-time metrics across all restaurant clients</p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Clients" value={stats.totalActiveClients} accent />
        <StatCard label="SMS Sent Today" value={stats.totalSmsTodayCount} sub="across all restaurants" />
        <StatCard
          label="Google Conversion"
          value={stats.googleConversionRate}
          suffix="%"
          sub="welcome → review rate"
        />
        <StatCard
          label="Monthly Revenue"
          value={stats.totalMRR.toLocaleString()}
          prefix="$"
          sub="estimated MRR"
          accent
        />
      </div>

      {/* Upsell alerts */}
      {stats.upsellAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/5" />
            <p className="text-xs uppercase tracking-widest text-amber-400/70">
              ⚠ Upsell Opportunities — {stats.upsellAlerts.length}
            </p>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          <div className="space-y-2">
            {stats.upsellAlerts.map((r) => {
              const pct = Math.min(100, Math.round((r.smsUsed / r.smsLimit) * 100));
              return (
                <div
                  key={r._id}
                  className="group flex items-center gap-6 rounded-2xl border border-amber-500/10 bg-amber-500/[0.03] px-6 py-4 transition-all hover:border-amber-500/20 hover:bg-amber-500/[0.06]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-white">{r.name}</p>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/30">
                        Tier {r.tier}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-white/30">{r.smsUsed} / {r.smsLimit} SMS ({pct}%)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => upgradeTier({ restaurantId: r._id, tier: Math.min(r.tier + 1, 3) })}
                    disabled={r.tier >= 3}
                    className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-400 transition-all hover:bg-amber-500/20 disabled:opacity-30"
                  >
                    Upgrade → Tier {Math.min(r.tier + 1, 3)}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty upsell state */}
      {stats.upsellAlerts.length === 0 && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-6 py-10 text-center">
          <p className="text-2xl">✦</p>
          <p className="mt-2 text-sm text-white/30">All clients within SMS limits</p>
        </div>
      )}
    </div>
  );
}