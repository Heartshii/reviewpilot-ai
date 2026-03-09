import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const updateRestaurantTier = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    tier: v.number(),
  },
  handler: async (ctx, { restaurantId, tier }) => {
    const smsLimits: Record<number, number> = {
      1: 300,
      2: 750,
      3: 2000,
    };
    await ctx.db.patch(restaurantId, {
      tier,
      smsLimit: smsLimits[tier] ?? 300,
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
    googleBusinessUrl: v.optional(v.string()),
    twilioNumber: v.optional(v.string()),
    tier: v.number(),
  },
  handler: async (ctx, args) => {
    const smsLimits: Record<number, number> = {
      1: 300,
      2: 750,
      3: 2000,
    };
    const restaurantId = await ctx.db.insert("restaurants", {
      name: args.name,
      slug: args.slug,
      tier: args.tier,
      smsLimit: smsLimits[args.tier] ?? 300,
      smsUsed: 0,
      overageRate: 0.05,
      googleBusinessUrl: args.googleBusinessUrl,
      twilioNumber: args.twilioNumber,
      active: true,
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

    const tierPrices: Record<number, number> = {
      1: 49,
      2: 99,
      3: 179,
    };
    const totalMRR = restaurants
      .filter((r) => r.active)
      .reduce((sum, r) => sum + (tierPrices[r.tier] ?? 49), 0);

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