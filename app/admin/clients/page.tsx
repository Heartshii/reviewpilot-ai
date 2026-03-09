"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function AdminClientsPage() {
  const restaurants = useQuery(api.adminMutations.getAllRestaurants);
  const updateTier = useMutation(api.adminMutations.updateRestaurantTier);
  const toggleActive = useMutation(api.adminMutations.toggleRestaurantActive);
  const addCredits = useMutation(api.adminMutations.addSmsCredits);
  const createRestaurant = useMutation(api.adminMutations.createRestaurant);

  const [showAdd, setShowAdd] = useState(false);
  const [creditInputs, setCreditInputs] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    slug: "",
    ownerEmail: "",
    googleBusinessUrl: "",
    twilioNumber: "",
    tier: 1,
  });

  const handleCreate = async () => {
    if (!form.name || !form.slug || !form.ownerEmail) return;
    await createRestaurant({
      name: form.name,
      slug: form.slug,
      ownerEmail: form.ownerEmail,
      googleBusinessUrl: form.googleBusinessUrl || undefined,
      twilioNumber: form.twilioNumber || undefined,
      tier: form.tier,
    });
    setShowAdd(false);
    setForm({
      name: "",
      slug: "",
      ownerEmail: "",
      googleBusinessUrl: "",
      twilioNumber: "",
      tier: 1,
    });
  };

  if (restaurants === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clients</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400"
        >
          + Add Client
        </button>
      </div>

      {showAdd && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-6">
          <h2 className="mb-4 font-semibold">New Restaurant Client</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { key: "name", label: "Restaurant Name" },
              { key: "slug", label: "Slug (url-friendly)" },
              { key: "ownerEmail", label: "Owner Email" },
              { key: "googleBusinessUrl", label: "Google Business URL" },
              { key: "twilioNumber", label: "Twilio Number" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="mb-1 block text-sm text-zinc-400">
                  {label}
                </label>
                <input
                  type="text"
                  value={form[key as keyof typeof form] as string}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Tier</label>
              <select
                value={form.tier}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tier: Number(e.target.value) }))
                }
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
              >
                <option value={1}>Tier 1 — $49/mo</option>
                <option value={2}>Tier 2 — $99/mo</option>
                <option value={3}>Tier 3 — $179/mo</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleCreate}
              className="rounded bg-emerald-500 px-4 py-2 text-sm text-black hover:bg-emerald-400"
            >
              Create Client
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="rounded border border-zinc-600 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Restaurant</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Owner</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Tier</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">SMS</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Customers</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r) => (
              <tr key={r._id} className="border-b border-zinc-800 hover:bg-zinc-900/30">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-sm text-zinc-400">{r.ownerEmail}</td>
                <td className="px-4 py-3">
                  <select
                    value={r.tier}
                    onChange={(e) =>
                      updateTier({
                        restaurantId: r._id as Id<"restaurants">,
                        tier: Number(e.target.value),
                      })
                    }
                    className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm"
                  >
                    <option value={1}>Tier 1</option>
                    <option value={2}>Tier 2</option>
                    <option value={3}>Tier 3</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-sm">
                  {r.smsUsed} / {r.smsLimit}
                </td>
                <td className="px-4 py-3 text-sm">{r.customerCount}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      r.active
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {r.active ? "Active" : "Suspended"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        toggleActive({
                          restaurantId: r._id as Id<"restaurants">,
                        })
                      }
                      className="rounded border border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-800"
                    >
                      {r.active ? "Suspend" : "Activate"}
                    </button>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="Credits"
                        value={creditInputs[r._id] ?? ""}
                        onChange={(e) =>
                          setCreditInputs((prev) => ({
                            ...prev,
                            [r._id]: e.target.value,
                          }))
                        }
                        className="w-16 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => {
                          const credits = parseInt(creditInputs[r._id] ?? "0");
                          if (credits > 0) {
                            addCredits({
                              restaurantId: r._id as Id<"restaurants">,
                              credits,
                            });
                            setCreditInputs((prev) => ({
                              ...prev,
                              [r._id]: "",
                            }));
                          }
                        }}
                        className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-400"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}