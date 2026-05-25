import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { hasFeatureForTier } from "../lib/billing-plans";
import { parseLocationInput } from "../lib/validation";

type WorkspaceRole = "SUPER_ADMIN" | "OWNER" | "MANAGER" | "STAFF";

function normalizeOptionalText(value: string | undefined) {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function requireWorkspacePermission(
  ctx: { db: unknown },
  actorClerkId: string,
  restaurantId: string,
  allowedRoles: WorkspaceRole[]
) {
  const usersQuery = (
    ctx.db as {
      query: (table: "users") => {
        withIndex: (
          name: "by_clerkId",
          cb: (q: { eq: (field: "clerkId", value: string) => unknown }) => unknown
        ) => {
          first: () => Promise<{
            role: WorkspaceRole;
            restaurantId?: string;
          } | null>;
        };
      };
    }
  ).query("users");

  const actor = await usersQuery
    .withIndex("by_clerkId", (q: { eq: (field: "clerkId", value: string) => unknown }) =>
      q.eq("clerkId", actorClerkId)
    )
    .first();

  if (!actor) {
    throw new Error("User record not found");
  }
  if (!allowedRoles.includes(actor.role)) {
    throw new Error("You do not have permission for this action");
  }
  if (actor.role !== "SUPER_ADMIN" && actor.restaurantId !== restaurantId) {
    throw new Error("Workspace access denied");
  }

  return actor;
}

export const dismissSms = mutation({
  args: {
    smsLogId: v.id("smsLogs"),
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, { smsLogId, restaurantId }) => {
    const log = await ctx.db.get(smsLogId);
    if (!log || log.restaurantId !== restaurantId)
      throw new Error("Invalid SMS log");
    if (log.status !== "PENDING_APPROVAL")
      throw new Error("SMS already processed");
    await ctx.db.patch(smsLogId, { status: "FAILED" });
    return { ok: true };
  },
});

export const updateSmsContent = mutation({
  args: {
    smsLogId: v.id("smsLogs"),
    restaurantId: v.id("restaurants"),
    content: v.string(),
  },
  handler: async (ctx, { smsLogId, restaurantId, content }) => {
    const log = await ctx.db.get(smsLogId);
    if (!log || log.restaurantId !== restaurantId)
      throw new Error("Invalid SMS log");
    if (log.status !== "PENDING_APPROVAL")
      throw new Error("SMS already processed");
    await ctx.db.patch(smsLogId, { content });
    return { ok: true };
  },
});

export const updateRestaurantSettings = mutation({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    businessName: v.optional(v.string()),
    businessType: v.optional(
      v.union(
        v.literal("RESTAURANT"),
        v.literal("DENTAL_CLINIC"),
        v.literal("GROCERY_STORE"),
        v.literal("SALON_SPA"),
        v.literal("FITNESS_STUDIO"),
        v.literal("HOME_SERVICE"),
        v.literal("AUTOMOTIVE_SERVICE"),
        v.literal("RETAIL_STORE"),
        v.literal("PROFESSIONAL_SERVICE"),
        v.literal("GENERAL_SERVICE")
      )
    ),
    businessSubtype: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    sendDelayMinutes: v.optional(v.number()),
    birthdayEnabled: v.optional(v.boolean()),
    birthdayTemplate: v.optional(v.string()),
    reengagement30: v.optional(v.boolean()),
    reengagement60: v.optional(v.boolean()),
    reengagement90: v.optional(v.boolean()),
    aiTone: v.optional(
      v.union(
        v.literal("Friendly"),
        v.literal("Professional"),
        v.literal("Casual")
      )
    ),
    responseLength: v.optional(
      v.union(
        v.literal("Short"),
        v.literal("Medium"),
        v.literal("Detailed")
      )
    ),
    autoApprove: v.optional(v.boolean()),
    includeReviewLink: v.optional(v.boolean()),
    kioskAccentColor: v.optional(v.string()),
    kioskLogoUrl: v.optional(v.string()),
    kioskDisplayName: v.optional(v.string()),
    kioskBgImageUrl: v.optional(v.string()),
    googleBusinessUrl: v.optional(v.string()),
    whiteLabelEnabled: v.optional(v.boolean()),
    whiteLabelBrandName: v.optional(v.string()),
    whiteLabelSupportEmail: v.optional(v.string()),
    whiteLabelHideReviewPilot: v.optional(v.boolean()),
    leaderboardOptIn: v.optional(v.boolean()),
    leaderboardBadgeLabel: v.optional(v.string()),
    preferredMessagingChannel: v.optional(
      v.union(v.literal("SMS"), v.literal("WHATSAPP"))
    ),
  },
  handler: async (ctx, args) => {
    const {
      actorClerkId,
      restaurantId,
      businessName,
      businessType,
      businessSubtype,
      contactPhone,
      websiteUrl,
      googleBusinessUrl,
      ...settingsUpdates
    } = args;

    await requireWorkspacePermission(ctx, actorClerkId, restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
      "MANAGER",
    ]);

    const restaurantPatch: Record<string, string | undefined> = {};
    if (businessName !== undefined) restaurantPatch.name = businessName.trim();
    if (businessType !== undefined) restaurantPatch.businessType = businessType;
    if (businessSubtype !== undefined) {
      restaurantPatch.businessSubtype = normalizeOptionalText(businessSubtype);
    }
    if (contactPhone !== undefined) {
      restaurantPatch.contactPhone = normalizeOptionalText(contactPhone);
    }
    if (websiteUrl !== undefined) {
      restaurantPatch.websiteUrl = normalizeOptionalText(websiteUrl);
    }
    if (googleBusinessUrl !== undefined) {
      restaurantPatch.googleBusinessUrl = normalizeOptionalText(googleBusinessUrl);
    }

    if (Object.keys(restaurantPatch).length > 0) {
      await ctx.db.patch(restaurantId, restaurantPatch);
    }

    const existing = await ctx.db
      .query("restaurantSettings")
      .withIndex("by_restaurantId", (q) =>
        q.eq("restaurantId", restaurantId)
      )
      .first();

    const defaults = {
      sendDelayMinutes: 60,
      birthdayEnabled: true,
      reengagement30: true,
      reengagement60: true,
      reengagement90: true,
      aiTone: "Friendly" as const,
      responseLength: "Medium" as const,
      autoApprove: false,
      includeReviewLink: true,
      whiteLabelEnabled: false,
      whiteLabelHideReviewPilot: false,
      leaderboardOptIn: false,
      leaderboardBadgeLabel: "",
      preferredMessagingChannel: "SMS" as const,
    };

    const normalizedSettingsUpdates = {
      ...settingsUpdates,
      birthdayTemplate: normalizeOptionalText(settingsUpdates.birthdayTemplate),
      kioskAccentColor: normalizeOptionalText(settingsUpdates.kioskAccentColor),
      kioskLogoUrl: normalizeOptionalText(settingsUpdates.kioskLogoUrl),
      kioskDisplayName: normalizeOptionalText(settingsUpdates.kioskDisplayName),
      kioskBgImageUrl: normalizeOptionalText(settingsUpdates.kioskBgImageUrl),
      whiteLabelBrandName: normalizeOptionalText(
        settingsUpdates.whiteLabelBrandName
      ),
      whiteLabelSupportEmail: normalizeOptionalText(
        settingsUpdates.whiteLabelSupportEmail
      ),
      leaderboardBadgeLabel: normalizeOptionalText(
        settingsUpdates.leaderboardBadgeLabel
      ),
    };

    const merged = {
      ...defaults,
      ...(existing || {}),
      ...normalizedSettingsUpdates,
    } as {
      sendDelayMinutes: number;
      birthdayEnabled: boolean;
      reengagement30: boolean;
      reengagement60: boolean;
      reengagement90: boolean;
      aiTone?: "Friendly" | "Professional" | "Casual";
      responseLength?: "Short" | "Medium" | "Detailed";
      autoApprove?: boolean;
      includeReviewLink?: boolean;
      birthdayTemplate?: string;
      kioskAccentColor?: string;
      kioskLogoUrl?: string;
      kioskDisplayName?: string;
      kioskBgImageUrl?: string;
      whiteLabelEnabled?: boolean;
      whiteLabelBrandName?: string;
      whiteLabelSupportEmail?: string;
      whiteLabelHideReviewPilot?: boolean;
      leaderboardOptIn?: boolean;
      leaderboardBadgeLabel?: string;
      preferredMessagingChannel?: "SMS" | "WHATSAPP";
    };

    if (existing) {
      await ctx.db.replace(existing._id, {
        restaurantId,
        sendDelayMinutes: merged.sendDelayMinutes,
        birthdayEnabled: merged.birthdayEnabled,
        reengagement30: merged.reengagement30,
        reengagement60: merged.reengagement60,
        reengagement90: merged.reengagement90,
        aiTone: merged.aiTone,
        responseLength: merged.responseLength,
        autoApprove: merged.autoApprove,
        includeReviewLink: merged.includeReviewLink,
        birthdayTemplate: merged.birthdayTemplate,
        kioskAccentColor: merged.kioskAccentColor,
        kioskLogoUrl: merged.kioskLogoUrl,
        kioskDisplayName: merged.kioskDisplayName,
        kioskBgImageUrl: merged.kioskBgImageUrl,
        whiteLabelEnabled: merged.whiteLabelEnabled,
        whiteLabelBrandName: merged.whiteLabelBrandName,
        whiteLabelSupportEmail: merged.whiteLabelSupportEmail,
        whiteLabelHideReviewPilot: merged.whiteLabelHideReviewPilot,
        leaderboardOptIn: merged.leaderboardOptIn,
        leaderboardBadgeLabel: merged.leaderboardBadgeLabel,
        preferredMessagingChannel: merged.preferredMessagingChannel,
      });
    } else {
      await ctx.db.insert("restaurantSettings", {
        restaurantId,
        sendDelayMinutes: merged.sendDelayMinutes,
        birthdayEnabled: merged.birthdayEnabled,
        reengagement30: merged.reengagement30,
        reengagement60: merged.reengagement60,
        reengagement90: merged.reengagement90,
        aiTone: merged.aiTone,
        responseLength: merged.responseLength,
        autoApprove: merged.autoApprove,
        includeReviewLink: merged.includeReviewLink,
        birthdayTemplate: merged.birthdayTemplate,
        kioskAccentColor: merged.kioskAccentColor,
        kioskLogoUrl: merged.kioskLogoUrl,
        kioskDisplayName: merged.kioskDisplayName,
        kioskBgImageUrl: merged.kioskBgImageUrl,
        whiteLabelEnabled: merged.whiteLabelEnabled,
        whiteLabelBrandName: merged.whiteLabelBrandName,
        whiteLabelSupportEmail: merged.whiteLabelSupportEmail,
        whiteLabelHideReviewPilot: merged.whiteLabelHideReviewPilot,
        leaderboardOptIn: merged.leaderboardOptIn,
        leaderboardBadgeLabel: merged.leaderboardBadgeLabel,
        preferredMessagingChannel: merged.preferredMessagingChannel,
      });
    }
    return { ok: true };
  },
});

export const generateUploadUrl = mutation({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, { actorClerkId, restaurantId }) => {
    await requireWorkspacePermission(ctx, actorClerkId, restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
      "MANAGER",
    ]);
    return await ctx.storage.generateUploadUrl();
  },
});

export const storeUploadedAsset = mutation({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    storageId: v.id("_storage"),
    assetType: v.union(v.literal("logo"), v.literal("background")),
  },
  handler: async (ctx, { actorClerkId, restaurantId, storageId, assetType }) => {
    await requireWorkspacePermission(ctx, actorClerkId, restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
      "MANAGER",
    ]);
    const url = await ctx.storage.getUrl(storageId);
    if (!url) {
      throw new Error("Upload failed to produce a file URL");
    }

    const existing = await ctx.db
      .query("restaurantSettings")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurantId))
      .first();

    const defaults = {
      sendDelayMinutes: 60,
      birthdayEnabled: true,
      reengagement30: true,
      reengagement60: true,
      reengagement90: true,
      aiTone: "Friendly" as const,
      responseLength: "Medium" as const,
      autoApprove: false,
      includeReviewLink: true,
      whiteLabelEnabled: false,
      whiteLabelHideReviewPilot: false,
      leaderboardOptIn: false,
      leaderboardBadgeLabel: "",
      preferredMessagingChannel: "SMS" as const,
    };

    const merged = {
      ...defaults,
      ...(existing || {}),
      ...(assetType === "logo"
        ? { kioskLogoUrl: url }
        : { kioskBgImageUrl: url }),
    } as {
      sendDelayMinutes: number;
      birthdayEnabled: boolean;
      reengagement30: boolean;
      reengagement60: boolean;
      reengagement90: boolean;
      aiTone?: "Friendly" | "Professional" | "Casual";
      responseLength?: "Short" | "Medium" | "Detailed";
      autoApprove?: boolean;
      includeReviewLink?: boolean;
      birthdayTemplate?: string;
      kioskAccentColor?: string;
      kioskLogoUrl?: string;
      kioskDisplayName?: string;
      kioskBgImageUrl?: string;
      whiteLabelEnabled?: boolean;
      whiteLabelBrandName?: string;
      whiteLabelSupportEmail?: string;
      whiteLabelHideReviewPilot?: boolean;
      leaderboardOptIn?: boolean;
      leaderboardBadgeLabel?: string;
      preferredMessagingChannel?: "SMS" | "WHATSAPP";
    };

    if (existing) {
      await ctx.db.replace(existing._id, {
        restaurantId,
        sendDelayMinutes: merged.sendDelayMinutes,
        birthdayEnabled: merged.birthdayEnabled,
        reengagement30: merged.reengagement30,
        reengagement60: merged.reengagement60,
        reengagement90: merged.reengagement90,
        aiTone: merged.aiTone,
        responseLength: merged.responseLength,
        autoApprove: merged.autoApprove,
        includeReviewLink: merged.includeReviewLink,
        birthdayTemplate: merged.birthdayTemplate,
        kioskAccentColor: merged.kioskAccentColor,
        kioskLogoUrl: merged.kioskLogoUrl,
        kioskDisplayName: merged.kioskDisplayName,
        kioskBgImageUrl: merged.kioskBgImageUrl,
        whiteLabelEnabled: merged.whiteLabelEnabled,
        whiteLabelBrandName: merged.whiteLabelBrandName,
        whiteLabelSupportEmail: merged.whiteLabelSupportEmail,
        whiteLabelHideReviewPilot: merged.whiteLabelHideReviewPilot,
        leaderboardOptIn: merged.leaderboardOptIn,
        leaderboardBadgeLabel: merged.leaderboardBadgeLabel,
        preferredMessagingChannel: merged.preferredMessagingChannel,
      });
    } else {
      await ctx.db.insert("restaurantSettings", {
        restaurantId,
        sendDelayMinutes: merged.sendDelayMinutes,
        birthdayEnabled: merged.birthdayEnabled,
        reengagement30: merged.reengagement30,
        reengagement60: merged.reengagement60,
        reengagement90: merged.reengagement90,
        aiTone: merged.aiTone,
        responseLength: merged.responseLength,
        autoApprove: merged.autoApprove,
        includeReviewLink: merged.includeReviewLink,
        birthdayTemplate: merged.birthdayTemplate,
        kioskAccentColor: merged.kioskAccentColor,
        kioskLogoUrl: merged.kioskLogoUrl,
        kioskDisplayName: merged.kioskDisplayName,
        kioskBgImageUrl: merged.kioskBgImageUrl,
        whiteLabelEnabled: merged.whiteLabelEnabled,
        whiteLabelBrandName: merged.whiteLabelBrandName,
        whiteLabelSupportEmail: merged.whiteLabelSupportEmail,
        whiteLabelHideReviewPilot: merged.whiteLabelHideReviewPilot,
        leaderboardOptIn: merged.leaderboardOptIn,
        leaderboardBadgeLabel: merged.leaderboardBadgeLabel,
        preferredMessagingChannel: merged.preferredMessagingChannel,
      });
    }

    return { url };
  },
});

export const createLocation = mutation({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    locationName: v.string(),
    locationSlug: v.string(),
    contactPhone: v.optional(v.string()),
    googleBusinessUrl: v.optional(v.string()),
    twilioNumber: v.optional(v.string()),
    kioskDisplayName: v.optional(v.string()),
    kioskAccentColor: v.optional(v.string()),
    kioskLogoUrl: v.optional(v.string()),
    kioskBgImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireWorkspacePermission(ctx, args.actorClerkId, args.restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
    ]);

    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error("Workspace not found");
    }

    const existingLocations = await ctx.db
      .query("locations")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();

    if (
      existingLocations.length >= 1 &&
      !hasFeatureForTier(restaurant.tier, "multiLocation")
    ) {
      throw new Error("Multiple locations are available on the Agency plan.");
    }

    if (existingLocations.length >= 5) {
      throw new Error("Agency workspaces can manage up to 5 locations.");
    }

    const parsed = parseLocationInput(args);
    const existingRestaurantSlug = await ctx.db
      .query("restaurants")
      .withIndex("by_slug", (q) => q.eq("slug", parsed.locationSlug))
      .first();
    const existingLocationSlug = await ctx.db
      .query("locations")
      .withIndex("by_slug", (q) => q.eq("slug", parsed.locationSlug))
      .first();

    if (existingRestaurantSlug || existingLocationSlug) {
      throw new Error("That kiosk slug is already in use.");
    }

    return await ctx.db.insert("locations", {
      restaurantId: args.restaurantId,
      name: parsed.locationName,
      slug: parsed.locationSlug,
      contactPhone: parsed.contactPhone,
      googleBusinessUrl: parsed.googleBusinessUrl,
      twilioNumber: parsed.twilioNumber,
      kioskDisplayName: parsed.kioskDisplayName,
      kioskAccentColor: parsed.kioskAccentColor,
      kioskLogoUrl: parsed.kioskLogoUrl,
      kioskBgImageUrl: parsed.kioskBgImageUrl,
      active: true,
    });
  },
});

export const updateLocation = mutation({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    locationId: v.id("locations"),
    locationName: v.string(),
    locationSlug: v.string(),
    contactPhone: v.optional(v.string()),
    googleBusinessUrl: v.optional(v.string()),
    twilioNumber: v.optional(v.string()),
    kioskDisplayName: v.optional(v.string()),
    kioskAccentColor: v.optional(v.string()),
    kioskLogoUrl: v.optional(v.string()),
    kioskBgImageUrl: v.optional(v.string()),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireWorkspacePermission(ctx, args.actorClerkId, args.restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
      "MANAGER",
    ]);

    const location = await ctx.db.get(args.locationId);
    if (!location || location.restaurantId !== args.restaurantId) {
      throw new Error("Location not found");
    }

    const parsed = parseLocationInput(args);
    if (parsed.locationSlug !== location.slug) {
      const existingRestaurantSlug = await ctx.db
        .query("restaurants")
        .withIndex("by_slug", (q) => q.eq("slug", parsed.locationSlug))
        .first();
      const existingLocationSlug = await ctx.db
        .query("locations")
        .withIndex("by_slug", (q) => q.eq("slug", parsed.locationSlug))
        .first();

      if (existingRestaurantSlug || (existingLocationSlug && existingLocationSlug._id !== args.locationId)) {
        throw new Error("That kiosk slug is already in use.");
      }
    }

    await ctx.db.patch(args.locationId, {
      name: parsed.locationName,
      slug: parsed.locationSlug,
      contactPhone: parsed.contactPhone,
      googleBusinessUrl: parsed.googleBusinessUrl,
      twilioNumber: parsed.twilioNumber,
      kioskDisplayName: parsed.kioskDisplayName,
      kioskAccentColor: parsed.kioskAccentColor,
      kioskLogoUrl: parsed.kioskLogoUrl,
      kioskBgImageUrl: parsed.kioskBgImageUrl,
      active: args.active,
    });

    return { ok: true };
  },
});

export const updateCustomerVisitNote = mutation({
  args: {
    customerId: v.id("customers"),
    restaurantId: v.id("restaurants"),
    visitNote: v.string(),
  },
  handler: async (ctx, { customerId, restaurantId, visitNote }) => {
    const customer = await ctx.db.get(customerId);
    if (!customer || customer.restaurantId !== restaurantId)
      throw new Error("Invalid customer");
    await ctx.db.patch(customerId, { visitNote });
    return { ok: true };
  },
});

export const updateCustomerContactPreferences = mutation({
  args: {
    customerId: v.id("customers"),
    restaurantId: v.id("restaurants"),
    email: v.optional(v.string()),
    optedInSms: v.boolean(),
    optedInEmail: v.boolean(),
  },
  handler: async (ctx, { customerId, restaurantId, email, optedInSms, optedInEmail }) => {
    const customer = await ctx.db.get(customerId);
    if (!customer || customer.restaurantId !== restaurantId) {
      throw new Error("Invalid customer");
    }

    const normalizedEmail = email?.trim().toLowerCase() || undefined;
    await ctx.db.patch(customerId, {
      email: normalizedEmail,
      optedInSms,
      optedInEmail: normalizedEmail ? optedInEmail : false,
    });

    return { ok: true };
  },
});

export const deleteCustomer = mutation({
  args: {
    customerId: v.id("customers"),
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, { customerId, restaurantId }) => {
    const customer = await ctx.db.get(customerId);
    if (!customer || customer.restaurantId !== restaurantId)
      throw new Error("Invalid customer");
    await ctx.db.delete(customerId);
    return { ok: true };
  },
});

export const deleteCustomerPrivacyData = mutation({
  args: {
    actorClerkId: v.string(),
    customerId: v.id("customers"),
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, { actorClerkId, customerId, restaurantId }) => {
    const actor = await requireWorkspacePermission(ctx, actorClerkId, restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
    ]);

    const customer = await ctx.db.get(customerId);
    if (!customer || customer.restaurantId !== restaurantId) {
      throw new Error("Invalid customer");
    }

    const [feedback, receipts, smsLogs, claims, voiceCalls, notifications, integrationEvents] =
      await Promise.all([
        ctx.db
          .query("feedback")
          .filter((q) =>
            q.and(
              q.eq(q.field("restaurantId"), restaurantId),
              q.eq(q.field("customerId"), customerId)
            )
          )
          .collect(),
        ctx.db
          .query("receipts")
          .filter((q) =>
            q.and(
              q.eq(q.field("restaurantId"), restaurantId),
              q.eq(q.field("customerId"), customerId)
            )
          )
          .collect(),
        ctx.db
          .query("smsLogs")
          .filter((q) =>
            q.and(
              q.eq(q.field("restaurantId"), restaurantId),
              q.eq(q.field("customerId"), customerId)
            )
          )
          .collect(),
        ctx.db
          .query("loyaltyClaims")
          .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
          .collect(),
        ctx.db
          .query("voiceRecoveryCalls")
          .filter((q) =>
            q.and(
              q.eq(q.field("restaurantId"), restaurantId),
              q.eq(q.field("customerId"), customerId)
            )
          )
          .collect(),
        ctx.db
          .query("notifications")
          .filter((q) =>
            q.and(
              q.eq(q.field("restaurantId"), restaurantId),
              q.eq(q.field("customerId"), customerId)
            )
          )
          .collect(),
        ctx.db
          .query("integrationEvents")
          .filter((q) =>
            q.and(
              q.eq(q.field("restaurantId"), restaurantId),
              q.eq(q.field("customerId"), customerId)
            )
          )
          .collect(),
      ]);

    const receiptIds = new Set(receipts.map((receipt) => receipt._id));
    const receiptLinkedIntegrationEvents = (await ctx.db
      .query("integrationEvents")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect()).filter((event) =>
      event.receiptId ? receiptIds.has(event.receiptId) : false
    );

    for (const event of integrationEvents) {
      await ctx.db.patch(event._id, { customerId: undefined });
    }
    for (const event of receiptLinkedIntegrationEvents) {
      await ctx.db.patch(event._id, {
        customerId: undefined,
        receiptId: undefined,
      });
    }
    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }
    for (const call of voiceCalls) {
      await ctx.db.delete(call._id);
    }
    for (const claim of claims) {
      await ctx.db.delete(claim._id);
    }
    for (const log of smsLogs) {
      await ctx.db.delete(log._id);
    }
    for (const receipt of receipts) {
      await ctx.db.delete(receipt._id);
    }
    for (const row of feedback) {
      await ctx.db.delete(row._id);
    }
    await ctx.db.delete(customerId);

    await ctx.db.insert("adminAuditLogs", {
      action: "CUSTOMER_PRIVACY_DELETE",
      actorEmail: actor.role === "SUPER_ADMIN" ? "super-admin" : undefined,
      targetRestaurantId: restaurantId,
      summary: `Deleted customer data for ${customer.name} (${customer.phone})`,
      createdAt: Date.now(),
    });

    return {
      deletedCustomerId: customerId,
      deletedCounts: {
        feedback: feedback.length,
        receipts: receipts.length,
        smsLogs: smsLogs.length,
        loyaltyClaims: claims.length,
        voiceCalls: voiceCalls.length,
        notifications: notifications.length,
      },
    };
  },
});
