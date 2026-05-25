"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { KioskQrCard } from "@/components/KioskQrCard";
import { AppIcon, IconBadge } from "@/components/ui/premium-icon";
import { useIsClient } from "@/hooks/useIsClient";
import { useE2ESession } from "@/hooks/useE2ESession";
import { useEnsureUser } from "@/hooks/useEnsureUser";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import {
  BUSINESS_TYPE_OPTIONS,
  getBusinessLabels,
  type BusinessType,
} from "@/lib/business-copy";
import { hasFeatureForTier } from "@/lib/billing-plans";
import { slugifyWorkspace } from "@/lib/validation";
import {
  canAccessSettings,
  canManageTeam,
  canManageWorkspaceSettings,
} from "@/lib/permissions";

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
      preferredMessagingChannel?: "SMS" | "WHATSAPP" | string;
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
    whiteLabelEnabled:
      "whiteLabelEnabled" in settings && settings.whiteLabelEnabled !== undefined
        ? settings.whiteLabelEnabled
        : false,
    whiteLabelBrandName:
      "whiteLabelBrandName" in settings && settings.whiteLabelBrandName !== undefined
        ? settings.whiteLabelBrandName
        : "",
    whiteLabelSupportEmail:
      "whiteLabelSupportEmail" in settings &&
      settings.whiteLabelSupportEmail !== undefined
        ? settings.whiteLabelSupportEmail
        : "",
    whiteLabelHideReviewPilot:
      "whiteLabelHideReviewPilot" in settings &&
      settings.whiteLabelHideReviewPilot !== undefined
        ? settings.whiteLabelHideReviewPilot
        : false,
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
    preferredMessagingChannel: settings.preferredMessagingChannel ?? "SMS",
    re30: settings.reengagement30 ?? true,
    re60: settings.reengagement60 ?? true,
    re90: settings.reengagement90 ?? true,
  };
}

function SectionCard({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-32 overflow-hidden rounded-[2rem] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.032),rgba(255,255,255,0.018))] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/6 pb-5">
        <div className="max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/28">
            Workspace settings
          </p>
          <h2 className="mt-3 font-display text-[1.55rem] font-semibold tracking-[-0.03em] text-white">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-7 text-white/45">{description}</p>
        </div>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function SettingsHeroCard({
  eyebrow,
  label,
  value,
  note,
  icon,
}: {
  eyebrow: string;
  label: string;
  value: string;
  note: string;
  icon: Parameters<typeof AppIcon>[0]["name"];
}) {
  return (
    <div className="flex min-h-[13.5rem] flex-col rounded-[1.9rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 max-w-[13rem]">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/28">
            {eyebrow}
          </p>
          <p className="mt-3 font-display text-[1.05rem] font-medium leading-6 tracking-[-0.03em] text-white/94">
            {label}
          </p>
        </div>
        <IconBadge
          name={icon}
          className="h-11 w-11 shrink-0 border-white/10 bg-white/[0.04] text-white/75"
          iconClassName="h-[18px] w-[18px]"
        />
      </div>
      <p className="mt-8 font-display text-[2rem] font-semibold leading-none tracking-[-0.04em] text-white">
        {value}
      </p>
      <p className="mt-auto pt-4 text-sm leading-6 text-white/42">{note}</p>
    </div>
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
      className="rounded-[1.35rem] bg-[linear-gradient(135deg,#34d399,#4cc9f0)] px-7 py-4 text-base font-semibold text-slate-950 shadow-[0_18px_40px_rgba(76,201,240,0.18)] transition-transform hover:-translate-y-0.5"
    >
      {children}
    </button>
  );
}

function DashboardSettingsForm({
  restaurantId,
  restaurant,
  settings,
  currentRole,
  locations,
}: {
  restaurantId: Id<"restaurants">;
  restaurant: Doc<"restaurants">;
  settings: RestaurantSettingsView;
  currentRole?: "SUPER_ADMIN" | "OWNER" | "MANAGER" | "STAFF";
  locations: Array<Doc<"locations">>;
}) {
  const { user } = useUser();
  const { session: e2eSession } = useE2ESession();
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
  const canUseWhiteLabel = hasFeatureForTier(
    restaurant.tier,
    "whiteLabelKiosk"
  );
  const [businessSubtype, setBusinessSubtype] = useState(seed.businessSubtype);
  const [contactPhone, setContactPhone] = useState(seed.contactPhone);
  const [websiteUrl, setWebsiteUrl] = useState(seed.websiteUrl);
  const [googleUrl, setGoogleUrl] = useState(seed.googleUrl);
  const [kioskDisplayName, setKioskDisplayName] = useState(seed.kioskDisplayName);
  const [kioskAccentColor, setKioskAccentColor] = useState(seed.kioskAccentColor);
  const [kioskLogoUrl, setKioskLogoUrl] = useState(seed.kioskLogoUrl);
  const [kioskBgImageUrl, setKioskBgImageUrl] = useState(seed.kioskBgImageUrl);
  const [whiteLabelEnabled, setWhiteLabelEnabled] = useState(seed.whiteLabelEnabled);
  const [whiteLabelBrandName, setWhiteLabelBrandName] = useState(
    seed.whiteLabelBrandName
  );
  const [whiteLabelSupportEmail, setWhiteLabelSupportEmail] = useState(
    seed.whiteLabelSupportEmail
  );
  const [whiteLabelHideReviewPilot, setWhiteLabelHideReviewPilot] = useState(
    seed.whiteLabelHideReviewPilot
  );
  const [sendDelay, setSendDelay] = useState(seed.sendDelay);
  const [birthdayEnabled, setBirthdayEnabled] = useState(seed.birthdayEnabled);
  const [birthdayTemplate, setBirthdayTemplate] = useState(seed.birthdayTemplate);
  const [preferredMessagingChannel, setPreferredMessagingChannel] = useState<
    "SMS" | "WHATSAPP"
  >(seed.preferredMessagingChannel === "WHATSAPP" ? "WHATSAPP" : "SMS");
  const [re30, setRe30] = useState(seed.re30);
  const [re60, setRe60] = useState(seed.re60);
  const [re90, setRe90] = useState(seed.re90);
  const [saved, setSaved] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<"logo" | "background" | null>(
    null
  );
  const [teamError, setTeamError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MANAGER" | "STAFF">("STAFF");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    locations[0]?._id ?? ""
  );
  const [locationName, setLocationName] = useState(locations[0]?.name ?? "");
  const [locationSlug, setLocationSlug] = useState(locations[0]?.slug ?? "");
  const [locationContactPhone, setLocationContactPhone] = useState(
    locations[0]?.contactPhone ?? ""
  );
  const [locationGoogleUrl, setLocationGoogleUrl] = useState(
    locations[0]?.googleBusinessUrl ?? ""
  );
  const [locationTwilioNumber, setLocationTwilioNumber] = useState(
    locations[0]?.twilioNumber ?? ""
  );
  const [locationDisplayName, setLocationDisplayName] = useState(
    locations[0]?.kioskDisplayName ?? ""
  );
  const [locationAccentColor, setLocationAccentColor] = useState(
    locations[0]?.kioskAccentColor ?? "#10b981"
  );
  const [locationLogoUrl, setLocationLogoUrl] = useState(
    locations[0]?.kioskLogoUrl ?? ""
  );
  const [locationBgImageUrl, setLocationBgImageUrl] = useState(
    locations[0]?.kioskBgImageUrl ?? ""
  );
  const [locationActive, setLocationActive] = useState(locations[0]?.active ?? true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);

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
  const createStaffInvite = useMutation(api.users.createStaffInvite);
  const revokeStaffInvite = useMutation(api.users.revokeStaffInvite);
  const updateWorkspaceUserRole = useMutation(api.users.updateWorkspaceUserRole);
  const removeWorkspaceUser = useMutation(api.users.removeWorkspaceUser);
  const createLocation = useMutation(api.dashboardMutations.createLocation);
  const updateLocation = useMutation(api.dashboardMutations.updateLocation);
  const staffUsers = useQuery(api.users.getWorkspaceUsers, { restaurantId });
  const staffInvites = useQuery(api.users.getStaffInvites, { restaurantId });
  type StaffUserRow = NonNullable<typeof staffUsers>[number];
  type StaffInviteRow = NonNullable<typeof staffInvites>[number];
  const activeClerkId = user?.id ?? e2eSession?.clerkId ?? "";
  const activeEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    e2eSession?.email ??
    "";
  const mayEditWorkspace = canManageWorkspaceSettings(currentRole);
  const mayManageTeam = canManageTeam(currentRole);
  const canUseMultiLocation = hasFeatureForTier(restaurant.tier, "multiLocation");
  const settingsSections = [
    {
      id: "settings-profile",
      label: "Profile",
      helper: "Business identity and review links",
      icon: "overview" as const,
    },
    {
      id: "settings-kiosk-branding",
      label: "Kiosk",
      helper: "Logo, background, and visual identity",
      icon: "widget" as const,
    },
    {
      id: "settings-kiosk-qr",
      label: "QR code",
      helper: "Public kiosk access and share tools",
      icon: "flash" as const,
    },
    {
      id: "settings-whitelabel",
      label: "White-label",
      helper: "Agency branding and hidden ReviewPilot mode",
      icon: "shield" as const,
    },
    {
      id: "settings-sms",
      label: "SMS",
      helper: "Timing and lifecycle outreach",
      icon: "sms" as const,
    },
    {
      id: "settings-ai",
      label: "AI",
      helper: "Tone, review flow, and auto-approval",
      icon: "spark" as const,
    },
    {
      id: "settings-locations",
      label: "Locations",
      helper: "Routing, kiosk slugs, and local branding",
      icon: "agency" as const,
    },
    {
      id: "settings-team",
      label: "Team",
      helper: "Roles, invites, and workspace access",
      icon: "customers" as const,
    },
  ];

  const syncLocationState = (location: Doc<"locations"> | undefined) => {
    setSelectedLocationId(location?._id ?? "");
    setLocationName(location?.name ?? "");
    setLocationSlug(location?.slug ?? "");
    setLocationContactPhone(location?.contactPhone ?? "");
    setLocationGoogleUrl(location?.googleBusinessUrl ?? "");
    setLocationTwilioNumber(location?.twilioNumber ?? "");
    setLocationDisplayName(location?.kioskDisplayName ?? "");
    setLocationAccentColor(location?.kioskAccentColor ?? "#10b981");
    setLocationLogoUrl(location?.kioskLogoUrl ?? "");
    setLocationBgImageUrl(location?.kioskBgImageUrl ?? "");
    setLocationActive(location?.active ?? true);
  };

  const flashSaved = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const saveBusinessProfile = async () => {
    if (!mayEditWorkspace || !activeClerkId) return;
    await updateSettings({
      actorClerkId: activeClerkId,
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
    if (!mayEditWorkspace || !activeClerkId) return;
    await updateSettings({
      actorClerkId: activeClerkId,
      restaurantId,
      kioskDisplayName: kioskDisplayName.trim() || restaurant.name,
      kioskAccentColor,
      kioskLogoUrl: kioskLogoUrl.trim(),
      kioskBgImageUrl: kioskBgImageUrl.trim(),
    });
    flashSaved();
  };

  const saveWhiteLabelBranding = async () => {
    if (!mayEditWorkspace || !activeClerkId || !canUseWhiteLabel) return;
    await updateSettings({
      actorClerkId: activeClerkId,
      restaurantId,
      whiteLabelEnabled,
      whiteLabelBrandName: whiteLabelBrandName.trim() || undefined,
      whiteLabelSupportEmail: whiteLabelSupportEmail.trim() || undefined,
      whiteLabelHideReviewPilot,
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
      const uploadUrl = await generateUploadUrl({
        actorClerkId: activeClerkId,
        restaurantId,
      });
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
        actorClerkId: activeClerkId,
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
    if (!mayEditWorkspace || !activeClerkId) return;
    await updateSettings({
      actorClerkId: activeClerkId,
      restaurantId,
      sendDelayMinutes: sendDelay,
      birthdayEnabled,
      birthdayTemplate: birthdayTemplate || undefined,
      preferredMessagingChannel,
      reengagement30: re30,
      reengagement60: re60,
      reengagement90: re90,
    });
    flashSaved();
  };

  const saveAiBehavior = async () => {
    if (!mayEditWorkspace || !activeClerkId) return;
    await updateSettings({
      actorClerkId: activeClerkId,
      restaurantId,
      aiTone,
      responseLength,
      autoApprove,
      includeReviewLink,
    });
    flashSaved();
  };

  const handleCreateInvite = async () => {
    if (!mayManageTeam || !activeClerkId || !activeEmail || !inviteEmail.trim()) {
      return;
    }

    setCreatingInvite(true);
    setTeamError(null);
    try {
      const invite = await createStaffInvite({
        actorClerkId: activeClerkId,
        actorEmail: activeEmail,
        restaurantId,
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      const nextLink = `${window.location.origin}/accept-invite/${invite?.token}`;
      setInviteLink(nextLink);
      setInviteEmail("");
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(nextLink);
      }
    } catch (error) {
      setTeamError(
        error instanceof Error ? error.message : "Unable to create invite"
      );
    } finally {
      setCreatingInvite(false);
    }
  };

  const saveLocation = async () => {
    if (!mayEditWorkspace || !activeClerkId) return;
    setSavingLocation(true);
    setLocationError(null);
    try {
      if (selectedLocationId) {
        await updateLocation({
          actorClerkId: activeClerkId,
          restaurantId,
          locationId: selectedLocationId as Id<"locations">,
          locationName: locationName.trim() || restaurant.name,
          locationSlug: slugifyWorkspace(locationSlug || locationName || restaurant.name),
          contactPhone: locationContactPhone || undefined,
          googleBusinessUrl: locationGoogleUrl || undefined,
          twilioNumber: locationTwilioNumber || undefined,
          kioskDisplayName: locationDisplayName || undefined,
          kioskAccentColor: locationAccentColor || undefined,
          kioskLogoUrl: locationLogoUrl || undefined,
          kioskBgImageUrl: locationBgImageUrl || undefined,
          active: locationActive,
        });
      } else {
        const newId = await createLocation({
          actorClerkId: activeClerkId,
          restaurantId,
          locationName: locationName.trim() || `${restaurant.name} Location`,
          locationSlug: slugifyWorkspace(locationSlug || locationName || restaurant.name),
          contactPhone: locationContactPhone || undefined,
          googleBusinessUrl: locationGoogleUrl || undefined,
          twilioNumber: locationTwilioNumber || undefined,
          kioskDisplayName: locationDisplayName || undefined,
          kioskAccentColor: locationAccentColor || undefined,
          kioskLogoUrl: locationLogoUrl || undefined,
          kioskBgImageUrl: locationBgImageUrl || undefined,
        });
        setSelectedLocationId(newId);
      }
      flashSaved();
    } catch (error) {
      setLocationError(
        error instanceof Error ? error.message : "Unable to save location"
      );
    } finally {
      setSavingLocation(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2.3rem] border border-white/6 bg-[linear-gradient(135deg,rgba(8,17,29,0.96),rgba(8,17,29,0.94)_48%,rgba(16,185,129,0.09))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-white/70">
              <IconBadge
                name="settings"
                className="h-8 w-8 border-white/10 bg-white/[0.04] text-white/75"
                iconClassName="h-[14px] w-[14px]"
              />
              Workspace settings
            </div>
            <div>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Shape your brand, messaging, kiosk experience, and team controls from one premium workspace.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
                This page runs the customer-facing details of your business:
                profile, kiosk identity, review routing, lifecycle messaging,
                AI behavior, team access, and multi-location operations.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/setup"
                className="rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-4 py-3 text-sm font-semibold text-slate-950"
              >
                View setup guide
              </Link>
              <Link
                href="/dashboard"
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/75 transition hover:bg-white/[0.08]"
              >
                Back to dashboard
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            <SettingsHeroCard
              eyebrow="Workspace"
              label="Business profile"
              value={labels.businessLabel}
              note={`${labels.customerLabelPlural} and visit language adapt to your business type.`}
              icon="overview"
            />
            <SettingsHeroCard
              eyebrow="Messaging"
              label="Primary channel"
              value={preferredMessagingChannel === "WHATSAPP" ? "WhatsApp" : "SMS"}
              note="Automated review, recovery, and lifecycle outreach use this phone channel by default."
              icon="sms"
            />
            <SettingsHeroCard
              eyebrow="Operations"
              label="Locations"
              value={`${locations.length}`}
              note={
                canUseMultiLocation
                  ? "Manage separate kiosk slugs, review links, and Twilio routing per location."
                  : "One primary location today. Agency unlocks true multi-location operations."
              }
              icon="agency"
            />
            <SettingsHeroCard
              eyebrow="Access"
              label="Team control"
              value={mayManageTeam ? "Managed" : "Restricted"}
              note={
                mayManageTeam
                  ? "You can invite teammates, define roles, and manage workspace access."
                  : "Staff and some managers cannot change team or billing-sensitive controls."
              }
              icon="customers"
            />
          </div>
        </div>
      </section>

      <div className="sticky top-[104px] z-10 rounded-[1.6rem] border border-white/8 bg-[#08111d]/82 px-3 py-2 backdrop-blur-xl shadow-[0_18px_45px_rgba(0,0,0,0.16)]">
        <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="hidden shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/35 lg:inline-flex">
            <AppIcon name="settings" className="h-3.5 w-3.5" />
            Jump to
          </div>
          {settingsSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() =>
                document.getElementById(section.id)?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
              className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm text-white/68 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <IconBadge
                name={section.icon}
                className="h-7 w-7 border-white/10 bg-white/[0.04] text-white/72 transition group-hover:text-emerald-100"
                iconClassName="h-[12px] w-[12px]"
              />
              <span className="font-medium text-white/86">{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      <SectionCard
        id="settings-profile"
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
        id="settings-kiosk-branding"
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
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white/70">Logo</p>
                  {kioskLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setKioskLogoUrl("")}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/45 transition-colors hover:text-white/70"
                    >
                      Clear
                    </button>
                  )}
                </div>
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
                <p className="mt-2 text-xs leading-6 text-white/35">
                  Best result: a transparent PNG or SVG with generous padding.
                </p>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white/70">Background</p>
                  {kioskBgImageUrl && (
                    <button
                      type="button"
                      onClick={() => setKioskBgImageUrl("")}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/45 transition-colors hover:text-white/70"
                    >
                      Clear
                    </button>
                  )}
                </div>
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
                <p className="mt-2 text-xs leading-6 text-white/35">
                  Backgrounds stay low-opacity on kiosk so text remains readable.
                </p>
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
                  <div className="flex flex-col items-center gap-5">
                    <div className="flex min-h-[108px] min-w-[220px] items-center justify-center rounded-[1.6rem] border border-white/12 bg-black/20 px-6 py-5 shadow-[0_16px_40px_rgba(2,6,23,0.22)] backdrop-blur-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element -- previewing uploaded or arbitrary logo URL */}
                      <img
                        src={kioskLogoUrl}
                        alt={kioskDisplayName}
                        className="max-h-20 max-w-[190px] object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="text-3xl font-semibold text-white">
                        {kioskDisplayName || businessName || restaurant.name}
                      </h3>
                      <div
                        className="mx-auto mt-3 h-1 w-16 rounded-full"
                        style={{ backgroundColor: kioskAccentColor }}
                      />
                    </div>
                  </div>
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
                <p className="mt-4 text-xs uppercase tracking-[0.16em] text-white/30">
                  {whiteLabelEnabled && whiteLabelHideReviewPilot
                    ? whiteLabelSupportEmail
                      ? `Support: ${whiteLabelSupportEmail}`
                      : whiteLabelBrandName || "White-label experience"
                    : "Powered by ReviewPilot AI"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        id="settings-whitelabel"
        title="White-label Experience"
        description="Control whether the kiosk feels like ReviewPilot or a fully branded client experience."
      >
        {!canUseWhiteLabel && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
            White-label kiosk mode is available on the Agency plan.
          </div>
        )}

        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white/70">
          <input
            type="checkbox"
            checked={whiteLabelEnabled}
            onChange={(e) => setWhiteLabelEnabled(e.target.checked)}
            disabled={!canUseWhiteLabel}
          />
          Enable white-label mode for public kiosk surfaces
        </label>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="block text-sm text-white/50">White-label brand name</label>
            <input
              type="text"
              value={whiteLabelBrandName}
              onChange={(e) => setWhiteLabelBrandName(e.target.value)}
              disabled={!canUseWhiteLabel}
              placeholder="Example: North Shore Growth Studio"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm text-white/50">Support email</label>
            <input
              type="email"
              value={whiteLabelSupportEmail}
              onChange={(e) => setWhiteLabelSupportEmail(e.target.value)}
              disabled={!canUseWhiteLabel}
              placeholder="support@yourbrand.com"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white disabled:opacity-50"
            />
          </div>
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white/70">
          <input
            type="checkbox"
            checked={whiteLabelHideReviewPilot}
            onChange={(e) => setWhiteLabelHideReviewPilot(e.target.checked)}
            disabled={!canUseWhiteLabel}
          />
          Hide the ReviewPilot brand on the kiosk footer
        </label>

        <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-4 text-sm leading-7 text-white/58">
          Agency workspaces can hand kiosk links to clients with a more neutral,
          partner-branded experience. When enabled, the public kiosk can show your
          support contact instead of ReviewPilot branding.
        </div>

        <SaveButton onClick={saveWhiteLabelBranding}>
          Save white-label settings
        </SaveButton>
      </SectionCard>

      <div id="settings-kiosk-qr" className="scroll-mt-32">
        <KioskQrCard
          slug={selectedLocationId ? locationSlug || restaurant.slug : restaurant.slug}
          accentColor={selectedLocationId ? locationAccentColor : kioskAccentColor}
        />
      </div>

      <SectionCard
        id="settings-sms"
        title="SMS Settings"
        description="Timing and audience rules for reputation and retention messages."
      >
        {!canUseLifecycleMessaging && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
            Birthday and re-engagement SMS are available on Pro and Agency.
          </div>
        )}
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4 rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3">
              <IconBadge
                name="sms"
                className="h-11 w-11 border-emerald-300/18 bg-emerald-400/12 text-emerald-100"
                iconClassName="h-[18px] w-[18px]"
              />
              <div>
                <p className="text-sm font-medium text-white">Primary phone channel</p>
                <p className="mt-1 text-sm text-white/42">
                  Choose the channel your automated follow-up should prefer first.
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
            {(["SMS", "WHATSAPP"] as const).map((channelOption) => (
              <button
                key={channelOption}
                type="button"
                onClick={() => setPreferredMessagingChannel(channelOption)}
                className={`rounded-[1.4rem] border px-4 py-4 text-left text-sm transition-colors ${
                  preferredMessagingChannel === channelOption
                    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
                    : "border-white/10 bg-white/[0.02] text-white/64"
                }`}
              >
                <div className="font-medium">
                  {channelOption === "SMS" ? "SMS default" : "WhatsApp default"}
                </div>
                <div className="mt-1 text-xs text-white/38">
                  {channelOption === "SMS"
                    ? "Best for standard review and lifecycle flows"
                    : "Best when your business already runs on WhatsApp"}
                </div>
              </button>
            ))}
            </div>
            <p className="text-xs leading-6 text-white/32">
              Automated review requests, recovery drafts, birthday sends, and
              re-engagement outreach will use this channel when the business has a
              Twilio-enabled phone number for it.
            </p>
          </div>

          <div className="space-y-4 rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-5">
            <div>
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-white">
                  Send delay
                </label>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/55">
                  {sendDelay} minutes after visit
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={180}
                value={sendDelay}
                onChange={(e) => setSendDelay(Number(e.target.value))}
                className="mt-4 w-full"
              />
            </div>

            <label className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/70">
              <input
                type="checkbox"
                checked={birthdayEnabled}
                onChange={(e) => setBirthdayEnabled(e.target.checked)}
                disabled={!canUseLifecycleMessaging}
              />
              <div>
                <div className="font-medium text-white/85">Birthday SMS</div>
                <div className="mt-1 text-xs text-white/38">
                  Enable automated birthday outreach with your saved reward copy.
                </div>
              </div>
            </label>

            <div>
              <label className="block text-sm text-white/50">
                Birthday message template
              </label>
              <textarea
                value={birthdayTemplate}
                onChange={(e) => setBirthdayTemplate(e.target.value)}
                rows={4}
                disabled={!canUseLifecycleMessaging}
                className="mt-2 w-full rounded-[1.45rem] border border-white/10 bg-transparent px-4 py-4 text-sm leading-7 text-white"
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
                  className="flex items-center gap-3 rounded-[1.35rem] border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/70"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => item.onChange(e.target.checked)}
                    disabled={!canUseLifecycleMessaging}
                  />
                  <div>
                    <div className="font-medium text-white/85">{item.label}</div>
                    <div className="mt-1 text-xs text-white/38">Comeback window</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <SaveButton onClick={saveSmsSettings}>
          Save messaging rules
        </SaveButton>
      </SectionCard>

      <SectionCard
        id="settings-ai"
        title="AI Behavior"
        description="Adjust how AI-generated review and apology responses feel."
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3">
              <IconBadge
                name="spark"
                className="h-11 w-11 border-emerald-300/18 bg-emerald-400/12 text-emerald-100"
                iconClassName="h-[18px] w-[18px]"
              />
              <div>
                <p className="text-sm font-medium text-white">Tone</p>
                <p className="mt-1 text-sm text-white/42">
                  Set how your AI drafts feel when speaking to customers.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
            {(["Friendly", "Professional", "Casual"] as const).map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => setAiTone(tone)}
                className={`rounded-[1.35rem] border px-4 py-4 text-left text-sm transition-colors ${
                  aiTone === tone
                    ? "border-emerald-500/20 bg-emerald-500/20 text-emerald-100"
                    : "border-white/10 bg-white/[0.02] text-white/60"
                }`}
              >
                <div className="font-medium">{tone}</div>
                <div className="mt-1 text-xs text-white/38">
                  {tone === "Friendly"
                    ? "Warm and human for everyday loyalty and review follow-up"
                    : tone === "Professional"
                      ? "Polished, steady, and more formal in service recovery"
                      : "Relaxed and light for brands with a casual voice"}
                </div>
              </button>
            ))}
          </div>
          </div>

          <div className="rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3">
              <IconBadge
                name="message"
                className="h-11 w-11 border-white/10 bg-white/[0.04] text-white/75"
                iconClassName="h-[18px] w-[18px]"
              />
              <div>
                <p className="text-sm font-medium text-white">Response length</p>
                <p className="mt-1 text-sm text-white/42">
                  Control how compact or detailed AI-generated responses should feel.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
            {(["Short", "Medium", "Detailed"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setResponseLength(item)}
                className={`rounded-[1.35rem] border px-4 py-4 text-left text-sm transition-colors ${
                  responseLength === item
                    ? "border-emerald-500/20 bg-emerald-500/20 text-emerald-100"
                    : "border-white/10 bg-white/[0.02] text-white/60"
                }`}
              >
                <div className="font-medium">{item}</div>
                <div className="mt-1 text-xs text-white/38">
                  {item === "Short"
                    ? "Fast and concise for low-friction outreach"
                    : item === "Medium"
                      ? "Balanced length for most recovery and review flows"
                      : "More context and care for sensitive conversations"}
                </div>
              </button>
            ))}
          </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
        <label className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/70">
          <input
            type="checkbox"
            checked={autoApprove}
            onChange={(e) => setAutoApprove(e.target.checked)}
          />
          <div>
            <div className="font-medium text-white/85">
              Automatically approve 5-star review requests
            </div>
            <div className="mt-1 text-xs text-white/38">
              Removes extra friction for happy customers reaching the review step.
            </div>
          </div>
        </label>

        <label className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/70">
          <input
            type="checkbox"
            checked={includeReviewLink}
            onChange={(e) => setIncludeReviewLink(e.target.checked)}
          />
          <div>
            <div className="font-medium text-white/85">
              Include Google review link in replies
            </div>
            <div className="mt-1 text-xs text-white/38">
              Keeps the final review request more actionable when a customer is ready.
            </div>
          </div>
        </label>
        </div>

        <SaveButton onClick={saveAiBehavior}>
          Save AI behavior
        </SaveButton>
      </SectionCard>

      <SectionCard
        id="settings-locations"
        title="Locations"
        description="Manage per-location kiosk links, Twilio numbers, Google review destinations, and location-specific branding."
      >
        {!canUseMultiLocation && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
            Multiple locations are available on the Agency plan. Starter and Pro can still maintain one primary location.
          </div>
        )}
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <div className="space-y-3 rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center gap-3 border-b border-white/6 pb-4">
              <IconBadge
                name="agency"
                className="h-11 w-11 border-white/10 bg-white/[0.04] text-white/75"
                iconClassName="h-[18px] w-[18px]"
              />
              <div>
                <p className="text-sm font-medium text-white">Location workspace</p>
                <p className="mt-1 text-sm text-white/42">
                  Switch locations or create a new one for routing and kiosk control.
                </p>
              </div>
            </div>
            {locations.map((location) => (
              <button
                key={location._id}
                type="button"
                onClick={() => syncLocationState(location)}
                className={`w-full rounded-[1.45rem] border px-4 py-4 text-left text-sm transition ${
                  selectedLocationId === location._id
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                    : "border-white/8 bg-white/[0.02] text-white/70"
                }`}
              >
                <div className="font-medium">{location.name}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-white/35">
                  /kiosk/{location.slug}
                </div>
                <div className="mt-2 text-xs text-white/38">
                  {location.active ? "Active location" : "Hidden from live kiosk"}
                </div>
              </button>
            ))}
            {(canUseMultiLocation || locations.length === 0) && (
              <button
                type="button"
                onClick={() => {
                  syncLocationState(undefined);
                  setLocationName(
                    `${restaurant.name} ${locations.length === 0 ? "Main Location" : `Location ${locations.length + 1}`}`
                  );
                  setLocationSlug(
                    slugifyWorkspace(
                      `${restaurant.slug}-${locations.length === 0 ? "main" : `location-${locations.length + 1}`}`
                    )
                  );
                }}
                className="w-full rounded-[1.45rem] border border-white/10 bg-white/4 px-4 py-3 text-sm font-semibold text-white/80"
              >
                Add location
              </button>
            )}
          </div>

          <div className="space-y-4 rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-4 border-b border-white/6 pb-4">
              <div>
                <p className="text-sm font-medium text-white">Location details</p>
                <p className="mt-1 text-sm text-white/42">
                  Fine-tune kiosk slug, phone routing, review links, and per-location branding.
                </p>
              </div>
              {selectedLocationId ? (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/45">
                  Editing existing location
                </span>
              ) : (
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                  New location draft
                </span>
              )}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="block text-sm text-white/50">Location name</label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-white/50">Kiosk slug</label>
                <input
                  type="text"
                  value={locationSlug}
                  onChange={(e) => setLocationSlug(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white"
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="block text-sm text-white/50">Location phone</label>
                <input
                  type="tel"
                  value={locationContactPhone}
                  onChange={(e) => setLocationContactPhone(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-white/50">Twilio number</label>
                <input
                  type="tel"
                  value={locationTwilioNumber}
                  onChange={(e) => setLocationTwilioNumber(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white"
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="block text-sm text-white/50">Google review URL</label>
                <input
                  type="url"
                  value={locationGoogleUrl}
                  onChange={(e) => setLocationGoogleUrl(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-white/50">Kiosk display name</label>
                <input
                  type="text"
                  value={locationDisplayName}
                  onChange={(e) => setLocationDisplayName(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white"
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <label className="block text-sm text-white/50">Accent color</label>
                <input
                  type="text"
                  value={locationAccentColor}
                  onChange={(e) => setLocationAccentColor(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-white/50">Logo URL</label>
                <input
                  type="url"
                  value={locationLogoUrl}
                  onChange={(e) => setLocationLogoUrl(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-white/50">Background URL</label>
                <input
                  type="url"
                  value={locationBgImageUrl}
                  onChange={(e) => setLocationBgImageUrl(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-[1.35rem] border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/70">
              <input
                type="checkbox"
                checked={locationActive}
                onChange={(e) => setLocationActive(e.target.checked)}
              />
              Location is active
            </label>

            {locationError && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {locationError}
              </div>
            )}

            <SaveButton onClick={saveLocation}>
              {savingLocation ? "Saving location..." : selectedLocationId ? "Save location" : "Create location"}
            </SaveButton>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        id="settings-team"
        title="Team Access"
        description="Invite managers and staff, control who can operate the workspace, and keep billing owner-only."
      >
        {currentRole === "MANAGER" && (
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-4 text-sm text-sky-100">
            Managers can operate day-to-day settings, but only the owner can invite team members or manage billing.
          </div>
        )}

        {mayManageTeam ? (
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4 rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-5">
              <div>
                <p className="text-sm font-medium text-white">Invite a teammate</p>
                <p className="mt-1 text-sm leading-7 text-white/45">
                  Managers can handle settings and approvals. Staff can work customers, reviews, and SMS history without touching billing.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@business.com"
                  className="rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white placeholder:text-white/25"
                />
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as "MANAGER" | "STAFF")
                  }
                  className="rounded-2xl border border-white/10 bg-[#0c1421] px-4 py-3 text-white outline-none"
                >
                  <option value="STAFF">Staff</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-3">
                <SaveButton onClick={handleCreateInvite}>
                  {creatingInvite ? "Creating invite..." : "Create invite"}
                </SaveButton>
                {inviteLink && (
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(inviteLink);
                    }}
                    className="rounded-2xl border border-white/12 bg-white/4 px-5 py-3.5 text-sm font-semibold text-white/82"
                  >
                    Copy latest invite link
                  </button>
                )}
              </div>
              {inviteLink && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  Invite ready: {inviteLink}
                </div>
              )}
              {teamError && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {teamError}
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center gap-3">
                <IconBadge
                  name="shield"
                  className="h-10 w-10 border-white/10 bg-white/[0.04] text-white/72"
                  iconClassName="h-[17px] w-[17px]"
                />
                <div>
                  <p className="text-sm font-medium text-white">Role guide</p>
                  <p className="mt-1 text-sm text-white/42">
                    Keep access clear so teammates know exactly what they can touch.
                  </p>
                </div>
              </div>
              {[
                "Owner: full workspace control, billing, and team access.",
                "Manager: settings, kiosk, approval, customer, review, and SMS operations.",
                "Staff: customer records, review queue, and SMS visibility without billing or team controls.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm leading-7 text-white/58"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3 border-b border-white/6 pb-4">
              <IconBadge
                name="customers"
                className="h-10 w-10 border-white/10 bg-white/[0.04] text-white/72"
                iconClassName="h-[17px] w-[17px]"
              />
              <div>
                <p className="text-sm font-medium text-white">Current team</p>
                <p className="mt-1 text-sm text-white/42">
                  Manage day-to-day workspace operators without opening another panel.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {(staffUsers ?? []).map((member: StaffUserRow) => {
                const canEditMember =
                  mayManageTeam &&
                  member.role !== "OWNER" &&
                  member.role !== "SUPER_ADMIN";

                return (
                  <div
                    key={member._id}
                  className="rounded-[1.45rem] border border-white/8 bg-white/[0.02] p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{member.email}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/30">
                          {member.role}
                        </p>
                      </div>
                      {canEditMember ? (
                        <div className="flex flex-wrap gap-2">
                          <select
                            value={member.role}
                            onChange={(e) => {
                              void updateWorkspaceUserRole({
                                actorClerkId: activeClerkId,
                                userId: member._id,
                                role: e.target.value as "MANAGER" | "STAFF",
                              }).catch((error) => {
                                setTeamError(
                                  error instanceof Error
                                    ? error.message
                                    : "Unable to update role"
                                );
                              });
                            }}
                            className="rounded-xl border border-white/10 bg-[#0c1421] px-3 py-2 text-sm text-white outline-none"
                          >
                            <option value="STAFF">Staff</option>
                            <option value="MANAGER">Manager</option>
                          </select>
                          <button
                            type="button"
                            onClick={async () => {
                              setRemovingUserId(member._id);
                              try {
                                await removeWorkspaceUser({
                                  actorClerkId: activeClerkId,
                                  userId: member._id,
                                });
                              } catch (error) {
                                setTeamError(
                                  error instanceof Error
                                    ? error.message
                                    : "Unable to remove teammate"
                                );
                              } finally {
                                setRemovingUserId(null);
                              }
                            }}
                            className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                          >
                            {removingUserId === member._id ? "Removing..." : "Remove"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {(staffUsers ?? []).length === 0 && (
                <p className="text-sm text-white/45">No workspace users yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3 border-b border-white/6 pb-4">
              <IconBadge
                name="message"
                className="h-10 w-10 border-white/10 bg-white/[0.04] text-white/72"
                iconClassName="h-[17px] w-[17px]"
              />
              <div>
                <p className="text-sm font-medium text-white">Pending invites</p>
                <p className="mt-1 text-sm text-white/42">
                  Track invite links, role assignments, and outstanding access requests.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {(staffInvites ?? [])
                .filter((invite: StaffInviteRow) => invite.status === "PENDING")
                .map((invite: StaffInviteRow) => {
                  const inviteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/accept-invite/${invite.token}`;
                  return (
                    <div
                      key={invite._id}
                      className="rounded-[1.45rem] border border-white/8 bg-white/[0.02] p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-medium text-white">{invite.email}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/30">
                            {invite.role} invited by {invite.invitedByEmail}
                          </p>
                        </div>
                        {mayManageTeam ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                await navigator.clipboard.writeText(inviteUrl);
                              }}
                              className="rounded-xl border border-white/10 bg-white/4 px-3 py-2 text-sm text-white/82"
                            >
                              Copy link
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                setRevokingInviteId(invite._id);
                                try {
                                  await revokeStaffInvite({
                                    actorClerkId: activeClerkId,
                                    inviteId: invite._id,
                                  });
                                } catch (error) {
                                  setTeamError(
                                    error instanceof Error
                                      ? error.message
                                      : "Unable to revoke invite"
                                  );
                                } finally {
                                  setRevokingInviteId(null);
                                }
                              }}
                              className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                            >
                              {revokingInviteId === invite._id ? "Revoking..." : "Revoke"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              {(staffInvites ?? []).filter(
                (invite: StaffInviteRow) => invite.status === "PENDING"
              )
                .length === 0 && (
                <p className="text-sm text-white/45">No pending invites.</p>
              )}
            </div>
          </div>
        </div>
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
  const { convexUser, isLoading: userLoading } = useEnsureUser();
  const restaurant = useQuery(
    api.queries.getRestaurant,
    restaurantId ? { restaurantId } : "skip"
  );
  const settings = useQuery(
    api.queries.getRestaurantSettings,
    restaurantId ? { restaurantId } : "skip"
  );
  const locations = useQuery(
    api.queries.getLocationsForRestaurant,
    restaurantId ? { restaurantId } : "skip"
  );

  if (
    !restaurantId ||
    restaurant === undefined ||
    settings === undefined ||
    locations === undefined ||
    userLoading
  ) {
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

  if (!canAccessSettings(convexUser?.role)) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-amber-100">
        <p className="text-sm font-semibold">Settings are restricted</p>
        <p className="mt-2 text-sm leading-7 opacity-90">
          Staff can work customers, reviews, and SMS history, but only managers
          and owners can change workspace settings.
        </p>
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
      currentRole={convexUser?.role}
      locations={locations}
    />
  );
}
