"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const templates = [
  { key: "template_welcome", label: "Welcome SMS", placeholder: "Hi [name]! Thanks for visiting [restaurant]..." },
  { key: "template_apology", label: "Apology SMS", placeholder: "Hi [name], we're sorry about your experience..." },
  { key: "template_birthday", label: "Birthday SMS", placeholder: "Happy Birthday [name]! Free dessert on your next visit..." },
];

const features = [
  { key: "loyalty", label: "Loyalty Points" },
  { key: "bulkSms", label: "Bulk SMS" },
  { key: "aiDrafting", label: "AI Drafting" },
  { key: "reengagement", label: "Re-engagement" },
  { key: "birthdaySms", label: "Birthday SMS" },
  { key: "kioskBranding", label: "Kiosk Branding" },
];

export default function AdminSettingsPage() {
  const updateSetting = useMutation(api.adminMutations.updateGlobalSetting);
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const handleSave = async (key: string) => {
    await updateSetting({ key, value: templateValues[key] ?? "" });
    setSaved((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => setSaved((prev) => ({ ...prev, [key]: false })), 2000);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Platform Settings</h1>

      <div className="space-y-4">
        <h2 className="font-semibold text-zinc-300">Global SMS Templates</h2>
        <p className="text-sm text-zinc-500">
          These are the default templates used when restaurants have not set their own.
        </p>
        {templates.map(({ key, label, placeholder }) => (
          <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <label className="mb-2 block font-medium">{label}</label>
            <textarea
              rows={3}
              placeholder={placeholder}
              value={templateValues[key] ?? ""}
              onChange={(e) =>
                setTemplateValues((prev) => ({ ...prev, [key]: e.target.value }))
              }
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500"
            />
            <button
              onClick={() => handleSave(key)}
              className="mt-2 rounded bg-emerald-500 px-4 py-1.5 text-sm text-black hover:bg-emerald-400"
            >
              {saved[key] ? "✅ Saved!" : "Save"}
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold text-zinc-300">Feature Flags by Tier</h2>
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Feature</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-zinc-400">Tier 1</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-zinc-400">Tier 2</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-zinc-400">Tier 3</th>
              </tr>
            </thead>
            <tbody>
              {features.map(({ key, label }) => (
                <tr key={key} className="border-b border-zinc-800">
                  <td className="px-4 py-3 text-sm">{label}</td>
                  {[1, 2, 3].map((tier) => {
                    const settingKey = `feature_${key}_tier${tier}`;
                    return (
                      <td key={tier} className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-emerald-500"
                          onChange={(e) =>
                            updateSetting({
                              key: settingKey,
                              value: e.target.checked ? "true" : "false",
                            })
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
