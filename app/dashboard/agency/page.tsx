"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { BUSINESS_TYPE_OPTIONS, type BusinessType } from "@/lib/business-copy";
import {
  WorkspaceHero,
  WorkspaceHeroStat,
  WorkspaceSectionHeader,
} from "@/components/ui/workspace-page";

export default function AgencyPage() {
  const restaurantId = useRestaurantId();
  const { userId } = useAuth();
  const restaurant = useQuery(
    api.queries.getRestaurant,
    restaurantId ? { restaurantId } : "skip"
  );
  const agencyDashboard = useQuery(
    api.agency.getAgencyDashboard,
    restaurantId && restaurant?.tier === 3 ? { agencyRestaurantId: restaurantId } : "skip"
  );
  type AgencyItem = NonNullable<typeof agencyDashboard>["items"][number];
  const createManagedClient = useMutation(api.agency.createManagedClient);
  const updateManagedClientStatus = useMutation(api.agency.updateManagedClientStatus);

  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
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
    contactName: "",
    notes: "",
    monthlyRetainerCents: "",
    tier: 1,
  });

  const totalManagedRevenue = useMemo(() => {
    if (!agencyDashboard) return 0;
    return agencyDashboard.managedMrr + agencyDashboard.monthlyRetainerCents / 100;
  }, [agencyDashboard]);

  if (!restaurantId || !restaurant) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-500">Loading agency workspace...</p>
      </div>
    );
  }

  if (restaurant.tier < 3) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-white/28">
            Agency control room
          </p>
          <h1 className="mt-2 text-3xl font-light tracking-tight text-white">
            Manage client accounts from one place
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/46">
            The Agency plan unlocks a managed-clients control room so you can create
            client workspaces, monitor their usage, and keep their rollout in one
            portfolio dashboard.
          </p>
        </div>

        <div className="rounded-[2rem] border border-emerald-500/18 bg-emerald-500/[0.08] p-6">
          <p className="text-sm font-semibold text-emerald-100">
            Upgrade to Agency to unlock:
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[
              "Create and onboard multiple client workspaces from one dashboard",
              "Track client plan, usage, and customer count in one portfolio",
              "Store per-client retainer value and operating notes",
              "Use ReviewPilot as an agency delivery layer instead of a single-business tool",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-7 text-white/72"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleCreateClient = async () => {
    if (!restaurantId || !userId) return;

    setSaving(true);
    try {
      await createManagedClient({
        actorClerkId: userId,
        agencyRestaurantId: restaurantId,
        name: form.name,
        slug: form.slug,
        ownerEmail: form.ownerEmail,
        businessType: form.businessType,
        businessSubtype: form.businessSubtype || undefined,
        contactPhone: form.contactPhone || undefined,
        websiteUrl: form.websiteUrl || undefined,
        googleBusinessUrl: form.googleBusinessUrl || undefined,
        twilioNumber: form.twilioNumber || undefined,
        contactName: form.contactName || undefined,
        notes: form.notes || undefined,
        monthlyRetainerCents: form.monthlyRetainerCents
          ? Math.round(Number(form.monthlyRetainerCents) * 100)
          : undefined,
        tier: form.tier,
      });
      setShowCreate(false);
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
        contactName: "",
        notes: "",
        monthlyRetainerCents: "",
        tier: 1,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!agencyDashboard) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-500">Loading managed clients...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <WorkspaceHero
        eyebrow="Agency control room"
        title="Run your managed client portfolio from one delivery workspace"
        description="Create new client accounts, keep retainers and plan value visible, and monitor rollout health without bouncing between spreadsheets and separate product accounts."
        actions={
          <button
            type="button"
            onClick={() => setShowCreate((current) => !current)}
            className="rounded-[1.25rem] bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-5 py-3 text-sm font-semibold text-slate-950"
          >
            {showCreate ? "Close client form" : "Add managed client"}
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <WorkspaceHeroStat
          eyebrow="Active"
          label="Managed clients in flight"
          value={`${agencyDashboard.activeClients}`}
          note="These clients are the current delivery footprint for the agency."
          icon="agency"
        />
        <WorkspaceHeroStat
          eyebrow="Paused"
          label="Client accounts on hold"
          value={`${agencyDashboard.pausedClients}`}
          note="Pause here when delivery is deferred without deleting the workspace."
          icon="clock"
        />
        <WorkspaceHeroStat
          eyebrow="Portfolio"
          label="ReviewPilot MRR under management"
          value={`$${agencyDashboard.managedMrr}`}
          note="Platform plan value across the managed client book."
          icon="billing"
        />
        <WorkspaceHeroStat
          eyebrow="Revenue"
          label="Combined managed revenue"
          value={`$${totalManagedRevenue.toFixed(2)}`}
          note="Includes both platform value and your stored retainers."
          icon="rocket"
        />
      </div>

      {showCreate && (
        <section className="rounded-[2rem] border border-white/6 bg-white/[0.02] p-6">
          <h2 className="text-lg font-medium text-white">Create managed client</h2>
          <p className="mt-1 text-sm text-white/42">
            This creates a client workspace, starter settings, a primary location, and
            links the client to this agency portfolio.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ["name", "Business name"],
              ["slug", "Workspace slug"],
              ["ownerEmail", "Owner email"],
              ["contactName", "Primary contact"],
              ["businessSubtype", "Specialty / focus"],
              ["contactPhone", "Contact phone"],
              ["websiteUrl", "Website"],
              ["googleBusinessUrl", "Google review URL"],
              ["twilioNumber", "Twilio number"],
              ["monthlyRetainerCents", "Monthly retainer (USD)"],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="block text-sm text-white/50">{label}</label>
                <input
                  value={form[key as keyof typeof form] as string}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, [key]: e.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm text-white/50">Business type</label>
              <select
                value={form.businessType}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    businessType: e.target.value as BusinessType,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
              >
                {BUSINESS_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-white/50">Client plan</label>
              <select
                value={form.tier}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    tier: Number(e.target.value),
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
              >
                <option value={1}>Starter</option>
                <option value={2}>Pro</option>
                <option value={3}>Agency</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-white/50">Notes</label>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(e) =>
                  setForm((current) => ({ ...current, notes: e.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCreateClient}
              className="rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-5 py-3 text-sm font-semibold text-slate-950"
            >
              {saving ? "Creating client..." : "Create client workspace"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-white/58"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      <section className="rounded-[2rem] border border-white/6 bg-white/[0.02] p-6">
        <WorkspaceSectionHeader
          eyebrow="Managed clients"
          title="Track plan, usage, customer count, and operating notes across the client book"
          description="This list is meant to feel like an agency delivery board, not a flat table of accounts."
          action={
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/52">
              {agencyDashboard.totalSmsUsed}/{agencyDashboard.totalSmsLimit} portfolio SMS used
            </div>
          }
        />

        <div className="mt-6 space-y-4">
          {agencyDashboard.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center text-white/42">
              No managed clients yet. Create the first one to start using ReviewPilot as
              an agency platform.
            </div>
          ) : (
            agencyDashboard.items.map((item: AgencyItem) => (
              <div
                key={item._id}
                className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">
                        {item.restaurant.name}
                      </h3>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/58">
                        {item.planName}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          item.status === "ACTIVE"
                            ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                            : item.status === "PAUSED"
                              ? "border border-amber-500/20 bg-amber-500/10 text-amber-200"
                              : "border border-white/10 bg-white/[0.03] text-white/48"
                        }`}
                      >
                        {item.status.toLowerCase()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-white/46">
                      Owner: {item.ownerEmail} · {item.customerCount} customers ·{" "}
                      {item.restaurant.smsUsed}/{item.restaurant.smsLimit} SMS used
                    </p>
                    {item.notes && (
                      <p className="mt-2 text-sm leading-7 text-white/58">{item.notes}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {(["ACTIVE", "PAUSED", "REMOVED"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={async () => {
                          if (!userId || !restaurantId) return;
                          await updateManagedClientStatus({
                            actorClerkId: userId,
                            agencyRestaurantId: restaurantId,
                            relationshipId: item._id,
                            status,
                            notes: item.notes,
                            monthlyRetainerCents: item.monthlyRetainerCents,
                          });
                        }}
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60"
                      >
                        Mark {status.toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                      Plan value
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      ${item.monthlyPlanValue}/mo
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                      Retainer
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      ${((item.monthlyRetainerCents ?? 0) / 100).toFixed(2)}/mo
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                      Review link
                    </p>
                    <p className="mt-2 truncate text-sm text-white/62">
                      {item.restaurant.googleBusinessUrl ?? "Not set"}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
