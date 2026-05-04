"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { KioskQrCard } from "@/components/KioskQrCard";
import { useIsClient } from "@/hooks/useIsClient";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import {
  BUSINESS_TYPE_OPTIONS,
  getBusinessLabels,
  type BusinessType,
} from "@/lib/business-copy";
import { hasFeatureForTier } from "@/lib/billing-plans";

const BIRTHDAY_DEFAULT =
  "Happy Birthday [name]! We have a treat waiting on your next visit. Show this text. - [business]";

type RestaurantSettingsView =
  | Doc<"restaurantSettings">
  | {
      sendDelayMinutes: number;
      birthdayEnabled: boolean;
      reengagement30: boolean;
      reengagement60: boolean;
      reengagement90: boolean;
      aiTone: "Friendly" | "Professional" | "Casual" | string;
      responseLength: "Short" | "Medium" | "Detailed" | string;
      autoApprove: boolean;
      includeReviewLink: boolean;
    };

type AiBehaviorSettings = {
  aiTone: "Friendly" | "Professional" | "Casual";
  responseLength: "Short" | "Medium" | "Detailed";
  autoApprove: boolean;
  includeReviewLink: boolean;
};

function normalizeAiTone(value: string | undefined): AiBehaviorSettings["aiTone"] {
  if (value === "Professional" || value === "Casual") {
    return value;
  }
  return "Friendly";
}

function normalizeResponseLength(
  value: string | undefined
): AiBehaviorSettings["responseLength"] {
  if (value === "Short" || value === "Detailed") {
    return value;
  }
  return "Medium";
}

function buildFormSeed(
  restaurant: Doc<"restaurants">,
  settings: RestaurantSettingsView
) {
  return {
    businessName: restaurant.name,
    businessType:
      (restaurant.businessType as BusinessType | undefined) ??
      "GENERAL_SERVICE",
    businessSubtype: restaurant.businessSubtype ?? "",
    contactPhone: restaurant.contactPhone ?? "",
    websiteUrl: restaurant.websiteUrl ?? "",
    googleUrl: restaurant.googleBusinessUrl ?? "",
    kioskDisplayName:
      "kioskDisplayName" in settings && settings.kioskDisplayName !== undefined
        ? settings.kioskDisplayName
        : restaurant.name,
    kioskAccentColor:
      "kioskAccentColor" in settings && settings.kioskAccentColor !== undefined
        ? settings.kioskAccentColor
        : "#10b981",
    kioskLogoUrl:
      "kioskLogoUrl" in settings && settings.kioskLogoUrl !== undefined
        ? settings.kioskLogoUrl
        : "",
    kioskBgImageUrl:
      "kioskBgImageUrl" in settings && settings.kioskBgImageUrl !== undefined
        ? settings.kioskBgImageUrl
        : "",
    sendDelay: settings.sendDelayMinutes ?? 60,
    birthdayEnabled: settings.birthdayEnabled ?? true,
    birthdayTemplate:
      "birthdayTemplate" in settings && settings.birthdayTemplate !== undefined
        ? settings.birthdayTemplate
        : BIRTHDAY_DEFAULT,
    aiTone: normalizeAiTone(settings.aiTone),
    responseLength: normalizeResponseLength(settings.responseLength),
    autoApprove: settings.autoApprove ?? false,
    includeReviewLink: settings.includeReviewLink ?? true,
    re30: settings.reengagement30 ?? true,
    re60: settings.reengagement60 ?? true,
    re90: settings.reengagement90 ?? true,
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
  const [businessName, setBusinessName] = useState(seed.businessName);
  const [businessType, setBusinessType] = useState<BusinessType>(
    seed.businessType
  );
  const labels = getBusinessLabels(businessType);
  const canUseLifecycleMessaging = hasFeatureForTier(
    restaurant.tier,
    "birthdayReengagement"
  );
  const [businessSubtype, setBusinessSubtype] = useState(seed.businessSubtype);
  const [contactPhone, setContactPhone] = useState(seed.contactPhone);
  const [websiteUrl, setWebsiteUrl] = useState(seed.websiteUrl);
  const [googleUrl, setGoogleUrl] = useState(seed.googleUrl);
  const [kioskDisplayName, setKioskDisplayName] = useState(seed.kioskDisplayName);
  const [kioskAccentColor, setKioskAccentColor] = useState(seed.kioskAccentColor);
  const [kioskLogoUrl, setKioskLogoUrl] = useState(seed.kioskLogoUrl);
  const [kioskBgImageUrl, setKioskBgImageUrl] = useState(seed.kioskBgImageUrl);
  const [sendDelay, setSendDelay] = useState(seed.sendDelay);
  const [birthdayEnabled, setBirthdayEnabled] = useState(seed.birthdayEnabled);
  const [birthdayTemplate, setBirthdayTemplate] = useState(seed.birthdayTemplate);
  const [re30, setRe30] = useState(seed.re30);
  const [re60, setRe60] = useState(seed.re60);
  const [re90, setRe90] = useState(seed.re90);
  const [saved, setSaved] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<"logo" | "background" | null>(
    null
  );

  const [aiTone, setAiTone] = useState<AiBehaviorSettings["aiTone"]>(
    seed.aiTone
  );
  const [responseLength, setResponseLength] = useState<
    AiBehaviorSettings["responseLength"]
  >(seed.responseLength);
  const [autoApprove, setAutoApprove] = useState(seed.autoApprove);
  const [includeReviewLink, setIncludeReviewLink] = useState(
    seed.includeReviewLink
  );

  const updateSettings = useMutation(api.dashboardMutations.updateRestaurantSettings);
  const generateUploadUrl = useMutation(api.dashboardMutations.generateUploadUrl);
  const storeUploadedAsset = useMutation(api.dashboardMutations.storeUploadedAsset);

  const flashSaved = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const saveBusinessProfile = async () => {
    await updateSettings({
      restaurantId,
      businessName: businessName.trim() || restaurant.name,
      businessType,
      businessSubtype,
      contactPhone,
      websiteUrl,
      googleBusinessUrl: googleUrl,
    });
    flashSaved();
  };

  const saveKioskBranding = async () => {
    await updateSettings({
      restaurantId,
      kioskDisplayName: kioskDisplayName.trim() || restaurant.name,
      kioskAccentColor,
      kioskLogoUrl: kioskLogoUrl || undefined,
      kioskBgImageUrl: kioskBgImageUrl || undefined,
    });
    flashSaved();
  };

  const handleAssetUpload = async (
    file: File | undefined,
    assetType: "logo" | "background"
  ) => {
    if (!file) return;

    setUploadingAsset(assetType);
    try {
      const uploadUrl = await generateUploadUrl({});
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Upload request failed");
      }

      const { storageId } = (await result.json()) as { storageId?: Id<"_storage"> };
      if (!storageId) {
        throw new Error("Storage id missing from upload response");
      }

      const stored = await storeUploadedAsset({
        restaurantId,
        storageId,
        assetType,
      });

      if (assetType === "logo") {
        setKioskLogoUrl(stored.url);
      } else {
        setKioskBgImageUrl(stored.url);
      }

      flashSaved();
    } finally {
      setUploadingAsset(null);
    }
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

  const saveAiBehavior = async () => {
    await updateSettings({
      restaurantId,
      aiTone,
      responseLength,
      autoApprove,
      includeReviewLink,
    });
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
            Manage business profile details, review routing, message behavior,
            and AI response style from one place.
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
        title="Business Profile"
        description="Control the core business details that power workspace labels, kiosk branding, and review routing."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="block text-sm text-white/50">Business name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-white/50">Business type</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as BusinessType)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0c1421] px-4 py-3 text-white outline-none"
            >
              {BUSINESS_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="block text-sm text-white/50">
              Specialty or service focus
            </label>
            <input
              type="text"
              value={businessSubtype}
              onChange={(e) => setBusinessSubtype(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-white/50">Contact phone</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white"
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="block text-sm text-white/50">Website</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-white/50">
              Google review URL
            </label>
            <input
              type="url"
              value={googleUrl}
              onChange={(e) => setGoogleUrl(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-4 text-sm text-white/60">
          Customers will appear as <span className="text-white">{labels.customerLabelPlural}</span> and
          this account will be treated like a <span className="text-white"> {labels.businessLabel}</span> workspace
          across the product.
        </div>

        <SaveButton onClick={saveBusinessProfile}>Save profile</SaveButton>
      </SectionCard>

      <SectionCard
        title="Kiosk Branding"
        description={`Customize the ${labels.customerLabel}-facing kiosk with your display name, accent color, logo, and optional background image.`}
      >
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/50">Display name</label>
              <input
                type="text"
                value={kioskDisplayName}
                onChange={(e) => setKioskDisplayName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-white/50">Accent color</label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={kioskAccentColor}
                  onChange={(e) => setKioskAccentColor(e.target.value)}
                  className="h-12 w-16 rounded-xl border border-white/10 bg-transparent"
                />
                <input
                  type="text"
                  value={kioskAccentColor}
                  onChange={(e) => setKioskAccentColor(e.target.value)}
                  className="flex-1 rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="text-sm font-medium text-white/70">Logo</p>
                <label className="mt-3 flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-white/14 bg-white/[0.03] px-4 py-6 text-center text-sm text-white/45 hover:border-white/20 hover:text-white/65">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      void handleAssetUpload(e.target.files?.[0], "logo")
                    }
                  />
                  {uploadingAsset === "logo"
                    ? "Uploading logo..."
                    : "Upload logo image"}
                </label>
                <input
                  type="url"
                  value={kioskLogoUrl}
                  onChange={(e) => setKioskLogoUrl(e.target.value)}
                  placeholder="Or paste a logo URL"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/25"
                />
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="text-sm font-medium text-white/70">Background</p>
                <label className="mt-3 flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-white/14 bg-white/[0.03] px-4 py-6 text-center text-sm text-white/45 hover:border-white/20 hover:text-white/65">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      void handleAssetUpload(e.target.files?.[0], "background")
                    }
                  />
                  {uploadingAsset === "background"
                    ? "Uploading background..."
                    : "Upload background image"}
                </label>
                <input
                  type="url"
                  value={kioskBgImageUrl}
                  onChange={(e) => setKioskBgImageUrl(e.target.value)}
                  placeholder="Or paste a background URL"
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/25"
                />
              </div>
            </div>

            <SaveButton onClick={saveKioskBranding}>
              Save kiosk branding
            </SaveButton>
          </div>

          <div className="overflow-hidden rounded-[1.8rem] border border-white/8 bg-[#07111d]/80">
            <div
              className="relative min-h-[360px] p-5"
              style={{
                backgroundImage: kioskBgImageUrl ? `url(${kioskBgImageUrl})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_40%)]" />
              <div className="absolute inset-0 bg-black/50" />
              <div className="relative flex h-full min-h-[320px] flex-col items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur-sm">
                {kioskLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- previewing uploaded or arbitrary logo URL
                  <img
                    src={kioskLogoUrl}
                    alt={kioskDisplayName}
                    className="max-h-24 max-w-[220px] object-contain"
                  />
                ) : (
                  <div>
                    <h3 className="text-3xl font-semibold text-white">
                      {kioskDisplayName || businessName || restaurant.name}
                    </h3>
                    <div
                      className="mx-auto mt-3 h-1 w-16 rounded-full"
                      style={{ backgroundColor: kioskAccentColor }}
                    />
                  </div>
                )}
                <p className="mt-5 max-w-xs text-sm leading-7 text-white/58">
                  Join our rewards program, collect points, and hear from us
                  after your {labels.visitLabel}.
                </p>
                <button
                  type="button"
                  className="mt-6 rounded-2xl px-5 py-3 text-sm font-semibold text-slate-950"
                  style={{ backgroundColor: kioskAccentColor }}
                >
                  Preview CTA
                </button>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <KioskQrCard slug={restaurant.slug} accentColor={kioskAccentColor} />

      <SectionCard
        title="SMS Settings"
        description="Timing and audience rules for reputation and retention messages."
      >
        {!canUseLifecycleMessaging && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
            Birthday and re-engagement SMS are available on Pro and Agency.
          </div>
        )}
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
            disabled={!canUseLifecycleMessaging}
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
            disabled={!canUseLifecycleMessaging}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white"
          />
          <p className="mt-2 text-xs text-white/34">
            Use [name] and [business] in the template.
          </p>
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
                disabled={!canUseLifecycleMessaging}
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
  const isClient = useIsClient();
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

  if (!isClient) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-500">Loading settings...</p>
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
