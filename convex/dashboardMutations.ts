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
    sendDelayMinutes: v.optional(v.number()),
    birthdayEnabled: v.optional(v.boolean()),
    birthdayTemplate: v.optional(v.string()),
    reengagement30: v.optional(v.boolean()),
    reengagement60: v.optional(v.boolean()),
    reengagement90: v.optional(v.boolean()),
    kioskAccentColor: v.optional(v.string()),
    kioskLogoUrl: v.optional(v.string()),
    kioskDisplayName: v.optional(v.string()),
    kioskBgImageUrl: v.optional(v.string()),   // ← ADD THIS
    googleBusinessUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { restaurantId, googleBusinessUrl, ...settingsUpdates } = args;

    if (googleBusinessUrl !== undefined) {
      await ctx.db.patch(restaurantId, { googleBusinessUrl });
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
