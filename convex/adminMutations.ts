import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getPlanByTier } from "../lib/billing-plans";

export const updateRestaurantTier = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    tier: v.number(),
  },
  handler: async (ctx, { restaurantId, tier }) => {
    await ctx.db.patch(restaurantId, {
      tier,
      smsLimit: getPlanByTier(tier).smsLimit,
    });
  },
});

export const toggleRestaurantActive = mutation({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const r = await ctx.db.get(restaurantId);
    if (!r) throw new Error("Restaurant not found");
    await ctx.db.patch(restaurantId, { active: !r.active });
  },
});

export const addSmsCredits = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    credits: v.number(),
  },
  handler: async (ctx, { restaurantId, credits }) => {
    const r = await ctx.db.get(restaurantId);
    if (!r) throw new Error("Restaurant not found");
    await ctx.db.patch(restaurantId, {
      smsLimit: r.smsLimit + credits,
    });
  },
});

export const createRestaurant = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    ownerEmail: v.string(),
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
    googleBusinessUrl: v.optional(v.string()),
    twilioNumber: v.optional(v.string()),
    tier: v.number(),
  },
  handler: async (ctx, args) => {
    const restaurantId = await ctx.db.insert("restaurants", {
      name: args.name,
      slug: args.slug,
      businessType: args.businessType,
      businessSubtype: args.businessSubtype,
      contactPhone: args.contactPhone,
      websiteUrl: args.websiteUrl,
      tier: args.tier,
      smsLimit: getPlanByTier(args.tier).smsLimit,
      smsUsed: 0,
      overageRate: 0.05,
      googleBusinessUrl: args.googleBusinessUrl,
      twilioNumber: args.twilioNumber,
      active: true,
    });
    await ctx.db.insert("restaurantSettings", {
      restaurantId,
      sendDelayMinutes: 60,
      birthdayEnabled: true,
      reengagement30: true,
      reengagement60: true,
      reengagement90: true,
      aiTone: "Friendly",
      responseLength: "Medium",
      autoApprove: false,
      includeReviewLink: true,
      kioskDisplayName: args.name,
    });
    await ctx.db.insert("users", {
      clerkId: `pending_${Date.now()}`,
      email: args.ownerEmail,
      role: "OWNER",
      restaurantId,
    });
    return restaurantId;
  },
});

export const deleteRestaurant = mutation({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const restaurant = await ctx.db.get(restaurantId);
    if (!restaurant) throw new Error("Client not found");

    const [settings, customers, smsLogs, feedback, notifications, receipts, users] =
      await Promise.all([
        ctx.db
          .query("restaurantSettings")
          .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurantId))
          .collect(),
        ctx.db
          .query("customers")
          .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
          .collect(),
        ctx.db
          .query("smsLogs")
          .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
          .collect(),
        ctx.db
          .query("feedback")
          .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
          .collect(),
        ctx.db
          .query("notifications")
          .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
          .collect(),
        ctx.db
          .query("receipts")
          .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
          .collect(),
        ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
          .collect(),
      ]);

    for (const row of settings) await ctx.db.delete(row._id);
    for (const row of notifications) await ctx.db.delete(row._id);
    for (const row of smsLogs) await ctx.db.delete(row._id);
    for (const row of feedback) await ctx.db.delete(row._id);
    for (const row of receipts) await ctx.db.delete(row._id);
    for (const row of customers) await ctx.db.delete(row._id);

    for (const user of users) {
      if (user.role === "SUPER_ADMIN") {
        await ctx.db.patch(user._id, { restaurantId: undefined });
      } else {
        await ctx.db.delete(user._id);
      }
    }

    await ctx.db.delete(restaurantId);
    return { ok: true };
  },
});

export const updateGlobalSetting = mutation({
  args: {
    key: v.string(),
    value: v.string(),
  },
  handler: async (ctx, { key, value }) => {
    const existing = await ctx.db
      .query("globalSettings")
      .filter((q) => q.eq(q.field("key"), key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value });
    } else {
      await ctx.db.insert("globalSettings", { key, value });
    }
  },
});

export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    const restaurants = await ctx.db.query("restaurants").collect();
    const totalActiveClients = restaurants.filter((r) => r.active).length;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const allSmsLogs = await ctx.db.query("smsLogs").collect();
    const totalSmsTodayCount = allSmsLogs.filter(
      (s) => s.sentAt >= todayStart.getTime()
    ).length;

    const welcomeSent = allSmsLogs.filter(
      (s) => s.smsType === "WELCOME" && s.status === "SENT"
    ).length;
    const googleSent = allSmsLogs.filter(
      (s) => s.smsType === "GOOGLE_REVIEW" && s.status === "SENT"
    ).length;
    const googleConversionRate =
      welcomeSent > 0
        ? Math.round((googleSent / welcomeSent) * 100)
        : 0;

    const totalMRR = restaurants
      .filter((r) => r.active)
      .reduce((sum, r) => sum + getPlanByTier(r.tier).price, 0);

    const upsellAlerts = restaurants.filter(
      (r) => r.active && r.smsLimit > 0 && r.smsUsed / r.smsLimit >= 0.9
    );

    return {
      totalActiveClients,
      totalSmsTodayCount,
      googleConversionRate,
      totalMRR,
      upsellAlerts,
    };
  },
});

export const getAllRestaurants = query({
  args: {},
  handler: async (ctx) => {
    const restaurants = await ctx.db.query("restaurants").collect();
    const users = await ctx.db.query("users").collect();
    const customers = await ctx.db.query("customers").collect();

    return restaurants.map((r) => {
      const owner = users.find(
        (u) => u.restaurantId === r._id && u.role === "OWNER"
      );
      const customerCount = customers.filter(
        (c) => c.restaurantId === r._id
      ).length;
      return {
        ...r,
        ownerEmail: owner?.email ?? "No owner",
        customerCount,
      };
    });
  },
});
