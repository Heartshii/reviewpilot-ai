"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const templates = [
  {
    key: "template_welcome",
    label: "Welcome SMS",
    placeholder: "Hi [name]! Thanks for visiting [business]...",
  },
  {
    key: "template_apology",
    label: "Apology SMS",
    placeholder: "Hi [name], we're sorry about your experience...",
  },
  {
    key: "template_birthday",
    label: "Birthday SMS",
    placeholder:
      "Happy Birthday [name]! We have a treat waiting on your next visit...",
  },
];

const features = [
  { key: "loyalty", label: "Loyalty Points" },
  { key: "bulkSms", label: "Bulk SMS" },
  { key: "aiDrafting", label: "AI Drafting" },
  { key: "reengagement", label: "Re-engagement" },
  { key: "birthdaySms", label: "Birthday SMS" },
  { key: "kioskBranding", label: "Kiosk Branding" },
];

const tierColors = ["text-zinc-400", "text-blue-400", "text-emerald-400"];

export default function AdminSettingsPage() {
  const updateSetting = useMutation(api.adminMutations.updateGlobalSetting);
  const [templateValues, setTemplateValues] = useState<Record<string, string>>(
    {}
  );
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});

  const handleSave = async (key: string) => {
    await updateSetting({ key, value: templateValues[key] ?? "" });
    setSaved((p) => ({ ...p, [key]: true }));
    setTimeout(() => setSaved((p) => ({ ...p, [key]: false })), 2000);
  };

  const handleFeatureToggle = async (key: string, checked: boolean) => {
    setFeatureFlags((p) => ({ ...p, [key]: checked }));
    await updateSetting({ key, value: checked ? "true" : "false" });
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-white">
          Platform Settings
        </h1>
        <p className="mt-1 text-sm text-white/30">
          Global defaults and feature configuration
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-4">
          <p className="text-xs font-medium uppercase tracking-widest text-white/30">
            SMS Templates
          </p>
          <div className="h-px flex-1 bg-white/5" />
        </div>
        {templates.map(({ key, label, placeholder }) => (
          <div
            key={key}
            className="rounded-2xl border border-white/5 bg-white/[0.02] p-5"
          >
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium text-white/70">{label}</label>
              <span className="text-xs text-white/20">Use [name], [business]</span>
            </div>
            <textarea
              rows={3}
              placeholder={placeholder}
              value={templateValues[key] ?? ""}
              onChange={(e) =>
                setTemplateValues((p) => ({ ...p, [key]: e.target.value }))
              }
              className="w-full resize-none rounded-xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder-white/15 focus:border-white/15"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-white/20">
                {(templateValues[key] ?? "").length} chars
              </span>
              <button
                onClick={() => handleSave(key)}
                className={`rounded-xl px-4 py-1.5 text-xs font-medium transition-all ${
                  saved[key]
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "border border-white/10 text-white/50 hover:border-white/20 hover:text-white/80"
                }`}
              >
                {saved[key] ? "Saved" : "Save"}
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-4">
          <p className="text-xs font-medium uppercase tracking-widest text-white/30">
            Feature Flags by Tier
          </p>
          <div className="h-px flex-1 bg-white/5" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-widest text-white/20">
                    Feature
                  </th>
                  {["Starter", "Growth", "Scale"].map((t, i) => (
                    <th
                      key={t}
                      className={`px-5 py-3 text-center text-xs font-medium ${tierColors[i]}`}
                    >
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map(({ key, label }, fi) => (
                  <tr
                    key={key}
                    className={`border-b border-white/[0.03] ${
                      fi % 2 === 0 ? "" : "bg-white/[0.01]"
                    }`}
                  >
                    <td className="px-5 py-3.5 text-sm text-white/60">{label}</td>
                    {[1, 2, 3].map((tier) => {
                      const fk = `feature_${key}_tier${tier}`;
                      return (
                        <td key={tier} className="px-5 py-3.5 text-center">
                          <label className="relative inline-flex cursor-pointer items-center justify-center">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={featureFlags[fk] ?? false}
                              onChange={(e) =>
                                handleFeatureToggle(fk, e.target.checked)
                              }
                            />
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
                                featureFlags[fk]
                                  ? "border-transparent bg-emerald-500 text-white"
                                  : "border-white/15 bg-transparent"
                              }`}
                            >
                              {featureFlags[fk] && (
                                <span className="text-[10px]">+</span>
                              )}
                            </div>
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
