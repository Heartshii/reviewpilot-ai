"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { CustomerDrawer } from "@/components/CustomerDrawer";

function formatTimeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString();
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function statusLabel(customer: {
  isLoyal: boolean;
  isInactive: boolean;
  isUnhappy: boolean;
}) {
  if (customer.isUnhappy) return { text: "Needs recovery", tone: "bg-red-500/15 text-red-300" };
  if (customer.isLoyal) return { text: "Loyal", tone: "bg-emerald-500/15 text-emerald-300" };
  if (customer.isInactive) return { text: "Inactive", tone: "bg-amber-500/15 text-amber-200" };
  return { text: "Active", tone: "bg-blue-500/15 text-blue-300" };
}

export default function CustomersPage() {
  const restaurantId = useRestaurantId();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [drawerId, setDrawerId] = useState<Id<"customers"> | null>(null);

  const customers = useQuery(
    api.queries.getCustomers,
    restaurantId ? { restaurantId } : "skip"
  );
  const smsHistory = useQuery(
    api.queries.getCustomerSmsHistory,
    restaurantId && drawerId ? { restaurantId, customerId: drawerId } : "skip"
  );
  const receiptHistory = useQuery(
    api.queries.getCustomerReceiptHistory,
    restaurantId && drawerId ? { restaurantId, customerId: drawerId } : "skip"
  );

  useEffect(() => {
    const customerId = searchParams.get("customerId");
    if (!customerId || !customers) return;
    const match = customers.find((customer) => customer._id === customerId);
    if (match) {
      setDrawerId(match._id);
    }
  }, [customers, searchParams]);

  const filtered = useMemo(() => {
    if (!customers) return [];
    const q = search.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customers, search]);

  const selected = drawerId && customers?.find((c) => c._id === drawerId);

  if (!restaurantId) return null;

  if (customers === undefined) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-emerald-500/60" />
          <p className="text-xs text-white/20">Loading customers...</p>
        </div>
      </div>
    );
  }

  const loyalCount = filtered.filter((c) => c.isLoyal).length;
  const atRiskCount = filtered.filter((c) => c.isUnhappy).length;
  const totalRevenue = filtered.reduce((sum, customer) => sum + customer.totalSpent, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-white/28">
            Customer memory
          </p>
          <h1 className="mt-2 text-3xl font-light tracking-tight text-white">
            Customers
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/42">
            Review visit count, lifetime spend, loyalty points, and guest sentiment
            before launching campaigns or approving recovery outreach.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Customers", value: filtered.length.toString() },
            { label: "Loyal", value: loyalCount.toString() },
            { label: "Tracked spend", value: formatCurrency(totalRevenue) },
          ].map((item) => (
            <div
              key={item.label}
              className="dashboard-surface rounded-2xl px-4 py-3 text-center"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-surface rounded-[1.75rem] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-white/76">Guest directory</p>
            <p className="mt-1 text-xs text-white/34">
              Click any customer to open visit history, loyalty points, SMS history,
              and bill-based receipt details.
            </p>
          </div>
          <input
            type="search"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white placeholder:text-white/24 focus:border-white/14 focus:outline-none"
          />
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/7">
          <div className="hidden grid-cols-[1.2fr_0.95fr_0.65fr_0.75fr_0.95fr_0.75fr_0.95fr] gap-3 border-b border-white/7 bg-white/[0.03] px-4 py-3 text-xs uppercase tracking-[0.16em] text-white/28 lg:grid">
            <span>Name</span>
            <span>Phone</span>
            <span>Visits</span>
            <span>Points</span>
            <span>Total spent</span>
            <span>Rating</span>
            <span>Status</span>
          </div>

          <div className="divide-y divide-white/6">
            {filtered.map((customer) => {
              const status = statusLabel(customer);
              return (
                <button
                  key={customer._id}
                  type="button"
                  onClick={() => setDrawerId(customer._id)}
                  className="grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.03] lg:grid-cols-[1.2fr_0.95fr_0.65fr_0.75fr_0.95fr_0.75fr_0.95fr]"
                >
                  <div>
                    <p className="text-sm font-medium text-white underline-offset-4 hover:underline">
                      {customer.name}
                    </p>
                    <p className="mt-1 text-xs text-white/28 lg:hidden">
                      {customer.phone}
                    </p>
                  </div>
                  <p className="hidden text-sm text-white/48 lg:block">
                    {customer.phone}
                  </p>
                  <p className="text-sm text-white/68">{customer.visitCount}</p>
                  <p className="text-sm text-white/68">{customer.points}</p>
                  <p className="text-sm text-white/68">
                    {formatCurrency(customer.totalSpent)}
                  </p>
                  <p className="text-sm text-white/68">
                    {customer.latestRating !== undefined
                      ? `${customer.latestRating}/5`
                      : "-"}
                  </p>
                  <div>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${status.tone}`}>
                      {status.text}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 text-xs text-white/26">
          Points rule: 1 USD = 10 loyalty points
        </div>
      </div>

      {selected && (
        <CustomerDrawer
          customer={selected}
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
