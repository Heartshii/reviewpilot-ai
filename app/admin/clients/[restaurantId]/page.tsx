"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { BUSINESS_TYPE_OPTIONS } from "@/lib/business-copy";
import { AppIcon, IconBadge } from "@/components/ui/premium-icon";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value?: number) {
  if (!value) return "Not available";
  return new Date(value).toLocaleString();
}

export default function AdminClientSupportPage() {
  const params = useParams<{ restaurantId: string }>();
  const router = useRouter();
  const { user } = useUser();
  const [busyCustomerId, setBusyCustomerId] = useState<string | null>(null);
  const [supportAccessReady, setSupportAccessReady] = useState(false);
  const actorClerkId = user?.id ?? "";
  const restaurantId = params.restaurantId as Id<"restaurants">;
  const convex = useConvex();
  const convexAdminUser = useQuery(
    api.users.getCurrentUserByClerkId,
    actorClerkId ? { clerkId: actorClerkId } : "skip"
  );

  useEffect(() => {
    if (!user) {
      setSupportAccessReady(false);
      return;
    }

    if (
      user.publicMetadata?.role === "SUPER_ADMIN" &&
      convexAdminUser?.role === "SUPER_ADMIN"
    ) {
      setSupportAccessReady(true);
      return;
    }

    let cancelled = false;

    void fetch("/api/admin/sync-role", { method: "POST" })
      .then(() => {
        if (
          !cancelled &&
          user.publicMetadata?.role === "SUPER_ADMIN" &&
          convexAdminUser?.role === "SUPER_ADMIN"
        ) {
          setSupportAccessReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setSupportAccessReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [convexAdminUser?.role, user]);

  const snapshot = useQuery(
    api.adminMutations.getRestaurantSupportSnapshot,
    actorClerkId && supportAccessReady ? { actorClerkId, restaurantId } : "skip"
  );
  const deleteCustomerPrivacyData = useMutation(
    api.dashboardMutations.deleteCustomerPrivacyData
  );

  const businessTypeLabel = useMemo(() => {
    const value = snapshot?.restaurant.businessType;
    return (
      BUSINESS_TYPE_OPTIONS.find((option) => option.value === value)?.label ??
      "Service business"
    );
  }, [snapshot?.restaurant.businessType]);

  if (!supportAccessReady || snapshot === undefined) {
    return (
      <div suppressHydrationWarning className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-emerald-500/60" />
          <p className="text-xs text-white/20">
            {!supportAccessReady
              ? "Preparing admin support access..."
              : "Loading support console..."}
          </p>
        </div>
      </div>
    );
  }

  type SupportSnapshot = NonNullable<typeof snapshot>;
  type TeamMember = SupportSnapshot["team"][number];
  type RecentCustomer = SupportSnapshot["recentCustomers"][number];
  type RecentFeedback = SupportSnapshot["recentFeedback"][number];
  type IntegrationRow = SupportSnapshot["integrations"][number];
  type PurchaseRow = SupportSnapshot["recentPurchases"][number];

  const quickLinks = [
    { href: "/dashboard", label: "Overview", icon: "overview" as const },
    { href: "/dashboard/customers", label: "Customers", icon: "customers" as const },
    { href: "/dashboard/reviews", label: "Reviews", icon: "reviews" as const },
    { href: "/dashboard/sms", label: "Messaging", icon: "sms" as const },
    { href: "/dashboard/billing", label: "Billing", icon: "billing" as const },
    { href: "/dashboard/settings", label: "Settings", icon: "settings" as const },
    {
      href: "/dashboard/integrations",
      label: "Integrations",
      icon: "integrations" as const,
    },
    { href: "/dashboard/loyalty", label: "Loyalty", icon: "gift" as const },
  ];

  const handleDeleteCustomer = async (customerId: Id<"customers">, name: string) => {
    if (!actorClerkId) return;
    const confirmed = window.confirm(
      `Delete all stored data for ${name}? This permanently removes their customer, feedback, receipt, loyalty, and message records from this workspace.`
    );
    if (!confirmed) return;

    setBusyCustomerId(customerId);
    try {
      await deleteCustomerPrivacyData({
        actorClerkId,
        customerId,
        restaurantId,
      });
      router.refresh();
    } finally {
      setBusyCustomerId(null);
    }
  };

  const handleExportCustomer = async (customerId: Id<"customers">, name: string) => {
    if (!actorClerkId) return;
    setBusyCustomerId(customerId);
    try {
      const payload = await convex.query(api.queries.getCustomerPrivacyExport, {
        actorClerkId,
        customerId,
        restaurantId,
      });
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}-privacy-export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setBusyCustomerId(null);
    }
  };

  return (
    <div suppressHydrationWarning className="space-y-6">
      <section className="overflow-hidden rounded-[2.2rem] border border-white/6 bg-[linear-gradient(135deg,rgba(8,17,29,0.98),rgba(8,17,29,0.94)_48%,rgba(16,185,129,0.08))] p-6 shadow-[0_22px_80px_rgba(0,0,0,0.24)]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <Link
              href="/admin/clients"
              className="inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-white/75"
            >
              <AppIcon name="chevronLeft" className="h-4 w-4" />
              Back to clients
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] text-sm font-semibold text-slate-950">
                RP
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/28">
                  Client support console
                </p>
                <h1 className="mt-1 text-3xl font-semibold text-white">
                  {snapshot.restaurant.name}
                </h1>
                <p className="mt-2 text-sm text-white/48">
                  {businessTypeLabel}
                  {snapshot.restaurant.businessSubtype
                    ? ` • ${snapshot.restaurant.businessSubtype}`
                    : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs uppercase tracking-[0.16em] text-white/55">
              {(snapshot.restaurant.subscriptionStatus ?? "TRIALING") +
                " • " +
                (snapshot.restaurant.billingInterval ?? "MONTHLY")}
            </span>
            <Link
              href={`/dashboard?supportRestaurantId=${snapshot.restaurant._id}`}
              className="rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-4 py-3 text-sm font-semibold text-slate-950"
            >
              Enter support mode
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <section className="rounded-[2rem] border border-white/6 bg-white/[0.03] p-6">
          <div className="flex items-center gap-3">
            <IconBadge
              name="shield"
              className="h-11 w-11 border-emerald-400/18 bg-[linear-gradient(180deg,rgba(52,211,153,0.14),rgba(76,201,240,0.06))] text-emerald-100"
              iconClassName="h-[18px] w-[18px]"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                Support coverage
              </p>
              <p className="mt-1 text-sm text-white/45">
                Billing, customer care, review recovery, integrations, and workspace controls for this client.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                eyebrow: "Queue",
                label: "Pending approvals",
                value: snapshot.supportHealth.pendingApprovals,
                icon: "reviews" as const,
              },
              {
                eyebrow: "Footprint",
                label: "Customers",
                value: snapshot.supportHealth.totalCustomers,
                icon: "customers" as const,
              },
              {
                eyebrow: "Scale",
                label: "Locations",
                value: snapshot.supportHealth.totalLocations,
                icon: "agency" as const,
              },
              {
                eyebrow: "Value",
                label: "Tracked spend",
                value: formatCurrency(snapshot.supportHealth.totalTrackedSpend),
                icon: "spend" as const,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex min-h-[12.5rem] flex-col rounded-[1.7rem] border border-white/8 bg-black/12 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 max-w-[11rem]">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/28">
                      {item.eyebrow}
                    </p>
                    <p className="mt-3 font-display text-base font-medium leading-6 tracking-[-0.03em] text-white/94">
                      {item.label}
                    </p>
                  </div>
                  <IconBadge
                    name={item.icon}
                    className="h-10 w-10 shrink-0 border-white/10 bg-white/[0.04] text-white/70"
                    iconClassName="h-[17px] w-[17px]"
                  />
                </div>
                <p className="mt-7 font-display text-[1.9rem] font-semibold leading-none tracking-[-0.04em] text-white">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={`${link.href}?supportRestaurantId=${snapshot.restaurant._id}`}
                className="group rounded-2xl border border-white/8 bg-white/[0.02] p-4 transition hover:border-emerald-400/20 hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-3">
                  <IconBadge
                    name={link.icon}
                    className="h-10 w-10 border-white/10 bg-white/[0.04] text-white/70 transition group-hover:text-emerald-100"
                    iconClassName="h-[17px] w-[17px]"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{link.label}</p>
                    <p className="text-xs text-white/35">Open client workspace</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-[2rem] border border-white/6 bg-white/[0.03] p-6">
            <div className="flex items-center gap-3">
              <IconBadge
                name="shield"
                className="h-11 w-11 border-white/10 bg-white/[0.04] text-white/75"
                iconClassName="h-[18px] w-[18px]"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                  Account owner
                </p>
                <p className="mt-1 text-sm text-white/45">
                  Credential support and Stripe references for this workspace.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                <p className="text-white">
                  {snapshot.owner?.email ?? "Owner record missing"}
                </p>
                <p className="mt-1 text-white/42">
                  Stripe customer: {snapshot.restaurant.stripeCustomerId ?? "Not connected"}
                </p>
                <p className="mt-1 text-white/42">
                  Subscription: {snapshot.restaurant.stripeSubscriptionId ?? "Not connected"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                <p className="text-sm font-medium text-white">Password support</p>
                <p className="mt-2 text-sm leading-7 text-white/46">
                  Admin cannot view or manually read passwords. If the owner forgets their password, send them to the ReviewPilot sign-in page and ask them to use Clerk&apos;s recovery flow.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/sign-in"
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/72"
                  >
                    Open sign-in page
                  </Link>
                  <span className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
                    Tell them to click “Forgot password”
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/6 bg-white/[0.03] p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-white/28">
              Team access
            </p>
            <div className="mt-4 space-y-3">
              {snapshot.team.map((member: TeamMember) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/10 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{member.email}</p>
                    <p className="text-xs text-white/38">{member.role}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-white/45">
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/6 bg-white/[0.03] p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-white/28">
              Privacy request workflow
            </p>
            <div className="mt-4 space-y-3 rounded-2xl border border-white/8 bg-black/10 p-4 text-sm leading-7 text-white/46">
              <p>1. Verify which customer the owner is asking about.</p>
              <p>
                2. Use the export or delete actions from the recent customer list, or open the customer workspace for a deeper review.
              </p>
              <p>3. Confirm the request with the owner before destructive deletion.</p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-white/6 bg-white/[0.03] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                Recent customers
              </p>
              <p className="mt-1 text-sm text-white/45">
                Help with privacy requests, loyalty issues, and profile cleanup.
              </p>
            </div>
            <Link
              href={`/dashboard/customers?supportRestaurantId=${snapshot.restaurant._id}`}
              className="text-sm text-emerald-200/80 transition hover:text-emerald-100"
            >
              Open customer workspace
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {snapshot.recentCustomers.map((customer: RecentCustomer) => (
              <div
                key={customer._id}
                className="rounded-2xl border border-white/8 bg-black/10 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{customer.name}</p>
                    <p className="mt-1 text-xs text-white/38">
                      {customer.phone}
                      {customer.email ? ` • ${customer.email}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-white/45">
                      {customer.points} pts
                    </span>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-white/45">
                      {customer.visitCount} visits
                    </span>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-white/45">
                      {formatCurrency(customer.totalSpent)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/dashboard/customers?supportRestaurantId=${snapshot.restaurant._id}`}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/72"
                  >
                    Open in client dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleExportCustomer(customer._id, customer.name)}
                    disabled={busyCustomerId === customer._id}
                    className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200 disabled:opacity-50"
                  >
                    Export customer data
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomer(customer._id, customer.name)}
                    disabled={busyCustomerId === customer._id}
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200 disabled:opacity-50"
                  >
                    Delete customer data
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-[2rem] border border-white/6 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                  Recovery and review queue
                </p>
                <p className="mt-1 text-sm text-white/45">
                  See the latest customer issues before stepping into support mode.
                </p>
              </div>
              <Link
                href={`/dashboard/reviews?supportRestaurantId=${snapshot.restaurant._id}`}
                className="text-sm text-emerald-200/80 transition hover:text-emerald-100"
              >
                Open reviews
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {snapshot.recentFeedback.map((item: RecentFeedback) => (
                <div
                  key={item._id}
                  className="rounded-2xl border border-white/8 bg-black/10 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {item.customerName}
                      </p>
                      <p className="mt-1 text-xs text-white/38">
                        {(item.customerPhone || "No phone") + " • " + item.locationName}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] ${
                        item.rating >= 4
                          ? "bg-emerald-400/10 text-emerald-200"
                          : item.rating === 3
                            ? "bg-amber-400/10 text-amber-100"
                            : "bg-red-500/10 text-red-200"
                      }`}
                    >
                      {`${item.rating}★`}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-white/56">
                    {item.customerMessage ||
                      item.sentimentSummary ||
                      "No written feedback message captured."}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/6 bg-white/[0.03] p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-white/28">
              Integrations and billing
            </p>
            <div className="mt-4 space-y-3">
              {snapshot.integrations.slice(0, 5).map((integration: IntegrationRow) => (
                <div
                  key={integration._id}
                  className="rounded-2xl border border-white/8 bg-black/10 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {integration.label}
                      </p>
                      <p className="mt-1 text-xs text-white/38">
                        {`${integration.provider} • ${integration.category}`}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-white/45">
                      {integration.status}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-white/36">
                    Last sync: {formatDateTime(integration.lastSyncAt)}
                  </p>
                </div>
              ))}
              {snapshot.integrations.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-black/10 p-4 text-sm text-white/42">
                  No integrations connected yet.
                </div>
              ) : null}

              <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                <p className="text-sm font-medium text-white">
                  Invoice and payment troubleshooting
                </p>
                <p className="mt-2 text-sm leading-7 text-white/46">
                  ReviewPilot shows subscription health here, but Stripe remains the source of truth for invoice history, payment retries, and card failures. Use the Stripe customer and subscription IDs from this workspace when you need invoice-level detail.
                </p>
              </div>

              {snapshot.recentPurchases.length > 0 ? (
                <div className="rounded-2xl border border-white/8 bg-black/10 p-4">
                  <p className="text-sm font-medium text-white">
                    Recent platform purchases
                  </p>
                  <div className="mt-3 space-y-3">
                    {snapshot.recentPurchases.map((purchase: PurchaseRow) => (
                      <div
                        key={purchase._id}
                        className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm text-white">{purchase.reference}</p>
                          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-white/45">
                            {purchase.kind.replace("_", " ")}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-white/36">
                          {`${purchase.stripeCheckoutSessionId} • ${formatDateTime(
                            purchase.createdAt
                          )}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
