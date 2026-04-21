"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
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

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="dashboard-surface rounded-[1.75rem] p-6">
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-7 text-white/42">{description}</p>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
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

  const updateSettings = useMutation(api.dashboardMutations.updateRestaurantSettings);

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const saveRestaurantInfo = async () => {
    await updateSettings({ restaurantId, googleBusinessUrl: googleUrl });
    flashSaved();
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
    flashSaved();
  };

  const saveKioskBranding = async () => {
    await updateSettings({
      restaurantId,
      kioskDisplayName: kioskName || undefined,
      kioskAccentColor: kioskAccent || undefined,
      kioskLogoUrl: kioskLogo || undefined,
      kioskBgImageUrl: kioskBg || undefined,
    });
    flashSaved();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-white/28">
            Workspace controls
          </p>
          <h1 className="mt-2 text-3xl font-light tracking-tight text-white">
            Settings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/42">
            Configure reputation routing, kiosk branding, and daily outreach
            rules so the product feels tailored to the business instead of generic.
          </p>
        </div>

        <div className="dashboard-surface rounded-[1.5rem] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-white/28">
            Recommended next step
          </p>
          <p className="mt-2 text-sm leading-7 text-white/52">
            Follow the setup guide if this location is still being configured for
            the first time.
          </p>
          <Link
            href="/setup"
            className="mt-4 inline-flex rounded-2xl border border-white/12 bg-white/4 px-4 py-2.5 text-sm font-medium text-white/82"
          >
            Open setup guide
          </Link>
        </div>
      </div>

      <SectionCard
        title="Restaurant info"
        description="These values control review routing and core account identity."
      >
        <div>
          <label className="block text-sm text-white/48">Restaurant name</label>
          <input
            type="text"
            value={restaurant.name}
            readOnly
            className="mt-2 w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-white/42"
          />
          <p className="mt-2 text-xs text-white/24">Only platform admin can change this field.</p>
        </div>

        <div>
          <label className="block text-sm text-white/48">Google Business review URL</label>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row">
            <input
              type="url"
              value={googleUrl}
              onChange={(e) => setGoogleUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-white placeholder:text-white/24"
            />
            <a
              href={googleUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/4 px-4 py-3 text-sm text-white/72"
            >
              Test link
            </a>
          </div>
        </div>

        <button
          onClick={saveRestaurantInfo}
          className="rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-5 py-3 text-sm font-semibold text-slate-950"
        >
          Save restaurant info
        </button>
      </SectionCard>

      <SectionCard
        title="Messaging rules"
        description="Review the timing and message behavior guests will experience after each visit."
      >
        <div>
          <label className="block text-sm text-white/48">
            Send delay: {sendDelay} minutes after visit
          </label>
          <input
            type="range"
            min={0}
            max={180}
            value={sendDelay}
            onChange={(e) => setSendDelay(Number(e.target.value))}
            className="mt-3 w-full"
          />
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white/72">
          <input
            type="checkbox"
            checked={birthdayEnabled}
            onChange={(e) => setBirthdayEnabled(e.target.checked)}
          />
          Enable birthday SMS
        </label>

        <div>
          <label className="block text-sm text-white/48">Birthday template</label>
          <textarea
            value={birthdayTemplate}
            onChange={(e) => setBirthdayTemplate(e.target.value)}
            placeholder={BIRTHDAY_DEFAULT}
            rows={4}
            className="mt-2 w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: "30 day re-engagement", checked: re30, setChecked: setRe30 },
            { label: "60 day re-engagement", checked: re60, setChecked: setRe60 },
            { label: "90 day re-engagement", checked: re90, setChecked: setRe90 },
          ].map((item) => (
            <label
              key={item.label}
              className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white/72"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => item.setChecked(e.target.checked)}
              />
              {item.label}
            </label>
          ))}
        </div>

        <button
          onClick={saveSmsSettings}
          className="rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-5 py-3 text-sm font-semibold text-slate-950"
        >
          Save messaging rules
        </button>
      </SectionCard>

      <SectionCard
        title="Kiosk branding"
        description="Customize the guest-facing kiosk so it feels like part of the business."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="block text-sm text-white/48">Kiosk display name</label>
            <input
              type="text"
              value={kioskName}
              onChange={(e) => setKioskName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-white/48">Accent color</label>
            <div className="mt-2 flex gap-3">
              <input
                type="color"
                value={kioskAccent}
                onChange={(e) => setKioskAccent(e.target.value)}
                className="h-12 w-16 rounded-xl border-0 bg-transparent"
              />
              <input
                type="text"
                value={kioskAccent}
                onChange={(e) => setKioskAccent(e.target.value)}
                className="flex-1 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 font-mono text-sm text-white"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-white/48">Logo URL</label>
          <input
            type="url"
            value={kioskLogo}
            onChange={(e) => setKioskLogo(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-white/48">Background image URL</label>
          <input
            type="url"
            value={kioskBg}
            onChange={(e) => setKioskBg(e.target.value)}
            placeholder="https://..."
            className="mt-2 w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-white placeholder:text-white/24"
          />
          <p className="mt-2 text-xs text-white/24">
            Use a direct image URL for a richer kiosk background.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={saveKioskBranding}
            className="rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-5 py-3 text-sm font-semibold text-slate-950"
          >
            Save kiosk branding
          </button>
          <Link
            href={`/kiosk/${restaurant.slug}`}
            target="_blank"
            className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/4 px-5 py-3 text-sm font-medium text-white/82"
          >
            Preview kiosk
          </Link>
        </div>
      </SectionCard>

      <SectionCard
        title="Staff accounts"
        description="This is the team access area. Invites are still placeholder-level until Clerk invite flows are wired up."
      >
        <div className="space-y-3">
          {staff?.map((member) => (
            <div
              key={member._id}
              className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">{member.email}</p>
                <p className="mt-1 text-xs text-white/28">{member.role}</p>
              </div>
              <button className="text-sm text-red-300 hover:text-red-200">
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <input
            type="email"
            placeholder="staff@example.com"
            value={newStaffEmail}
            onChange={(e) => setNewStaffEmail(e.target.value)}
            className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white placeholder:text-white/24"
          />
          <select
            value={newStaffRole}
            onChange={(e) => setNewStaffRole(e.target.value as "OWNER" | "STAFF")}
            className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white"
          >
            <option value="STAFF">Staff</option>
            <option value="OWNER">Owner</option>
          </select>
          <button className="rounded-2xl border border-white/12 bg-white/4 px-4 py-3 text-sm font-medium text-white/72">
            Add staff
          </button>
        </div>

        <p className="text-xs text-white/24">
          Staff invites still require Clerk invite wiring. For now, this section
          is best treated as a UI placeholder.
        </p>
      </SectionCard>

      {saved && (
        <p className="fixed bottom-4 right-4 rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-medium text-slate-950">
          Saved
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
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  const formKey = "_id" in settings ? settings._id : restaurantId;

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
