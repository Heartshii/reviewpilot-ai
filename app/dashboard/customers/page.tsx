"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useRestaurantId } from "@/hooks/useRestaurantId";

function formatTimeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function CustomersPage() {
  const restaurantId = useRestaurantId();
  const [search, setSearch] = useState("");
  const [drawerId, setDrawerId] = useState<Id<"customers"> | null>(null);

  const customers = useQuery(
    api.queries.getCustomers,
    restaurantId ? { restaurantId } : "skip"
  );
  const smsHistory = useQuery(
    api.queries.getCustomerSmsHistory,
    restaurantId && drawerId
      ? { restaurantId, customerId: drawerId }
      : "skip"
  );

  const filtered = useMemo(() => {
    if (!customers) return [];
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customers, search]);

  const selected = drawerId && customers?.find((c) => c._id === drawerId);

  if (!restaurantId) return null;
  if (customers === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Customers</h1>
      <input
        type="search"
        placeholder="Search by name or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
      />

      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="w-1 px-4 py-3 text-left text-sm font-medium text-zinc-400">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Phone</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Visits</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Points</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Last Activity</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Rating</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const border =
                c.isUnhappy
                  ? "border-l-4 border-l-red-500"
                  : c.isInactive
                    ? "border-l-4 border-l-amber-500"
                    : c.isLoyal
                      ? "border-l-4 border-l-emerald-500"
                      : "";
              return (
                <tr
                  key={c._id}
                  onClick={() => setDrawerId(c._id)}
                  className={`cursor-pointer border-b border-zinc-800 hover:bg-zinc-800/30 ${border}`}
                >
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{c.phone}</td>
                  <td className="px-4 py-3">{c.visitCount}</td>
                  <td className="px-4 py-3">{c.points}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {formatTimeAgo(c.lastVisitAt ?? c.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {c.latestRating !== undefined ? `${c.latestRating}/5` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.isLoyal && (
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
                        Loyal
                      </span>
                    )}
                    {c.isInactive && !c.isLoyal && (
                      <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                        Inactive
                      </span>
                    )}
                    {c.isUnhappy && (
                      <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                        Unhappy
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <CustomerDrawer
          customer={selected}
          smsHistory={smsHistory ?? []}
          restaurantId={restaurantId}
          onClose={() => setDrawerId(null)}
        />
      )}
    </div>
  );
}

function CustomerDrawer({
  customer,
  smsHistory,
  restaurantId,
  onClose,
}: {
  customer: {
    _id: Id<"customers">;
    name: string;
    phone: string;
    points: number;
    visitCount: number;
    birthdayMonth?: number;
    birthdayDay?: number;
    visitNote?: string;
  };
  smsHistory: { content: string; sentAt: number; smsType: string; customerId?: Id<"customers"> }[];
  restaurantId: Id<"restaurants">;
  onClose: () => void;
}) {
  const [visitNote, setVisitNote] = useState(customer.visitNote ?? "");
  const [showConfirm, setShowConfirm] = useState(false);

  const updateNote = useMutation(api.dashboardMutations.updateCustomerVisitNote);
  const deleteCustomer = useMutation(api.dashboardMutations.deleteCustomer);

  const handleSaveNote = () => {
    updateNote({ customerId: customer._id, restaurantId, visitNote });
  };

  const handleDelete = () => {
    deleteCustomer({ customerId: customer._id, restaurantId });
    onClose();
  };

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex w-full max-w-md flex-col bg-zinc-900 shadow-xl">
        <div className="border-b border-zinc-800 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{customer.name}</h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="text-zinc-400">{customer.phone}</p>
          <div className="mt-2 flex gap-2 text-sm">
            <span>{customer.points} pts</span>
            <span>•</span>
            <span>{customer.visitCount} visits</span>
            {customer.birthdayMonth != null && customer.birthdayDay != null && (
              <span className="text-pink-400">
                🎂 {months[customer.birthdayMonth - 1]} {customer.birthdayDay}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <h3 className="mb-2 text-sm font-medium text-zinc-400">SMS History</h3>
          <div className="space-y-2">
            {smsHistory.length === 0 ? (
              <p className="text-sm text-zinc-500">No messages yet</p>
            ) : (
              smsHistory.map((msg, i) => (
                <div
                  key={i}
                  className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-500/30 px-3 py-2 text-sm"
                >
                  {msg.content}
                  <p className="mt-1 text-xs text-zinc-500">
                    {new Date(msg.sentAt).toLocaleString()} • {msg.smsType}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-zinc-400">
              Add Visit Note
            </label>
            <textarea
              value={visitNote}
              onChange={(e) => setVisitNote(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
            />
            <button
              onClick={handleSaveNote}
              className="mt-2 rounded-lg bg-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-600"
            >
              Save Note
            </button>
          </div>
        </div>

        <div className="border-t border-zinc-800 p-4">
          {showConfirm ? (
            <div>
              <p className="mb-2 text-sm text-zinc-400">
                Remove this customer? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600"
                >
                  Remove Customer
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Remove Customer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
