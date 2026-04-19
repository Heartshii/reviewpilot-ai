"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useRestaurantId } from "@/hooks/useRestaurantId";

const BIRTHDAY_DEFAULT =
  "Happy Birthday [name]! Free dessert on your next visit. Show this text. - [restaurant]";

type RestaurantSettingsView =
  | Doc<"restaurantSettings">
  | {
      sendDelayMinutes: number;
      birthdayEnabled: boolean;
      reengagement30: boolean;
      reengagement60: boolean;
      reengagement90: boolean;
    };

function buildFormSeed(
  restaurant: Doc<"restaurants">,
  settings: RestaurantSettingsView
) {
  return {
    googleUrl: restaurant.googleBusinessUrl ?? "",
    sendDelay: settings.sendDelayMinutes ?? 60,
    birthdayEnabled: settings.birthdayEnabled ?? true,
    birthdayTemplate:
      "birthdayTemplate" in settings && settings.birthdayTemplate !== undefined
        ? settings.birthdayTemplate
        : BIRTHDAY_DEFAULT,
    re30: settings.reengagement30 ?? true,
    re60: settings.reengagement60 ?? true,
    re90: settings.reengagement90 ?? true,
    kioskName:
      "kioskDisplayName" in settings
        ? (settings.kioskDisplayName ?? restaurant.name)
        : restaurant.name,
    kioskAccent:
      "kioskAccentColor" in settings
        ? (settings.kioskAccentColor ?? "#3b82f6")
        : "#3b82f6",
    kioskBg:
      "kioskBgImageUrl" in settings ? (settings.kioskBgImageUrl ?? "") : "",
    kioskLogo:
      "kioskLogoUrl" in settings ? (settings.kioskLogoUrl ?? "") : "",
  };
}

function DashboardSettingsForm({
  restaurantId,
  restaurant,
  settings,
  staff,
}: {
  restaurantId: Id<"restaurants">;
  restaurant: Doc<"restaurants">;
  settings: RestaurantSettingsView;
  staff: Doc<"users">[] | undefined;
}) {
  const seed = buildFormSeed(restaurant, settings);

  const [googleUrl, setGoogleUrl] = useState(seed.googleUrl);
  const [sendDelay, setSendDelay] = useState(seed.sendDelay);
  const [birthdayEnabled, setBirthdayEnabled] = useState(seed.birthdayEnabled);
  const [birthdayTemplate, setBirthdayTemplate] = useState(seed.birthdayTemplate);
  const [re30, setRe30] = useState(seed.re30);
  const [re60, setRe60] = useState(seed.re60);
  const [re90, setRe90] = useState(seed.re90);
  const [kioskName, setKioskName] = useState(seed.kioskName);
  const [kioskAccent, setKioskAccent] = useState(seed.kioskAccent);
  const [kioskBg, setKioskBg] = useState(seed.kioskBg);
  const [kioskLogo, setKioskLogo] = useState(seed.kioskLogo);
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<"OWNER" | "STAFF">("STAFF");
  const [saved, setSaved] = useState(false);

  const updateSettings = useMutation(
    api.dashboardMutations.updateRestaurantSettings
  );

  const saveRestaurantInfo = async () => {
    await updateSettings({ restaurantId, googleBusinessUrl: googleUrl });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveSmsSettings = async () => {
    await updateSettings({
      restaurantId,
      sendDelayMinutes: sendDelay,
      birthdayEnabled,
      birthdayTemplate: birthdayTemplate || undefined,
      reengagement30: re30,
      reengagement60: re60,
      reengagement90: re90,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveKioskBranding = async () => {
    await updateSettings({
      restaurantId,
      kioskDisplayName: kioskName || undefined,
      kioskAccentColor: kioskAccent || undefined,
      kioskLogoUrl: kioskLogo || undefined,
      kioskBgImageUrl: kioskBg || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 font-semibold">Restaurant Info</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-zinc-400">Restaurant name</label>
            <input
              type="text"
              value={restaurant.name}
              readOnly
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-zinc-400"
            />
            <p className="mt-1 text-xs text-zinc-500">Only admin can change</p>
          </div>
          <div>
            <label className="block text-sm text-zinc-400">
              Google Business Review URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={googleUrl}
                onChange={(e) => setGoogleUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
              />
              <a
                href={googleUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 rounded-lg border border-zinc-600 px-4 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50"
              >
                Test Link
              </a>
            </div>
          </div>
          <button
            onClick={saveRestaurantInfo}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
          >
            Save
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 font-semibold">SMS Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400">
              Send delay: {sendDelay} min after visit
            </label>
            <input
              type="range"
              min={0}
              max={180}
              value={sendDelay}
              onChange={(e) => setSendDelay(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={birthdayEnabled}
                onChange={(e) => setBirthdayEnabled(e.target.checked)}
              />
              Birthday SMS
            </label>
          </div>
          <div>
            <label className="block text-sm text-zinc-400">
              Birthday message template
            </label>
            <textarea
              value={birthdayTemplate}
              onChange={(e) => setBirthdayTemplate(e.target.value)}
              placeholder={BIRTHDAY_DEFAULT}
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <p className="mb-2 text-sm text-zinc-400">Re-engagement toggles</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={re30}
                  onChange={(e) => setRe30(e.target.checked)}
                />
                30 days
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={re60}
                  onChange={(e) => setRe60(e.target.checked)}
                />
                60 days
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={re90}
                  onChange={(e) => setRe90(e.target.checked)}
                />
                90 days
              </label>
            </div>
          </div>
          <button
            onClick={saveSmsSettings}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
          >
            Save
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 font-semibold">Kiosk Branding</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-zinc-400">
              Restaurant name on kiosk
            </label>
            <input
              type="text"
              value={kioskName}
              onChange={(e) => setKioskName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400">Accent color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={kioskAccent}
                onChange={(e) => setKioskAccent(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border-0"
              />
              <input
                type="text"
                value={kioskAccent}
                onChange={(e) => setKioskAccent(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400">Logo URL</label>
            <input
              type="url"
              value={kioskLogo}
              onChange={(e) => setKioskLogo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400">Background Image URL</label>
            <input
              type="url"
              value={kioskBg}
              onChange={(e) => setKioskBg(e.target.value)}
              placeholder="https://... (direct image URL)"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Use a direct image URL. Will show as a full background behind the kiosk.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveKioskBranding}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
            >
              Save
            </button>
            <Link
              href={`/kiosk/${restaurant.slug}`}
              target="_blank"
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm hover:bg-zinc-800"
            >
              Preview Kiosk
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="mb-4 font-semibold">Staff Accounts</h2>
        <div className="space-y-3">
          <ul className="divide-y divide-zinc-800">
            {staff?.map((s) => (
              <li
                key={s._id}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <span className="font-medium">{s.email}</span>
                  <span className="ml-2 text-sm text-zinc-500">({s.role})</span>
                </div>
                <button className="text-sm text-red-400 hover:text-red-300">
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 pt-2">
            <input
              type="email"
              placeholder="staff@example.com"
              value={newStaffEmail}
              onChange={(e) => setNewStaffEmail(e.target.value)}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
            />
            <select
              value={newStaffRole}
              onChange={(e) =>
                setNewStaffRole(e.target.value as "OWNER" | "STAFF")
              }
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
            >
              <option value="STAFF">Staff</option>
              <option value="OWNER">Owner</option>
            </select>
            <button className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600">
              Add Staff
            </button>
          </div>
          <p className="text-xs text-zinc-500">
            Staff invites require Clerk configuration
          </p>
        </div>
      </section>

      {saved && (
        <p className="fixed bottom-4 right-4 rounded-lg bg-emerald-500/90 px-4 py-2 text-sm text-white">
          Saved!
        </p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const restaurantId = useRestaurantId();
  const restaurant = useQuery(
    api.queries.getRestaurant,
    restaurantId ? { restaurantId } : "skip"
  );
  const settings = useQuery(
    api.queries.getRestaurantSettings,
    restaurantId ? { restaurantId } : "skip"
  );
  const staff = useQuery(
    api.queries.getStaff,
    restaurantId ? { restaurantId } : "skip"
  );

  if (!restaurantId || restaurant === undefined || settings === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  const formKey =
    "_id" in settings ? settings._id : restaurantId;

  return (
    <DashboardSettingsForm
      key={formKey}
      restaurantId={restaurantId}
      restaurant={restaurant}
      settings={settings}
      staff={staff}
    />
  );
}
