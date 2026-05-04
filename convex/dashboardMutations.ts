import { v } from "convex/values";
import { mutation } from "./_generated/server";

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
    kioskBgImageUrl: v.optional(v.string()),   // ← ADD THIS
    googleBusinessUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const {
      restaurantId,
      businessName,
      businessType,
      businessSubtype,
      contactPhone,
      websiteUrl,
      googleBusinessUrl,
      ...settingsUpdates
    } = args;

    const restaurantPatch: Record<string, string> = {};
    if (businessName !== undefined) restaurantPatch.name = businessName;
    if (businessType !== undefined) restaurantPatch.businessType = businessType;
    if (businessSubtype !== undefined) {
      restaurantPatch.businessSubtype = businessSubtype;
    }
    if (contactPhone !== undefined) restaurantPatch.contactPhone = contactPhone;
    if (websiteUrl !== undefined) restaurantPatch.websiteUrl = websiteUrl;
    if (googleBusinessUrl !== undefined) {
      restaurantPatch.googleBusinessUrl = googleBusinessUrl;
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
    };

    const merged = {
      ...defaults,
      ...(existing || {}),
      ...settingsUpdates,
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
      kioskBgImageUrl?: string;   // ← ADD THIS
    };

    if (existing) {
      await ctx.db.patch(existing._id, merged);
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
        kioskBgImageUrl: merged.kioskBgImageUrl,   // ← ADD THIS
      });
    }
    return { ok: true };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const storeUploadedAsset = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    storageId: v.id("_storage"),
    assetType: v.union(v.literal("logo"), v.literal("background")),
  },
  handler: async (ctx, { restaurantId, storageId, assetType }) => {
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
    };

    if (existing) {
      await ctx.db.patch(existing._id, merged);
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
      });
    }

    return { url };
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
