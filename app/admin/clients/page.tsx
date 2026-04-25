"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const tierLabels: Record<number, { label: string; color: string }> = {
  1: { label: "Starter", color: "text-zinc-400 border-zinc-700 bg-zinc-800/50" },
  2: { label: "Growth",  color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
  3: { label: "Scale",   color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
};

export default function AdminClientsPage() {
  const restaurants = useQuery(api.adminMutations.getAllRestaurants);
  const updateTier   = useMutation(api.adminMutations.updateRestaurantTier);
  const toggleActive = useMutation(api.adminMutations.toggleRestaurantActive);
  const addCredits   = useMutation(api.adminMutations.addSmsCredits);
  const createRestaurant = useMutation(api.adminMutations.createRestaurant);

  const [showAdd, setShowAdd] = useState(false);
  const [creditInputs, setCreditInputs] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "", slug: "", ownerEmail: "",
    googleBusinessUrl: "", twilioNumber: "", tier: 1,
  });

  const handleCreate = async () => {
    if (!form.name || !form.slug || !form.ownerEmail) return;
    await createRestaurant({
      name: form.name, slug: form.slug, ownerEmail: form.ownerEmail,
      googleBusinessUrl: form.googleBusinessUrl || undefined,
      twilioNumber: form.twilioNumber || undefined,
      tier: form.tier,
    });
    setShowAdd(false);
    setForm({ name: "", slug: "", ownerEmail: "", googleBusinessUrl: "", twilioNumber: "", tier: 1 });
  };

  const filtered = (restaurants ?? []).filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.ownerEmail.toLowerCase().includes(search.toLowerCase())
  );

  if (restaurants === undefined) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-emerald-500/60" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-white">Clients</h1>
          <p className="mt-1 text-sm text-white/30">{restaurants.length} restaurants on platform</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/20"
        >
          <span className="text-lg leading-none">+</span> Add Client
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
          <h2 className="mb-5 text-sm font-medium uppercase tracking-widest text-white/40">New Restaurant</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { key: "name", label: "Restaurant Name" },
              { key: "slug", label: "Slug" },
              { key: "ownerEmail", label: "Owner Email" },
              { key: "googleBusinessUrl", label: "Google Business URL" },
              { key: "twilioNumber", label: "Twilio Number" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="mb-1.5 block text-xs text-white/30">{label}</label>
                <input
                  type="text"
                  value={form[key as keyof typeof form] as string}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder-white/20 focus:border-white/15 focus:bg-white/8"
                />
              </div>
            ))}
            <div>
              <label className="mb-1.5 block text-xs text-white/30">Tier</label>
              <select
                value={form.tier}
                onChange={(e) => setForm((f) => ({ ...f, tier: Number(e.target.value) }))}
                className="w-full rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"
              >
                <option value={1}>Tier 1 — Starter · $49/mo</option>
                <option value={2}>Tier 2 — Growth · $99/mo</option>
                <option value={3}>Tier 3 — Scale · $179/mo</option>
              </select>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={handleCreate}
              className="rounded-xl bg-emerald-500/20 px-5 py-2.5 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/30"
            >
              Create Client
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="rounded-xl border border-white/8 px-5 py-2.5 text-sm text-white/40 transition-all hover:text-white/70"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">⌕</span>
        <input
          type="text"
          placeholder="Search clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/8 bg-white/[0.02] py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder-white/20 focus:border-white/15"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/5">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              {["Restaurant","Owner","Tier","SMS Usage","Customers","Status","Actions"].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-widest text-white/20">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const pct = r.smsLimit > 0 ? Math.min(100, Math.round((r.smsUsed / r.smsLimit) * 100)) : 0;
              const tier = tierLabels[r.tier] ?? tierLabels[1];
              return (
                <tr
                  key={r._id}
                  className={`border-b border-white/[0.03] transition-colors hover:bg-white/[0.02] ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${r.active ? "bg-emerald-400" : "bg-red-400/50"}`} />
                      <span className="font-medium text-white">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-white/40">{r.ownerEmail}</td>
                  <td className="px-5 py-4">
                    <select
                      value={r.tier}
                      onChange={(e) => updateTier({ restaurantId: r._id as Id<"restaurants">, tier: Number(e.target.value) })}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium outline-none ${tier.color} bg-transparent`}
                    >
                      <option value={1}>Starter</option>
                      <option value={2}>Growth</option>
                      <option value={3}>Scale</option>
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <div className="h-1 w-28 overflow-hidden rounded-full bg-white/5">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-amber-400" : "bg-emerald-500/60"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/30">{r.smsUsed}/{r.smsLimit}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-white/60">{r.customerCount}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${r.active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                      {r.active ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive({ restaurantId: r._id as Id<"restaurants"> })}
                        className="rounded-lg border border-white/8 px-3 py-1.5 text-xs text-white/40 transition-all hover:border-white/15 hover:text-white/70"
                      >
                        {r.active ? "Suspend" : "Activate"}
                      </button>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          placeholder="SMS"
                          value={creditInputs[r._id] ?? ""}
                          onChange={(e) => setCreditInputs((p) => ({ ...p, [r._id]: e.target.value }))}
                          className="w-14 rounded-lg border border-white/8 bg-white/5 px-2 py-1.5 text-xs text-white outline-none"
                        />
                        <button
                          onClick={() => {
                            const credits = parseInt(creditInputs[r._id] ?? "0");
                            if (credits > 0) {
                              addCredits({ restaurantId: r._id as Id<"restaurants">, credits });
                              setCreditInputs((p) => ({ ...p, [r._id]: "" }));
                            }
                          }}
                          className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 transition-all hover:bg-blue-500/20"
                        >
                          +SMS
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-white/20">No clients found</div>
        )}
      </div>
    </div>
  );
}