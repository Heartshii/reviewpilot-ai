"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useE2ESession } from "@/hooks/useE2ESession";
import { useEnsureUser } from "@/hooks/useEnsureUser";
import { useIsClient } from "@/hooks/useIsClient";
import { useLocationScope } from "@/hooks/useLocationScope";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import {
  DEFAULT_POS_IMPORT_DELAY_MINUTES,
  DEFAULT_RESERVATION_DELAY_MINUTES,
  POS_PROVIDERS,
  PROVIDER_DESCRIPTIONS,
  PROVIDER_LABELS,
  RESERVATION_PROVIDERS,
  type IntegrationProvider,
  type PosProvider,
} from "@/lib/integrations";
import {
  WorkspaceHero,
  WorkspaceHeroStat,
  WorkspaceSectionHeader,
} from "@/components/ui/workspace-page";

type IntegrationDoc = Doc<"integrations"> & {
  endpointPath: string;
  description: string;
};

type FormState = {
  integrationId?: Id<"integrations">;
  locationId?: Id<"locations">;
  providerLocationId: string;
  status: "ACTIVE" | "PAUSED";
  followupDelayMinutes: number;
  defaultBillAmount: string;
  autoCreateCustomers: boolean;
  autoImportReceipts: boolean;
  autoSendFollowupSms: boolean;
  notes: string;
  webhookSecret?: string;
  endpointPath?: string;
};

function makeDefaultForm(
  provider: IntegrationProvider,
  locationId?: Id<"locations">
): FormState {
  return {
    locationId,
    providerLocationId: "",
    status: "ACTIVE",
    followupDelayMinutes: POS_PROVIDERS.includes(provider as PosProvider)
      ? DEFAULT_POS_IMPORT_DELAY_MINUTES
      : DEFAULT_RESERVATION_DELAY_MINUTES,
    defaultBillAmount: POS_PROVIDERS.includes(provider as PosProvider) ? "" : "0",
    autoCreateCustomers: true,
    autoImportReceipts: true,
    autoSendFollowupSms: true,
    notes: "",
  };
}

function cardTone(status?: "ACTIVE" | "PAUSED") {
  if (status === "ACTIVE") {
    return "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200";
  }
  return "border-white/10 bg-white/[0.04] text-white/60";
}

export default function DashboardIntegrationsPage() {
  const { user } = useUser();
  const { session: e2eSession } = useE2ESession();
  const isClient = useIsClient();
  const restaurantId = useRestaurantId();
  const { convexUser } = useEnsureUser();
  const { locations, selectedLocationId } = useLocationScope();
  const integrations = useQuery(
    api.integrations.getIntegrationsForRestaurant,
    restaurantId ? { restaurantId } : "skip"
  ) as IntegrationDoc[] | undefined;
  const recentEvents = useQuery(
    api.integrations.getRecentIntegrationEvents,
    restaurantId ? { restaurantId } : "skip"
  ) as Array<Doc<"integrationEvents">> | undefined;
  const upsertIntegration = useMutation(api.integrations.upsertIntegration);
  const rotateSecret = useMutation(api.integrations.rotateIntegrationSecret);
  const sendTestPosImport = useMutation(api.integrations.sendTestPosImport);
  const sendTestReservationImport = useMutation(
    api.integrations.sendTestReservationImport
  );
  const [forms, setForms] = useState<Record<string, FormState>>({});
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const actorClerkId = user?.id ?? e2eSession?.clerkId ?? null;
  const origin = isClient ? window.location.origin : "";

  const integrationsByProvider = useMemo(() => {
    const map = new Map<IntegrationProvider, IntegrationDoc>();
    for (const integration of integrations ?? []) {
      map.set(integration.provider, integration);
    }
    return map;
  }, [integrations]);

  const defaultLocationId =
    selectedLocationId !== "ALL"
      ? selectedLocationId
      : locations[0]?._id;

  useEffect(() => {
    if (!locations.length || Object.keys(forms).length > 0) {
      return;
    }

    const seed = Object.fromEntries(
      [...POS_PROVIDERS, ...RESERVATION_PROVIDERS].map((provider) => {
        const existing = integrationsByProvider.get(provider);
        const locationId =
          existing?.locationId ??
          defaultLocationId;

        return [
          provider,
          existing
            ? {
                integrationId: existing._id,
                locationId,
                providerLocationId: existing.providerLocationId ?? "",
                status: existing.status,
                followupDelayMinutes:
                  existing.followupDelayMinutes ??
                  (POS_PROVIDERS.includes(provider as PosProvider)
                    ? DEFAULT_POS_IMPORT_DELAY_MINUTES
                    : DEFAULT_RESERVATION_DELAY_MINUTES),
                defaultBillAmount:
                  existing.defaultBillAmount != null
                    ? String(existing.defaultBillAmount)
                    : "",
                autoCreateCustomers: existing.autoCreateCustomers,
                autoImportReceipts: existing.autoImportReceipts,
                autoSendFollowupSms: existing.autoSendFollowupSms,
                notes: existing.notes ?? "",
                webhookSecret: existing.webhookSecret,
                endpointPath: existing.endpointPath,
              }
            : makeDefaultForm(provider, locationId),
        ];
      })
    ) as Record<string, FormState>;

    setForms(seed);
  }, [defaultLocationId, forms, integrationsByProvider, locations]);

  useEffect(() => {
    if (!defaultLocationId) {
      return;
    }

    setForms((current) => {
      if (Object.keys(current).length === 0) {
        return current;
      }

      let changed = false;
      const next: Record<string, FormState> = {};
      for (const [provider, form] of Object.entries(current)) {
        if (!form.locationId) {
          next[provider] = { ...form, locationId: defaultLocationId };
          changed = true;
        } else {
          next[provider] = form;
        }
      }
      return changed ? next : current;
    });
  }, [defaultLocationId]);

  if (!restaurantId || !convexUser) {
    return (
      <div className="p-6 text-sm text-white/55">Loading integrations...</div>
    );
  }

  const updateForm = (
    provider: IntegrationProvider,
    patch: Partial<FormState>
  ) => {
    setForms((current) => ({
      ...current,
      [provider]: { ...current[provider], ...patch },
    }));
  };

  const handleSave = async (provider: IntegrationProvider) => {
    if (!actorClerkId) {
      setMessage("Sign in again before saving this integration.");
      return;
    }

    const form = forms[provider];
    if (!form) {
      return;
    }

    setBusyProvider(provider);
    setMessage(null);
    try {
      const integrationId = await upsertIntegration({
        actorClerkId,
        restaurantId,
        integrationId: form.integrationId,
        provider,
        locationId: form.locationId,
        providerLocationId: form.providerLocationId.trim() || undefined,
        status: form.status,
        followupDelayMinutes: form.followupDelayMinutes,
        defaultBillAmount:
          form.defaultBillAmount.trim() === ""
            ? undefined
            : Number(form.defaultBillAmount),
        autoCreateCustomers: form.autoCreateCustomers,
        autoImportReceipts: form.autoImportReceipts,
        autoSendFollowupSms: form.autoSendFollowupSms,
        notes: form.notes.trim() || undefined,
      });

      const created = integrationsByProvider.get(provider);
      updateForm(provider, {
        integrationId,
        endpointPath:
          created?.endpointPath ?? forms[provider]?.endpointPath,
        webhookSecret:
          created?.webhookSecret ?? forms[provider]?.webhookSecret,
      });
      setMessage(`${PROVIDER_LABELS[provider]} connection saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusyProvider(null);
    }
  };

  const handleRotateSecret = async (provider: IntegrationProvider) => {
    if (!actorClerkId) {
      return;
    }

    const integrationId = forms[provider]?.integrationId;
    if (!integrationId) {
      setMessage("Save the integration once before rotating its secret.");
      return;
    }

    setBusyProvider(provider);
    setMessage(null);
    try {
      const result = await rotateSecret({
        actorClerkId,
        restaurantId,
        integrationId,
      });
      updateForm(provider, { webhookSecret: result.webhookSecret });
      setMessage(`${PROVIDER_LABELS[provider]} webhook secret rotated.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Secret rotation failed.");
    } finally {
      setBusyProvider(null);
    }
  };

  const handleTest = async (provider: IntegrationProvider) => {
    if (!actorClerkId) {
      return;
    }

    const integrationId = forms[provider]?.integrationId;
    if (!integrationId) {
      setMessage("Save the integration first so ReviewPilot has an endpoint.");
      return;
    }

    setBusyProvider(provider);
    setMessage(null);
    try {
      if (POS_PROVIDERS.includes(provider as PosProvider)) {
        await sendTestPosImport({
          actorClerkId,
          restaurantId,
          integrationId,
        });
      } else {
        await sendTestReservationImport({
          actorClerkId,
          restaurantId,
          integrationId,
        });
      }
      setMessage(`${PROVIDER_LABELS[provider]} test import sent.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Test import failed.");
    } finally {
      setBusyProvider(null);
    }
  };

  const renderProviderCard = (
    provider: IntegrationProvider,
    typeLabel: string,
    supportingCopy: string
  ) => {
    const form = forms[provider] ?? makeDefaultForm(provider, locations[0]?._id);
    const existing = integrationsByProvider.get(provider);
    const endpointPath = existing?.endpointPath ?? form.endpointPath;
    const endpointUrl = endpointPath ? `${origin}${endpointPath}` : null;

    return (
      <section
        key={provider}
        className="group rounded-[1.75rem] border border-white/6 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(7,17,29,0.35)] transition-transform hover:-translate-y-1"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/32">
              {typeLabel}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {PROVIDER_LABELS[provider]}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/55">
              {PROVIDER_DESCRIPTIONS[provider]} {supportingCopy}
            </p>
          </div>
          <div
            className={`rounded-full border px-3 py-1 text-xs font-medium ${cardTone(
              existing?.status ?? form.status
            )}`}
          >
            {existing ? existing.status : "Not connected"}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-white/70">
            <span className="text-white/45">Location</span>
            <select
              value={form.locationId ?? defaultLocationId ?? ""}
              onChange={(event) =>
                updateForm(provider, {
                  locationId: event.target.value as Id<"locations">,
                })
              }
              disabled={locations.length === 0}
              className="w-full rounded-2xl border border-white/8 bg-[#08111d] px-4 py-3 text-white outline-none disabled:opacity-50"
            >
              {locations.length === 0 ? (
                <option value="" className="bg-slate-950">
                  Create a location first
                </option>
              ) : null}
              {locations.map((location) => (
                <option key={location._id} value={location._id} className="bg-slate-950">
                  {location.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-white/70">
            <span className="text-white/45">Provider location / venue ID</span>
            <input
              value={form.providerLocationId ?? ""}
              onChange={(event) =>
                updateForm(provider, { providerLocationId: event.target.value })
              }
              placeholder="Optional provider-side location identifier"
              className="w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/24 outline-none"
            />
          </label>

          <label className="space-y-2 text-sm text-white/70">
            <span className="text-white/45">Follow-up delay (minutes)</span>
            <input
              type="number"
              min={0}
              max={10080}
              value={form.followupDelayMinutes ?? 0}
              onChange={(event) =>
                updateForm(provider, {
                  followupDelayMinutes: Number(event.target.value || 0),
                })
              }
              className="w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-white outline-none"
            />
          </label>

          <label className="space-y-2 text-sm text-white/70">
            <span className="text-white/45">
              {POS_PROVIDERS.includes(provider as PosProvider)
                ? "Fallback bill amount"
                : "Default visit amount"}
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.defaultBillAmount ?? ""}
              onChange={(event) =>
                updateForm(provider, { defaultBillAmount: event.target.value })
              }
              placeholder={
                POS_PROVIDERS.includes(provider as PosProvider)
                  ? "Only used if the provider omits totals"
                  : "Optional amount to convert visits into points"
              }
              className="w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/24 outline-none"
            />
          </label>
        </div>

        <label className="mt-4 block space-y-2 text-sm text-white/70">
          <span className="text-white/45">Internal notes</span>
          <textarea
            rows={3}
            value={form.notes ?? ""}
            onChange={(event) => updateForm(provider, { notes: event.target.value })}
            placeholder="Store setup notes, expected webhook event types, or client-specific handling."
            className="w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/24 outline-none"
          />
        </label>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <label className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
            <input
              type="checkbox"
              checked={form.autoCreateCustomers ?? false}
              onChange={(event) =>
                updateForm(provider, { autoCreateCustomers: event.target.checked })
              }
              className="mr-3"
            />
            Auto-create customers
          </label>
          <label className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
            <input
              type="checkbox"
              checked={form.autoImportReceipts ?? false}
              onChange={(event) =>
                updateForm(provider, { autoImportReceipts: event.target.checked })
              }
              className="mr-3"
            />
            Import receipts and points
          </label>
          <label className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
            <input
              type="checkbox"
              checked={form.autoSendFollowupSms ?? false}
              onChange={(event) =>
                updateForm(provider, { autoSendFollowupSms: event.target.checked })
              }
              className="mr-3"
            />
            Trigger follow-up SMS
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="rounded-2xl border border-white/7 bg-[#09131f]/80 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/30">
              Webhook endpoint
            </p>
            <p className="mt-2 break-all font-mono text-sm text-emerald-200">
              {endpointUrl ?? "Save this provider to generate a live endpoint."}
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.16em] text-white/30">
              Shared secret
            </p>
            <p className="mt-2 break-all font-mono text-sm text-white/74">
              {existing?.webhookSecret ?? form.webhookSecret ?? "Generated on first save"}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() =>
                updateForm(provider, {
                  status: form.status === "ACTIVE" ? "PAUSED" : "ACTIVE",
                })
              }
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70"
            >
              Mark as {form.status === "ACTIVE" ? "paused" : "active"}
            </button>
            <button
              type="button"
              onClick={() => void handleRotateSecret(provider)}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70"
            >
              Rotate secret
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleSave(provider)}
            disabled={busyProvider === provider}
            className="rounded-[1.25rem] bg-[linear-gradient(135deg,#34d399,#4cc9f0)] px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(76,201,240,0.18)] disabled:opacity-60"
          >
            {busyProvider === provider ? "Saving..." : "Save integration"}
          </button>
          <button
            type="button"
            onClick={() => void handleTest(provider)}
            disabled={busyProvider === provider}
            className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-6 py-3 text-sm text-white/72 disabled:opacity-60"
          >
            Send test import
          </button>
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-8 px-5 py-6 sm:px-6">
      <WorkspaceHero
        eyebrow="Integrations"
        title="Connect the systems that already know when a visit happened"
        description="Link POS and reservation providers so customer visits can become receipts, loyalty events, and timed follow-up automatically. ReviewPilot gives each provider a secure endpoint, secret, and test path."
        scope="Save a provider, copy the webhook endpoint and secret, then paste those into the vendor dashboard."
        actions={
          <a
            href="#integration-providers"
            className="rounded-[1.25rem] bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-4 py-3 text-sm font-semibold text-slate-950"
          >
            Configure providers
          </a>
        }
      />

      {message ? (
        <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <WorkspaceHeroStat
          eyebrow="Connected"
          label="Active provider connections"
          value={`${integrations?.filter((integration) => integration.status === "ACTIVE").length ?? 0}`}
          note="These providers are live and ready to feed customer activity."
          icon="integrations"
        />
        <WorkspaceHeroStat
          eyebrow="Coverage"
          label="Locations with integration scope"
          value={`${new Set((integrations ?? []).map((integration) => integration.locationId).filter(Boolean)).size}`}
          note="Use location-specific mappings when operations differ by branch."
          icon="layers"
        />
        <WorkspaceHeroStat
          eyebrow="Events"
          label="Recent import events logged"
          value={`${recentEvents?.length ?? 0}`}
          note="Review these after sending test imports from the vendor side."
          icon="receipt"
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.75rem] border border-white/6 bg-white/[0.03] p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-white/30">
            How to connect a provider
          </p>
          <div className="mt-4 space-y-3">
            {[
              "1. Choose the ReviewPilot location that should receive imported visits or receipts.",
              "2. Save the provider card once so ReviewPilot generates a unique webhook endpoint and shared secret.",
              "3. Copy the endpoint into Square, Toast, Clover, OpenTable, or Resy as a webhook destination.",
              "4. Add the shared secret on the provider side if the provider supports signing or secret headers.",
              "5. Use Send test import to confirm ReviewPilot can create events before going live.",
            ].map((step) => (
              <div
                key={step}
                className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white/62"
              >
                {step}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-sky-500/15 bg-sky-500/[0.05] p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-sky-200/80">
            What this integration does
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              {
                title: "POS receipts",
                body: "Closed tickets can update spend, loyalty points, and follow-up timing without manual bill entry.",
              },
              {
                title: "Reservation completions",
                body: "Completed appointments or tables can create a follow-up event even when nobody used the kiosk.",
              },
              {
                title: "Location-aware routing",
                body: "Every provider connection can map into the correct location so messages and analytics stay scoped.",
              },
              {
                title: "Safe rollout",
                body: "Use test imports first, then point the live provider webhook at the generated endpoint when you are ready.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4"
              >
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-7 text-white/60">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="integration-providers" className="space-y-4">
        <WorkspaceSectionHeader
          eyebrow="POS imports"
          title="Auto-pull receipts into loyalty and review workflows"
          description="Use these cards when a business wants receipts and spend totals to flow into customer history automatically."
        />
        <div className="grid gap-5 xl:grid-cols-2">
          {POS_PROVIDERS.map((provider) =>
            renderProviderCard(
              provider,
              "POS receipts",
              "Imported tickets update tracked spend, loyalty points, and the follow-up timer without needing a tablet check-in."
            )
          )}
        </div>
      </section>

      <section className="space-y-4">
        <WorkspaceSectionHeader
          eyebrow="Reservation follow-up"
          title="Start review outreach after completed appointments or tables"
          description="Use these when bookings or appointments should trigger follow-up even when the customer never touches the kiosk."
        />
        <div className="grid gap-5 xl:grid-cols-2">
          {RESERVATION_PROVIDERS.map((provider) =>
            renderProviderCard(
              provider,
              "Reservations",
              "Completed reservations can become customer visits automatically, with follow-up SMS scheduled after the visit window closes."
            )
          )}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-white/6 bg-white/[0.03] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-white/30">
              Recent import activity
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Last 24 integration events
            </h2>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {(recentEvents ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-white/45">
              No imports yet. Save a provider, copy its endpoint, and send a test
              payload to see events appear here.
            </div>
          ) : (
            recentEvents?.map((event) => (
              <div
                key={event._id}
                className="rounded-2xl border border-white/7 bg-[#09131f]/75 px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {PROVIDER_LABELS[event.provider]} {event.category === "POS" ? "import" : "reservation"}
                    </p>
                    <p className="mt-1 text-sm text-white/52">{event.summary}</p>
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-xs ${cardTone(
                    event.status === "PROCESSED"
                      ? "ACTIVE"
                      : event.status === "FAILED"
                        ? "PAUSED"
                        : "PAUSED"
                  )}`}>
                    {event.status}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/34">
                  <span>{new Date(event.createdAt).toLocaleString()}</span>
                  <span>{event.eventType}</span>
                  <span>{event.externalId}</span>
                </div>
                {event.error ? (
                  <p className="mt-3 text-sm text-rose-300">{event.error}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
