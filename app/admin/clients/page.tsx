"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { BUSINESS_TYPE_OPTIONS, type BusinessType } from "@/lib/business-copy";
import { IconBadge } from "@/components/ui/premium-icon";

const tierLabels: Record<number, { label: string; color: string }> = {
  1: {
    label: "Starter",
    color: "text-zinc-300 border-zinc-700/70 bg-zinc-900/70",
  },
  2: {
    label: "Pro",
    color: "text-sky-100 border-sky-500/25 bg-sky-500/10",
  },
  3: {
    label: "Agency",
    color: "text-emerald-100 border-emerald-500/25 bg-emerald-500/10",
  },
};

function formatPlanLabel(interval?: "MONTHLY" | "ANNUAL") {
  return interval === "ANNUAL" ? "Annual" : "Monthly";
}

export default function AdminClientsPage() {
  const { user } = useUser();
  const restaurants = useQuery(api.adminMutations.getAllRestaurants);
  const updateTier = useMutation(api.adminMutations.updateRestaurantTier);
  const toggleActive = useMutation(api.adminMutations.toggleRestaurantActive);
  const addCredits = useMutation(api.adminMutations.addSmsCredits);
  const createRestaurant = useMutation(api.adminMutations.createRestaurant);
  const deleteRestaurant = useMutation(api.adminMutations.deleteRestaurant);
  const actorEmail =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress;

  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creditInputs, setCreditInputs] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    ownerEmail: "",
    businessType: "GENERAL_SERVICE" as BusinessType,
    businessSubtype: "",
    contactPhone: "",
    websiteUrl: "",
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
      businessType: form.businessType,
      businessSubtype: form.businessSubtype || undefined,
      contactPhone: form.contactPhone || undefined,
      websiteUrl: form.websiteUrl || undefined,
      googleBusinessUrl: form.googleBusinessUrl || undefined,
      twilioNumber: form.twilioNumber || undefined,
      tier: form.tier,
      actorEmail,
    });

    setShowAdd(false);
    setForm({
      name: "",
      slug: "",
      ownerEmail: "",
      businessType: "GENERAL_SERVICE",
      businessSubtype: "",
      contactPhone: "",
      websiteUrl: "",
      googleBusinessUrl: "",
      twilioNumber: "",
      tier: 1,
    });
  };

  type RestaurantRow = NonNullable<typeof restaurants>[number];

  const filtered = useMemo(() => {
    const source = restaurants ?? [];
    const searchValue = search.toLowerCase();
    return source.filter((restaurant: RestaurantRow) => {
      return (
        restaurant.name.toLowerCase().includes(searchValue) ||
        restaurant.ownerEmail.toLowerCase().includes(searchValue)
      );
    });
  }, [restaurants, search]);

  if (restaurants === undefined) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-emerald-500/60" />
      </div>
    );
  }

  const billingAttentionCount = filtered.filter((restaurant: RestaurantRow) =>
    ["PAST_DUE", "UNPAID", "INCOMPLETE"].includes(
      restaurant.subscriptionStatus ?? ""
    )
  ).length;
  const annualCount = filtered.filter(
    (restaurant: RestaurantRow) =>
      (restaurant.billingInterval ?? "MONTHLY") === "ANNUAL"
  ).length;
  const trialingCount = filtered.filter(
    (restaurant: RestaurantRow) =>
      (restaurant.subscriptionStatus ?? "TRIALING") === "TRIALING"
  ).length;

  return (
    <div suppressHydrationWarning className="space-y-6">
      <section className="overflow-hidden rounded-[2.2rem] border border-white/6 bg-[linear-gradient(135deg,rgba(8,17,29,0.98),rgba(8,17,29,0.94)_48%,rgba(16,185,129,0.08))] p-6 shadow-[0_22px_80px_rgba(0,0,0,0.24)]">
        <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-white/70">
              <IconBadge
                name="customers"
                className="h-8 w-8 border-white/10 bg-white/[0.04] text-white/75"
                iconClassName="h-[14px] w-[14px]"
              />
              Client operations
            </div>
            <div>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Run client support, billing oversight, and workspace intervention from one board.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
                This is your control surface for account health, plan changes,
                credits, and support entry. It should help you move fast without
                feeling like a spreadsheet.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowAdd(true)}
                className="rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-4 py-3 text-sm font-semibold text-slate-950"
              >
                Add client workspace
              </button>
              <Link
                href="/admin"
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/75 transition hover:bg-white/[0.08]"
              >
                Back to control room
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              {
                eyebrow: "Risk",
                label: "Billing attention",
                value: billingAttentionCount,
                note: "Accounts needing payment follow-up",
                icon: "billing" as const,
              },
              {
                eyebrow: "Pipeline",
                label: "Trialing",
                value: trialingCount,
                note: "Workspaces still inside the trial window",
                icon: "clock" as const,
              },
              {
                eyebrow: "Retention",
                label: "Annual plans",
                value: annualCount,
                note: "Lower-churn accounts billed yearly",
                icon: "agency" as const,
              },
            ].map((card) => (
              <div
                key={card.label}
                className="flex min-h-[13rem] flex-col rounded-[1.8rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-5 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 max-w-[12rem]">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/28">
                      {card.eyebrow}
                    </p>
                    <p className="mt-3 font-display text-[1.05rem] font-medium leading-6 tracking-[-0.03em] text-white/94">
                      {card.label}
                    </p>
                  </div>
                  <IconBadge
                    name={card.icon}
                    className="h-11 w-11 shrink-0 border-white/10 bg-white/[0.04] text-white/75"
                    iconClassName="h-[18px] w-[18px]"
                  />
                </div>
                <p className="mt-8 font-display text-[2rem] font-semibold leading-none tracking-[-0.04em] text-white">
                  {card.value}
                </p>
                <p className="mt-auto pt-4 text-sm leading-6 text-white/42">
                  {card.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {showAdd ? (
        <section className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                New client workspace
              </p>
              <p className="mt-1 text-sm text-white/42">
                Create a managed workspace with billing, branding, and onboarding details.
              </p>
            </div>
            <button
              onClick={() => setShowAdd(false)}
              className="rounded-xl border border-white/8 px-4 py-2 text-sm text-white/45 transition hover:text-white/75"
            >
              Close
            </button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              { key: "name", label: "Business name" },
              { key: "slug", label: "Slug" },
              { key: "ownerEmail", label: "Owner email" },
              { key: "businessSubtype", label: "Specialty / focus" },
              { key: "contactPhone", label: "Contact phone" },
              { key: "websiteUrl", label: "Website" },
              { key: "googleBusinessUrl", label: "Google Business URL" },
              { key: "twilioNumber", label: "Twilio number" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="mb-1.5 block text-xs text-white/30">
                  {label}
                </label>
                <input
                  type="text"
                  value={form[key as keyof typeof form] as string}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder-white/20 focus:border-white/15 focus:bg-white/8"
                />
              </div>
            ))}

            <div>
              <label className="mb-1.5 block text-xs text-white/30">
                Business type
              </label>
              <select
                value={form.businessType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    businessType: event.target.value as BusinessType,
                  }))
                }
                className="w-full rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"
              >
                {BUSINESS_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-white/30">Tier</label>
              <select
                value={form.tier}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tier: Number(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"
              >
                <option value={1}>Starter — $49/mo</option>
                <option value={2}>Pro — $79/mo</option>
                <option value={3}>Agency — $149/mo</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={handleCreate}
              className="rounded-xl bg-emerald-500/20 px-5 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/30"
            >
              Create client
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="rounded-xl border border-white/8 px-5 py-2.5 text-sm text-white/45 transition hover:text-white/70"
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-[2rem] border border-white/6 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-white/28">
              Support board
            </p>
            <p className="mt-1 text-sm text-white/42">
              Search workspaces, review billing health, and jump into support actions without scrolling a flat table.
            </p>
          </div>
          <input
            type="text"
            placeholder="Search business or owner..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-white outline-none placeholder-white/20 focus:border-white/15 lg:max-w-sm"
          />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {filtered.map((restaurant: RestaurantRow) => {
          const pct =
            restaurant.smsLimit > 0
              ? Math.min(
                  100,
                  Math.round((restaurant.smsUsed / restaurant.smsLimit) * 100)
                )
              : 0;
          const tier = tierLabels[restaurant.tier] ?? tierLabels[1];
          const needsAttention = ["PAST_DUE", "UNPAID", "INCOMPLETE"].includes(
            restaurant.subscriptionStatus ?? ""
          );
          const businessLabel =
            BUSINESS_TYPE_OPTIONS.find(
              (option) => option.value === restaurant.businessType
            )?.label ?? "General service business";

          return (
            <article
              key={restaurant._id}
              className="group overflow-hidden rounded-[2rem] border border-white/6 bg-white/[0.03] p-6 transition-all hover:border-emerald-400/16 hover:bg-white/[0.04]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        restaurant.active ? "bg-emerald-400" : "bg-red-400/70"
                      }`}
                    />
                    <h2 className="truncate text-lg font-semibold text-white">
                      {restaurant.name}
                    </h2>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] ${tier.color}`}
                    >
                      {tier.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/42">
                    {`${businessLabel} • ${restaurant.ownerEmail}`}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] ${
                      restaurant.active
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "bg-red-500/10 text-red-300"
                    }`}
                  >
                    {restaurant.active ? "Active" : "Suspended"}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] ${
                      needsAttention
                        ? "bg-amber-400/10 text-amber-200"
                        : "bg-white/[0.05] text-white/50"
                    }`}
                  >
                    {restaurant.subscriptionStatus ?? "TRIALING"}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/28">
                    Footprint
                  </p>
                  <p className="mt-2 text-sm text-white">
                    {restaurant.customerCount} customers
                  </p>
                  <p className="mt-1 text-xs text-white/38">
                    {restaurant.locationCount} location
                    {restaurant.locationCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/28">
                    Billing
                  </p>
                  <p className="mt-2 text-sm text-white">
                    {formatPlanLabel(restaurant.billingInterval)}
                  </p>
                  <p className="mt-1 text-xs text-white/38">
                    Stripe {restaurant.stripeCustomerId ? "connected" : "not connected"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/28">
                    SMS usage
                  </p>
                  <p className="mt-2 text-sm text-white">
                    {restaurant.smsUsed}/{restaurant.smsLimit}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/6">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 90 ? "bg-amber-400" : "bg-emerald-500/60"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={`/admin/clients/${restaurant._id}`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-200 transition hover:bg-emerald-400/18"
                >
                  <IconBadge
                    name="shield"
                    className="h-8 w-8 border-emerald-300/16 bg-emerald-400/12 text-emerald-100"
                    iconClassName="h-[14px] w-[14px]"
                  />
                  Support console
                </Link>
                <Link
                  href={`/dashboard?supportRestaurantId=${restaurant._id}`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/75 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <IconBadge
                    name="overview"
                    className="h-8 w-8 border-white/10 bg-white/[0.04] text-white/72"
                    iconClassName="h-[14px] w-[14px]"
                  />
                  Workspace
                </Link>
                <button
                  onClick={() =>
                    toggleActive({
                      restaurantId: restaurant._id as Id<"restaurants">,
                      actorEmail,
                    })
                  }
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white/60 transition hover:bg-white/[0.06] hover:text-white"
                >
                  {restaurant.active ? "Suspend" : "Activate"}
                </button>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-white/28">
                        Workspace controls
                      </p>
                      <p className="mt-1 text-xs text-white/36">
                        Adjust plan packaging without leaving the support board.
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/40">
                      {restaurant.stripeSubscriptionId ? "Stripe linked" : "Manual billing"}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <label className="text-xs text-white/35">Tier</label>
                    <select
                      value={restaurant.tier}
                      onChange={(event) =>
                        updateTier({
                          restaurantId: restaurant._id as Id<"restaurants">,
                          tier: Number(event.target.value),
                          actorEmail,
                        })
                      }
                      className={`rounded-xl border px-3 py-2 text-xs font-medium outline-none ${tier.color} bg-transparent`}
                    >
                      <option value={1}>Starter</option>
                      <option value={2}>Pro</option>
                      <option value={3}>Agency</option>
                    </select>
                    <span className="text-xs text-white/32">
                      {restaurant.stripeSubscriptionId ?? "No Stripe subscription ID"}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-white/28">
                        Quick credits
                      </p>
                      <p className="mt-1 text-xs text-white/36">
                        Add temporary SMS relief for migrations or saves.
                      </p>
                    </div>
                    <IconBadge
                      name="flash"
                      className="h-9 w-9 border-blue-400/16 bg-blue-500/10 text-blue-200"
                      iconClassName="h-[15px] w-[15px]"
                    />
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="SMS"
                      value={creditInputs[restaurant._id] ?? ""}
                      onChange={(event) =>
                        setCreditInputs((current) => ({
                          ...current,
                          [restaurant._id]: event.target.value,
                        }))
                      }
                      className="w-20 rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs text-white outline-none"
                    />
                    <button
                      onClick={() => {
                        const credits = parseInt(
                          creditInputs[restaurant._id] ?? "0",
                          10
                        );
                        if (credits > 0) {
                          void addCredits({
                            restaurantId: restaurant._id as Id<"restaurants">,
                            credits,
                            actorEmail,
                          });
                          setCreditInputs((current) => ({
                            ...current,
                            [restaurant._id]: "",
                          }));
                        }
                      }}
                      className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-300 transition hover:bg-blue-500/20"
                    >
                      Add SMS
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-white/6 pt-4">
                <button
                  onClick={async () => {
                    const confirmed = window.confirm(
                      `Remove ${restaurant.name}? This deletes the client workspace and related records.`
                    );
                    if (!confirmed) return;
                    setDeletingId(restaurant._id);
                    try {
                      await deleteRestaurant({
                        restaurantId: restaurant._id as Id<"restaurants">,
                        actorEmail,
                      });
                    } finally {
                      setDeletingId(null);
                    }
                  }}
                  className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-200 transition hover:bg-red-500/18"
                >
                  {deletingId === restaurant._id
                    ? "Removing client..."
                    : "Remove client"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[2rem] border border-white/6 bg-white/[0.03] py-20 text-center text-sm text-white/25">
          No clients found for this search.
        </div>
      ) : null}
    </div>
  );
}
