"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CustomerDrawer } from "@/components/CustomerDrawer";
import { IconBadge } from "@/components/ui/premium-icon";
import {
  WorkspaceHero,
  WorkspaceHeroStat,
  WorkspaceSectionHeader,
} from "@/components/ui/workspace-page";
import { useLocationScope } from "@/hooks/useLocationScope";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { getBusinessLabels, titleCaseLabel } from "@/lib/business-copy";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatCompactCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

function statusLabel(customer: {
  isLoyal: boolean;
  isInactive: boolean;
  isUnhappy: boolean;
}) {
  if (customer.isUnhappy) {
    return { text: "Needs recovery", tone: "bg-red-500/15 text-red-300" };
  }
  if (customer.isLoyal) {
    return { text: "Loyal", tone: "bg-emerald-500/15 text-emerald-300" };
  }
  if (customer.isInactive) {
    return { text: "Inactive", tone: "bg-amber-500/15 text-amber-200" };
  }
  return { text: "Active", tone: "bg-blue-500/15 text-blue-300" };
}

function initialsFor(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function CustomersPage() {
  const restaurantId = useRestaurantId();
  const { selectedLocationId, selectedLocation } = useLocationScope();
  const locationId =
    selectedLocationId === "ALL" ? undefined : selectedLocationId;
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [drawerIdOverride, setDrawerIdOverride] = useState<
    Id<"customers"> | null | undefined
  >(undefined);

  const customers = useQuery(
    api.queries.getCustomers,
    restaurantId ? { restaurantId, locationId } : "skip"
  );
  const restaurant = useQuery(
    api.queries.getRestaurant,
    restaurantId ? { restaurantId } : "skip"
  );
  type CustomerRow = NonNullable<typeof customers>[number];

  const drawerIdFromSearch = useMemo(() => {
    const customerId = searchParams.get("customerId");
    if (!customerId || !customers) return null;
    const match = customers.find(
      (customer: CustomerRow) => customer._id === customerId
    );
    return match?._id ?? null;
  }, [customers, searchParams]);

  const activeDrawerId =
    drawerIdOverride === undefined ? drawerIdFromSearch : drawerIdOverride;

  const smsHistory = useQuery(
    api.queries.getCustomerSmsHistory,
    restaurantId && activeDrawerId
      ? { restaurantId, customerId: activeDrawerId, locationId }
      : "skip"
  );
  const receiptHistory = useQuery(
    api.queries.getCustomerReceiptHistory,
    restaurantId && activeDrawerId
      ? { restaurantId, customerId: activeDrawerId, locationId }
      : "skip"
  );

  const filtered = useMemo(() => {
    if (!customers) return [];
    const q = search.toLowerCase();
    return customers.filter(
      (customer: CustomerRow) =>
        customer.name.toLowerCase().includes(q) ||
        customer.phone.includes(q) ||
        customer.email?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const selected =
    activeDrawerId &&
    customers?.find((customer: CustomerRow) => customer._id === activeDrawerId);

  const labels = getBusinessLabels(restaurant?.businessType);

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

  const loyalCount = filtered.filter((customer: CustomerRow) => customer.isLoyal).length;
  const totalRevenue = filtered.reduce(
    (sum: number, customer: CustomerRow) => sum + customer.totalSpent,
    0
  );
  const loyalRate = filtered.length > 0 ? (loyalCount / filtered.length) * 100 : 0;
  const averageSpend = filtered.length > 0 ? totalRevenue / filtered.length : 0;

  return (
    <div className="space-y-6 px-5 py-6 sm:px-6">
      <WorkspaceHero
        eyebrow="Customer memory"
        title={`${titleCaseLabel(labels.customerLabelPlural)} who return, spend, and need attention`}
        description={`See ${labels.visitLabel} history, lifetime spend, loyalty balance, and recovery signals before launching outreach. ReviewPilot keeps the whole relationship visible so campaigns feel intentional instead of guesswork.`}
        scope={`Scope: ${selectedLocation?.name ?? "All locations"} · 1 USD = 10 loyalty points`}
        actions={
          <input
            type="search"
            placeholder={`Search ${labels.customerLabelPlural.toLowerCase()} by name, phone, or email`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full min-w-[16rem] rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/28 focus:border-white/14 focus:outline-none lg:w-[24rem]"
          />
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <WorkspaceHeroStat
          eyebrow="Directory"
          label={titleCaseLabel(labels.customerLabelPlural)}
          value={filtered.length.toString()}
          note={`${titleCaseLabel(labels.customerLabelPlural)} in the current scope`}
          icon="customers"
        />
        <WorkspaceHeroStat
          eyebrow="Retention"
          label="Loyal base"
          value={loyalCount.toString()}
          note={`${loyalRate.toFixed(0)}% loyalty rate in this view`}
          icon="loyalty"
        />
        <WorkspaceHeroStat
          eyebrow="Revenue"
          label="Tracked spend"
          value={formatCompactCurrency(totalRevenue)}
          note={`Average ${formatCurrency(averageSpend)} per ${labels.customerLabel}`}
          icon="spend"
        />
      </div>

      <section className="rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(7,17,29,0.35)]">
        <WorkspaceSectionHeader
          eyebrow="Directory"
          title={`${titleCaseLabel(labels.customerLabel)} directory`}
          description={`Open any ${labels.customerLabel} to see loyalty balance, message history, bill receipts, contact permissions, and privacy actions in one premium workspace panel.`}
          action={
            <div className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-xs tracking-[0.16em] text-white/42">
              Points rule: 1 USD = 10 loyalty points
            </div>
          }
        />

        <div className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((customer: CustomerRow) => {
            const status = statusLabel(customer);

            return (
              <button
                key={customer._id}
                type="button"
                onClick={() => setDrawerIdOverride(customer._id)}
                className="group relative overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(8,17,29,0.98),rgba(10,18,29,0.9))] p-5 text-left shadow-[0_22px_60px_rgba(2,6,23,0.22)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/18 hover:shadow-[0_30px_80px_rgba(8,145,178,0.16)]"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.42),transparent)] opacity-80" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(circle_at_bottom,rgba(52,211,153,0.1),transparent_74%)] opacity-90" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] font-display text-sm font-semibold tracking-[0.2em] text-white/72">
                        {initialsFor(customer.name)}
                      </div>
                      <div>
                        <p className="font-display text-[1.15rem] font-semibold tracking-[-0.03em] text-white">
                          {customer.name}
                        </p>
                        <p className="mt-1 text-sm text-white/45">
                          {customer.phone}
                        </p>
                        {customer.email ? (
                          <p className="mt-1 text-xs text-sky-200/72">
                            {customer.email}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs ${status.tone}`}>
                      {status.text}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">
                        {titleCaseLabel(labels.visitLabelPlural)}
                      </p>
                      <p className="mt-2 font-display text-[1.55rem] font-semibold tracking-[-0.04em] text-white">
                        {customer.visitCount}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">
                        Points
                      </p>
                      <p className="mt-2 font-display text-[1.55rem] font-semibold tracking-[-0.04em] text-white">
                        {customer.points}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">
                        Spend
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {formatCurrency(customer.totalSpent)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">
                        Rating
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {customer.latestRating !== undefined
                          ? `${customer.latestRating}/5`
                          : "--"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-white/38">
                      <IconBadge
                        name="message"
                        className="h-9 w-9 border-white/8 bg-white/[0.03] text-white/64"
                        iconClassName="h-[15px] w-[15px]"
                      />
                      View history, notes, receipts, and privacy tools
                    </div>
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-300 transition-transform group-hover:translate-x-0.5">
                      Open profile -&gt;
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {selected && (
        <CustomerDrawer
          customer={selected}
          smsHistory={smsHistory ?? []}
          receiptHistory={receiptHistory ?? []}
          restaurantId={restaurantId}
          onClose={() => setDrawerIdOverride(null)}
          isLoadingSms={smsHistory === undefined}
          isLoadingReceipts={receiptHistory === undefined}
        />
      )}
    </div>
  );
}
