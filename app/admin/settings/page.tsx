"use client";

import { useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppIcon, IconBadge } from "@/components/ui/premium-icon";

const templates = [
  {
    key: "template_welcome",
    label: "Welcome SMS",
    helper: "Used when a new customer enters the follow-up funnel.",
    placeholder: "Hi [name]! Thanks for visiting [business]...",
  },
  {
    key: "template_apology",
    label: "Apology SMS",
    helper: "Base recovery language for negative experiences.",
    placeholder: "Hi [name], we're sorry about your experience...",
  },
  {
    key: "template_birthday",
    label: "Birthday SMS",
    helper: "Lifecycle message for birthday offers and reminders.",
    placeholder:
      "Happy Birthday [name]! We have a treat waiting on your next visit...",
  },
] as const;

const features = [
  {
    key: "loyalty",
    label: "Loyalty points",
    helper: "Point accrual, rewards, and redemption flows",
  },
  {
    key: "bulkSms",
    label: "Bulk SMS",
    helper: "Manual and scheduled outbound messaging",
  },
  {
    key: "aiDrafting",
    label: "AI drafting",
    helper: "Recovery suggestions, public replies, and message help",
  },
  {
    key: "reengagement",
    label: "Re-engagement",
    helper: "Lifecycle outreach for inactive customers",
  },
  {
    key: "birthdaySms",
    label: "Birthday SMS",
    helper: "Automated birthday reminders and offers",
  },
  {
    key: "kioskBranding",
    label: "Kiosk branding",
    helper: "Logo, background, and on-site experience customization",
  },
] as const;

const planColumns = [
  {
    tier: 1,
    label: "Starter",
    price: "$49/mo",
    color:
      "border-zinc-700/60 bg-zinc-900/60 text-zinc-200",
  },
  {
    tier: 2,
    label: "Pro",
    price: "$79/mo",
    color:
      "border-sky-500/25 bg-sky-500/10 text-sky-100",
  },
  {
    tier: 3,
    label: "Agency",
    price: "$149/mo",
    color:
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
  },
] as const;

const playbooks = [
  {
    title: "Password recovery",
    description:
      "Admins cannot view passwords. Direct owners to the sign-in page and ask them to use Clerk's forgot-password flow.",
    action: "Send sign-in link",
    icon: "shield" as const,
  },
  {
    title: "Invoice or card issue",
    description:
      "Use the Stripe customer and subscription IDs from the support console. Stripe remains the invoice source of truth.",
    action: "Open client billing console",
    icon: "billing" as const,
  },
  {
    title: "Customer privacy request",
    description:
      "Use the support console or customer drawer to export or delete a customer's stored records after owner confirmation.",
    action: "Review privacy tooling",
    icon: "customers" as const,
  },
  {
    title: "Feature entitlement dispute",
    description:
      "Confirm the client's plan, review feature gates, then adjust packaging or credits if you need a one-off save.",
    action: "Inspect plan matrix",
    icon: "layers" as const,
  },
] as const;

type SettingsSection = "messaging" | "packaging" | "playbooks";

export default function AdminSettingsPage() {
  const { user } = useUser();
  const settings = useQuery(api.adminMutations.getGlobalSettings);
  const updateSetting = useMutation(api.adminMutations.updateGlobalSetting);
  const actorEmail =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress;

  const [activeSection, setActiveSection] = useState<SettingsSection>("messaging");
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const bannerTimer = useRef<number | null>(null);

  const navigation = useMemo(
    () => [
      {
        id: "messaging" as const,
        label: "Messaging defaults",
        helper: "Global SMS copy and platform-safe starter language",
        icon: "message" as const,
      },
      {
        id: "packaging" as const,
        label: "Plan packaging",
        helper: "What each plan actually unlocks inside the product",
        icon: "layers" as const,
      },
      {
        id: "playbooks" as const,
        label: "Support playbooks",
        helper: "How admins should troubleshoot clients across billing, auth, and privacy",
        icon: "shield" as const,
      },
    ],
    []
  );

  const customizedTemplates = templates.filter(
    (template) =>
      Boolean(templateValues[template.key] ?? settings?.[template.key] ?? "") &&
      (templateValues[template.key] ?? settings?.[template.key] ?? "") !==
        template.placeholder
  ).length;
  const getTemplateValue = (key: string) =>
    templateValues[key] ?? settings?.[key] ?? "";
  const isFeatureEnabled = (key: string) =>
    key in featureFlags ? featureFlags[key] : (settings?.[key] ?? "false") === "true";
  const enabledFeatureFlags = features.reduce((count, feature) => {
    return (
      count +
      planColumns.reduce((planCount, plan) => {
        const key = `feature_${feature.key}_tier${plan.tier}`;
        return planCount + (isFeatureEnabled(key) ? 1 : 0);
      }, 0)
    );
  }, 0);

  const setTransientBanner = (value: string) => {
    setSaveBanner(value);
    if (bannerTimer.current) {
      window.clearTimeout(bannerTimer.current);
    }
    bannerTimer.current = window.setTimeout(() => setSaveBanner(null), 2200);
  };

  const handleSave = async (key: string) => {
    await updateSetting({
      key,
      value: templateValues[key] ?? "",
      actorEmail,
    });
    setSaved((current) => ({ ...current, [key]: true }));
    setTransientBanner("Template saved");
    window.setTimeout(() => {
      setSaved((current) => ({ ...current, [key]: false }));
    }, 2000);
  };

  const handleSaveAllTemplates = async () => {
    await Promise.all(
      templates.map((template) =>
        updateSetting({
          key: template.key,
          value: templateValues[template.key] ?? "",
          actorEmail,
        })
      )
    );
    const nextSaved = templates.reduce<Record<string, boolean>>((acc, template) => {
      acc[template.key] = true;
      return acc;
    }, {});
    setSaved((current) => ({ ...current, ...nextSaved }));
    setTransientBanner("All messaging defaults saved");
    window.setTimeout(() => {
      setSaved((current) => {
        const next = { ...current };
        for (const template of templates) next[template.key] = false;
        return next;
      });
    }, 2000);
  };

  const handleFeatureToggle = async (key: string, checked: boolean) => {
    setFeatureFlags((current) => ({ ...current, [key]: checked }));
    await updateSetting({
      key,
      value: checked ? "true" : "false",
      actorEmail,
    });
    setTransientBanner("Plan packaging updated");
  };

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2.3rem] border border-white/6 bg-[linear-gradient(135deg,rgba(8,17,29,0.96),rgba(8,17,29,0.94)_48%,rgba(16,185,129,0.09))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-white/70">
              <IconBadge
                name="settings"
                className="h-8 w-8 border-white/10 bg-white/[0.04] text-white/75"
                iconClassName="h-[14px] w-[14px]"
              />
              Platform defaults
            </div>
            <div>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Shape the platform before clients ever touch their own workspace settings.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
                This is where ReviewPilot&rsquo;s default voice, package boundaries,
                and support expectations stay honest. Keep the product contract
                tight here so the sales promise and the software always match.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveAllTemplates}
                className="rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-4 py-3 text-sm font-semibold text-slate-950"
              >
                Save all messaging defaults
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("packaging")}
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/75 transition hover:bg-white/[0.08]"
              >
                Review plan packaging
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            {[
              {
                eyebrow: "Messaging",
                label: "Template customization",
                value: `${customizedTemplates}/${templates.length}`,
                note: "Global copy changed from starter defaults",
                icon: "message" as const,
              },
              {
                eyebrow: "Packaging",
                label: "Feature gates enabled",
                value: enabledFeatureFlags,
                note: "Active package toggles across all plans",
                icon: "layers" as const,
              },
              {
                eyebrow: "Operations",
                label: "Support playbooks",
                value: playbooks.length,
                note: "Core admin workflows documented for operators",
                icon: "shield" as const,
              },
              {
                eyebrow: "Status",
                label: "Control status",
                value: saveBanner ? "Synced" : "Live",
                note: saveBanner ?? "Changes here affect future workspace defaults",
                icon: "live" as const,
              },
            ].map((card) => (
              <div
                key={card.label}
                className="flex min-h-[15rem] flex-col rounded-[1.9rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-5 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 max-w-[13rem]">
                    <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/28">
                      {card.eyebrow}
                    </p>
                    <p className="mt-3 font-display text-[1.1rem] font-medium leading-6 tracking-[-0.03em] text-white/94">
                      {card.label}
                    </p>
                  </div>
                  <IconBadge
                    name={card.icon}
                    className="h-11 w-11 shrink-0 border-white/10 bg-white/[0.04] text-white/75"
                    iconClassName="h-[18px] w-[18px]"
                  />
                </div>
                <div className="mt-8 flex items-end justify-between gap-4">
                  <p className="font-display text-[2.15rem] font-semibold leading-none tracking-[-0.04em] text-white">
                    {card.value}
                  </p>
                </div>
                <p className="mt-auto pt-4 text-sm leading-6 text-white/42">
                  {card.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-3">
          {navigation.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`w-full rounded-[1.85rem] border p-5 text-left transition ${
                  active
                    ? "border-emerald-300/20 bg-emerald-300/10"
                    : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <IconBadge
                    name={item.icon}
                    className={`h-11 w-11 ${
                      active
                        ? "border-emerald-300/20 bg-emerald-400/12 text-emerald-100"
                        : "border-white/10 bg-white/[0.04] text-white/72"
                    }`}
                    iconClassName="h-[18px] w-[18px]"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="mt-1 text-xs leading-6 text-white/42">
                      {item.helper}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}

          <div className="rounded-[1.85rem] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3">
              <IconBadge
                name="spark"
                className="h-11 w-11 border-emerald-300/18 bg-emerald-400/12 text-emerald-100"
                iconClassName="h-[18px] w-[18px]"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/30">
                  Admin note
                </p>
                <p className="mt-1 text-sm text-white/46">
                  Keep package rules honest. If a feature isn&rsquo;t truly supported,
                  don&rsquo;t gate it on the pricing page yet.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          {activeSection === "messaging" ? (
            <>
              <section className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-[1.9rem] border border-white/6 bg-white/[0.03] p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                    Template intent
                  </p>
                  <p className="mt-3 text-sm leading-7 text-white/48">
                    Write defaults that work across restaurants, clinics, shops,
                    and service businesses without sounding fake or over-automated.
                  </p>
                </div>
                <div className="rounded-[1.9rem] border border-white/6 bg-white/[0.03] p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                    Supported variables
                  </p>
                  <p className="mt-3 text-sm leading-7 text-white/48">
                    Use placeholders like <span className="text-white/70">[name]</span> and{" "}
                    <span className="text-white/70">[business]</span> so owners can personalize without
                    rewriting every message from scratch.
                  </p>
                </div>
                <div className="rounded-[1.9rem] border border-white/6 bg-white/[0.03] p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                    Safety rule
                  </p>
                  <p className="mt-3 text-sm leading-7 text-white/48">
                    Default language should stay compliant, useful, and generic
                    enough that the first experience still feels trustworthy.
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                {templates.map((template) => (
                  <div
                    key={template.key}
                    className="rounded-[2rem] border border-white/6 bg-white/[0.03] p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-white">{template.label}</p>
                        <p className="mt-1 text-sm text-white/42">{template.helper}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/45">
                          Use [name], [business]
                        </span>
                        {saved[template.key] ? (
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                            Saved
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <textarea
                      rows={4}
                      placeholder={template.placeholder}
                      value={getTemplateValue(template.key)}
                      onChange={(event) =>
                        setTemplateValues((current) => ({
                          ...current,
                          [template.key]: event.target.value,
                        }))
                      }
                      className="mt-4 w-full resize-none rounded-[1.5rem] border border-white/8 bg-black/12 px-4 py-4 text-sm text-white outline-none placeholder-white/18 focus:border-white/16"
                    />
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-white/28">
                        <span>{getTemplateValue(template.key).length} chars</span>
                        <span>Preview safe across all business types</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSave(template.key)}
                        className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                          saved[template.key]
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "border border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06] hover:text-white"
                        }`}
                      >
                        {saved[template.key] ? "Saved" : "Save template"}
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            </>
          ) : null}

          {activeSection === "packaging" ? (
            <section className="space-y-4">
              <div className="rounded-[2rem] border border-white/6 bg-white/[0.03] p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                      Plan packaging
                    </p>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-white/48">
                      This matrix is the product contract between your pricing page
                      and the actual software. Only gate what you are prepared to
                      support operationally.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/8 bg-black/12 px-4 py-3 text-xs text-white/42">
                    Starter → Pro → Agency
                  </div>
                </div>

                <div className="mt-5 grid gap-3 xl:grid-cols-3">
                  {planColumns.map((plan) => (
                    <div
                      key={plan.tier}
                      className={`rounded-[1.6rem] border px-4 py-4 ${plan.color}`}
                    >
                      <p className="text-xs uppercase tracking-[0.16em] opacity-70">
                        Plan
                      </p>
                      <div className="mt-2 flex items-end justify-between gap-3">
                        <p className="text-xl font-semibold">{plan.label}</p>
                        <p className="text-sm opacity-80">{plan.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {features.map((feature) => (
                  <div
                    key={feature.key}
                    className="rounded-[2rem] border border-white/6 bg-white/[0.03] p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-white">{feature.label}</p>
                        <p className="mt-1 text-sm text-white/42">{feature.helper}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/45">
                        Package gate
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 lg:grid-cols-3">
                      {planColumns.map((plan) => {
                        const featureKey = `feature_${feature.key}_tier${plan.tier}`;
                        const enabled = isFeatureEnabled(featureKey);
                        return (
                          <label
                            key={plan.tier}
                            className={`flex cursor-pointer items-center justify-between rounded-[1.45rem] border px-4 py-4 transition ${
                              enabled
                                ? "border-emerald-400/16 bg-emerald-400/10"
                                : "border-white/8 bg-black/12 hover:bg-white/[0.04]"
                            }`}
                          >
                            <div>
                              <p className="text-sm font-medium text-white">{plan.label}</p>
                              <p className="mt-1 text-xs text-white/38">
                                {enabled ? "Feature enabled" : "Feature hidden"}
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={enabled}
                              onChange={(event) =>
                                handleFeatureToggle(featureKey, event.target.checked)
                              }
                            />
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-xl border transition ${
                                enabled
                                  ? "border-transparent bg-emerald-500 text-white"
                                  : "border-white/15 bg-transparent text-transparent"
                              }`}
                            >
                              <AppIcon name="check" className="h-4 w-4" />
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {activeSection === "playbooks" ? (
            <section className="space-y-4">
              <div className="rounded-[2rem] border border-white/6 bg-white/[0.03] p-6">
                <div className="flex items-center gap-3">
                  <IconBadge
                    name="shield"
                    className="h-11 w-11 border-emerald-400/18 bg-[linear-gradient(180deg,rgba(52,211,153,0.14),rgba(76,201,240,0.06))] text-emerald-100"
                    iconClassName="h-[18px] w-[18px]"
                  />
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                      Support playbooks
                    </p>
                    <p className="mt-1 text-sm text-white/45">
                      Give admins a clear operating model for client issues before
                      they improvise inside live workspaces.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {playbooks.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[2rem] border border-white/6 bg-white/[0.03] p-6"
                  >
                    <div className="flex items-center gap-3">
                      <IconBadge
                        name={item.icon}
                        className="h-11 w-11 border-white/10 bg-white/[0.04] text-white/75"
                        iconClassName="h-[18px] w-[18px]"
                      />
                      <div>
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/28">
                          Recommended action
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-white/48">
                      {item.description}
                    </p>
                    <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/55">
                      <AppIcon name="spark" className="h-3.5 w-3.5" />
                      {item.action}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
