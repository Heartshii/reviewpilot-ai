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

type AiBehaviorSettings = {
  aiTone: "Friendly" | "Professional" | "Casual";
  responseLength: "Short" | "Medium" | "Detailed";
  autoApprove: boolean;
  includeReviewLink: boolean;
};

const AI_BEHAVIOR_DEFAULTS: AiBehaviorSettings = {
  aiTone: "Friendly",
  responseLength: "Medium",
  autoApprove: false,
  includeReviewLink: true,
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
  };
}

function readAiBehavior(restaurantId: Id<"restaurants">): AiBehaviorSettings {
  if (typeof window === "undefined") {
    return AI_BEHAVIOR_DEFAULTS;
  }

  try {
    const stored = window.localStorage.getItem(`ai-behavior-${restaurantId}`);
    if (!stored) return AI_BEHAVIOR_DEFAULTS;

    const parsed = JSON.parse(stored) as Partial<AiBehaviorSettings>;
    return {
      aiTone: parsed.aiTone ?? AI_BEHAVIOR_DEFAULTS.aiTone,
      responseLength: parsed.responseLength ?? AI_BEHAVIOR_DEFAULTS.responseLength,
      autoApprove: parsed.autoApprove ?? AI_BEHAVIOR_DEFAULTS.autoApprove,
      includeReviewLink:
        parsed.includeReviewLink ?? AI_BEHAVIOR_DEFAULTS.includeReviewLink,
    };
  } catch {
    return AI_BEHAVIOR_DEFAULTS;
  }
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
    <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-white/45">{description}</p>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function SaveButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[1.35rem] bg-[linear-gradient(135deg,#34d399,#4cc9f0)] px-7 py-4 text-base font-semibold text-slate-950 shadow-[0_18px_40px_rgba(76,201,240,0.18)]"
    >
      {children}
    </button>
  );
}

function DashboardSettingsForm({
  restaurantId,
  restaurant,
  settings,
}: {
  restaurantId: Id<"restaurants">;
  restaurant: Doc<"restaurants">;
  settings: RestaurantSettingsView;
}) {
  const seed = buildFormSeed(restaurant, settings);
  const aiSeed = readAiBehavior(restaurantId);

  const [googleUrl, setGoogleUrl] = useState(seed.googleUrl);
  const [sendDelay, setSendDelay] = useState(seed.sendDelay);
  const [birthdayEnabled, setBirthdayEnabled] = useState(seed.birthdayEnabled);
  const [birthdayTemplate, setBirthdayTemplate] = useState(seed.birthdayTemplate);
  const [re30, setRe30] = useState(seed.re30);
  const [re60, setRe60] = useState(seed.re60);
  const [re90, setRe90] = useState(seed.re90);
  const [saved, setSaved] = useState(false);

  const [aiTone, setAiTone] = useState<AiBehaviorSettings["aiTone"]>(aiSeed.aiTone);
  const [responseLength, setResponseLength] = useState<
    AiBehaviorSettings["responseLength"]
  >(aiSeed.responseLength);
  const [autoApprove, setAutoApprove] = useState(aiSeed.autoApprove);
  const [includeReviewLink, setIncludeReviewLink] = useState(
    aiSeed.includeReviewLink
  );

  const updateSettings = useMutation(api.dashboardMutations.updateRestaurantSettings);

  const flashSaved = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
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

  const saveAiBehavior = () => {
    window.localStorage.setItem(
      `ai-behavior-${restaurantId}`,
      JSON.stringify({
        aiTone,
        responseLength,
        autoApprove,
        includeReviewLink,
      })
    );
    flashSaved();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-white">
            Settings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/45">
            Manage review routing, message behavior, and AI response style from
            one place.
          </p>
        </div>

        <Link
          href="/setup"
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-white"
        >
          View setup guide
        </Link>
      </div>

      <SectionCard
        title="Restaurant Info"
        description="Control the review destination and location identity."
      >
        <div>
          <label className="block text-sm text-white/50">Restaurant name</label>
          <input
            type="text"
            value={restaurant.name}
            readOnly
            className="mt-2 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white/45"
          />
        </div>
        <div>
          <label className="block text-sm text-white/50">
            Google Business Review URL
          </label>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row">
            <input
              type="url"
              value={googleUrl}
              onChange={(e) => setGoogleUrl(e.target.value)}
              className="flex-1 rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white"
            />
            <SaveButton onClick={saveRestaurantInfo}>
              Save
            </SaveButton>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="SMS Settings"
        description="Timing and audience rules for reputation and retention messages."
      >
        <div>
          <label className="block text-sm text-white/50">
            Send delay: {sendDelay} min after visit
          </label>
          <input
            type="range"
            min={0}
            max={180}
            value={sendDelay}
            onChange={(e) => setSendDelay(Number(e.target.value))}
            className="mt-2 w-full"
          />
        </div>
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white/70">
          <input
            type="checkbox"
            checked={birthdayEnabled}
            onChange={(e) => setBirthdayEnabled(e.target.checked)}
          />
          Birthday SMS
        </label>
        <div>
          <label className="block text-sm text-white/50">
            Birthday message template
          </label>
          <textarea
            value={birthdayTemplate}
            onChange={(e) => setBirthdayTemplate(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: "30 days", checked: re30, onChange: setRe30 },
            { label: "60 days", checked: re60, onChange: setRe60 },
            { label: "90 days", checked: re90, onChange: setRe90 },
          ].map((item) => (
            <label
              key={item.label}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white/70"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => item.onChange(e.target.checked)}
              />
              {item.label}
            </label>
          ))}
        </div>
        <SaveButton onClick={saveSmsSettings}>
          Save
        </SaveButton>
      </SectionCard>

      <SectionCard
        title="AI Behavior"
        description="Adjust how AI-generated review and apology responses feel."
      >
        <div>
          <p className="text-sm text-white/50">Tone</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {(["Friendly", "Professional", "Casual"] as const).map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => setAiTone(tone)}
                className={`rounded-xl px-4 py-2 text-sm ${
                  aiTone === tone
                    ? "border border-emerald-500/20 bg-emerald-500/20 text-emerald-400"
                    : "border border-white/10 text-white/50"
                }`}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-white/50">Response length</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {(["Short", "Medium", "Detailed"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setResponseLength(item)}
                className={`rounded-xl px-4 py-2 text-sm ${
                  responseLength === item
                    ? "border border-emerald-500/20 bg-emerald-500/20 text-emerald-400"
                    : "border border-white/10 text-white/50"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white/70">
          <input
            type="checkbox"
            checked={autoApprove}
            onChange={(e) => setAutoApprove(e.target.checked)}
          />
          Automatically approve 5-star review requests
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white/70">
          <input
            type="checkbox"
            checked={includeReviewLink}
            onChange={(e) => setIncludeReviewLink(e.target.checked)}
          />
          Include Google review link in replies
        </label>

        <SaveButton onClick={saveAiBehavior}>
          Save
        </SaveButton>
      </SectionCard>

      {saved && (
        <p className="fixed bottom-4 right-4 rounded-xl border border-emerald-500/20 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400">
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

  if (!restaurantId || restaurant === undefined || settings === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
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
    />
  );
}
