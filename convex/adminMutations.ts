import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getInitialTrialEndsAt, getPlanByTier } from "../lib/billing-plans";
import { getSuperAdminEmails } from "../lib/env";
import { parseLocationInput, parseOnboardingInput } from "../lib/validation";

async function logAdminAction(
  ctx: { db: MutationCtx["db"] },
  args: {
    action: string;
    summary: string;
    actorEmail?: string;
    targetRestaurantId?: Id<"restaurants">;
  }
) {
  await ctx.db.insert("adminAuditLogs", {
    action: args.action,
    actorEmail: args.actorEmail,
    targetRestaurantId: args.targetRestaurantId,
    summary: args.summary,
    createdAt: Date.now(),
  });
}

async function requireSuperAdmin(
  ctx: { db: QueryCtx["db"] | MutationCtx["db"] },
  clerkId: string,
  actorEmail?: string
) {
  const actor = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .first();

  const allowlistedEmails = getSuperAdminEmails();
  const isAllowlisted =
    allowlistedEmails.includes(
      (actor?.email ?? actorEmail ?? "").trim().toLowerCase()
    );

  if (!actor || (actor.role !== "SUPER_ADMIN" && !isAllowlisted)) {
    throw new Error("Super admin access required");
  }

  return actor;
}

export const updateRestaurantTier = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    tier: v.number(),
    actorEmail: v.optional(v.string()),
  },
  handler: async (ctx, { restaurantId, tier, actorEmail }) => {
    const restaurant = await ctx.db.get(restaurantId);
    if (!restaurant) throw new Error("Restaurant not found");
    await ctx.db.patch(restaurantId, {
      tier,
      smsLimit: getPlanByTier(tier).smsLimit,
    });
    await logAdminAction(ctx, {
      action: "restaurant.tier_updated",
      actorEmail,
      targetRestaurantId: restaurantId,
      summary: `${restaurant.name} moved to ${getPlanByTier(tier).name}.`,
    });
  },
});

export const toggleRestaurantActive = mutation({
  args: { restaurantId: v.id("restaurants"), actorEmail: v.optional(v.string()) },
  handler: async (ctx, { restaurantId, actorEmail }) => {
    const restaurant = await ctx.db.get(restaurantId);
    if (!restaurant) throw new Error("Restaurant not found");
    await ctx.db.patch(restaurantId, { active: !restaurant.active });
    await logAdminAction(ctx, {
      action: restaurant.active
        ? "restaurant.suspended"
        : "restaurant.activated",
      actorEmail,
      targetRestaurantId: restaurantId,
      summary: `${restaurant.name} was ${
        restaurant.active ? "suspended" : "activated"
      }.`,
    });
  },
});

export const addSmsCredits = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    credits: v.number(),
    actorEmail: v.optional(v.string()),
  },
  handler: async (ctx, { restaurantId, credits, actorEmail }) => {
    const restaurant = await ctx.db.get(restaurantId);
    if (!restaurant) throw new Error("Restaurant not found");
    await ctx.db.patch(restaurantId, {
      smsLimit: restaurant.smsLimit + credits,
    });
    await logAdminAction(ctx, {
      action: "restaurant.sms_credits_added",
      actorEmail,
      targetRestaurantId: restaurantId,
      summary: `${credits} SMS credits added to ${restaurant.name}.`,
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
    actorEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const parsed = parseOnboardingInput({
      restaurantName: args.name,
      restaurantSlug: args.slug,
      businessType: args.businessType ?? "GENERAL_SERVICE",
      businessSubtype: args.businessSubtype,
      contactPhone: args.contactPhone,
      websiteUrl: args.websiteUrl,
      googleBusinessUrl: args.googleBusinessUrl,
    });
    const referralCode = `${parsed.restaurantSlug
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 6) || "REVIEW"}${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;
    const trialEndsAt = getInitialTrialEndsAt();
    const restaurantId = await ctx.db.insert("restaurants", {
      name: parsed.restaurantName,
      slug: parsed.restaurantSlug,
      businessType: parsed.businessType,
      businessSubtype: parsed.businessSubtype,
      contactPhone: parsed.contactPhone,
      websiteUrl: parsed.websiteUrl,
      referralCode,
      tier: args.tier,
      smsLimit: getPlanByTier(args.tier).smsLimit,
      smsUsed: 0,
      smsCreditsBalance: 0,
      overageRate: 0.05,
      premiumAiEnabled: false,
      referralCreditsEarnedCents: 0,
      googleBusinessUrl: parsed.googleBusinessUrl,
      twilioNumber: args.twilioNumber,
      billingInterval: "MONTHLY",
      subscriptionStatus: "TRIALING",
      trialEndsAt,
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
      kioskDisplayName: parsed.restaurantName,
    });
    const primaryLocation = parseLocationInput({
      locationName: `${parsed.restaurantName} Main Location`,
      locationSlug: parsed.restaurantSlug,
      contactPhone: parsed.contactPhone,
      googleBusinessUrl: parsed.googleBusinessUrl,
      twilioNumber: args.twilioNumber,
      kioskDisplayName: parsed.restaurantName,
    });
    await ctx.db.insert("locations", {
      restaurantId,
      name: primaryLocation.locationName,
      slug: primaryLocation.locationSlug,
      contactPhone: primaryLocation.contactPhone,
      googleBusinessUrl: primaryLocation.googleBusinessUrl,
      twilioNumber: primaryLocation.twilioNumber,
      kioskDisplayName: primaryLocation.kioskDisplayName,
      active: true,
    });
    await ctx.db.insert("users", {
      clerkId: `pending_${Date.now()}`,
      email: args.ownerEmail,
      role: "OWNER",
      restaurantId,
    });
    await logAdminAction(ctx, {
      action: "restaurant.created",
      actorEmail: args.actorEmail,
      targetRestaurantId: restaurantId,
      summary: `${parsed.restaurantName} was created on the ${
        getPlanByTier(args.tier).name
      } plan.`,
    });
    return restaurantId;
  },
});

export const deleteRestaurant = mutation({
  args: { restaurantId: v.id("restaurants"), actorEmail: v.optional(v.string()) },
  handler: async (ctx, { restaurantId, actorEmail }) => {
    const restaurant = await ctx.db.get(restaurantId);
    if (!restaurant) throw new Error("Client not found");

    const [
      settings,
      locations,
      customers,
      smsLogs,
      feedback,
      notifications,
      receipts,
      users,
    ] = await Promise.all([
      ctx.db
        .query("restaurantSettings")
        .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurantId))
        .collect(),
      ctx.db
        .query("locations")
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
    for (const row of locations) await ctx.db.delete(row._id);
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
    await logAdminAction(ctx, {
      action: "restaurant.deleted",
      actorEmail,
      summary: `${restaurant.name} was permanently removed.`,
    });
    return { ok: true };
  },
});

export const updateGlobalSetting = mutation({
  args: {
    key: v.string(),
    value: v.string(),
    actorEmail: v.optional(v.string()),
  },
  handler: async (ctx, { key, value, actorEmail }) => {
    const existing = await ctx.db
      .query("globalSettings")
      .filter((q) => q.eq(q.field("key"), key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value });
    } else {
      await ctx.db.insert("globalSettings", { key, value });
    }
    await logAdminAction(ctx, {
      action: "platform.setting_updated",
      actorEmail,
      summary: `Global setting ${key} was updated.`,
    });
  },
});

export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    const [restaurants, allSmsLogs, customers, locations] = await Promise.all([
      ctx.db.query("restaurants").collect(),
      ctx.db.query("smsLogs").collect(),
      ctx.db.query("customers").collect(),
      ctx.db.query("locations").collect(),
    ]);
    const totalActiveClients = restaurants.filter((r) => r.active).length;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
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
      welcomeSent > 0 ? Math.round((googleSent / welcomeSent) * 100) : 0;

    const totalMRR = restaurants
      .filter((r) => r.active)
      .reduce((sum, r) => {
        const plan = getPlanByTier(r.tier);
        return (
          sum +
          ((r.billingInterval ?? "MONTHLY") === "ANNUAL"
            ? plan.annualPrice / 12
            : plan.price)
        );
      }, 0);

    const totalARR = restaurants
      .filter((r) => r.active)
      .reduce((sum, r) => {
        const plan = getPlanByTier(r.tier);
        return (
          sum +
          ((r.billingInterval ?? "MONTHLY") === "ANNUAL"
            ? plan.annualPrice
            : plan.price * 12)
        );
      }, 0);

    const trialingClients = restaurants.filter(
      (r) => r.active && (r.subscriptionStatus ?? "TRIALING") === "TRIALING"
    ).length;
    const pastDueClients = restaurants.filter((r) =>
      ["PAST_DUE", "UNPAID", "INCOMPLETE"].includes(r.subscriptionStatus ?? "")
    ).length;
    const annualClients = restaurants.filter(
      (r) => r.active && (r.billingInterval ?? "MONTHLY") === "ANNUAL"
    ).length;
    const premiumAiClients = restaurants.filter((r) => r.premiumAiEnabled).length;
    const totalCustomers = customers.length;
    const totalLocations = locations.length;

    const upsellAlerts = restaurants.filter(
      (r) => r.active && r.smsLimit > 0 && r.smsUsed / r.smsLimit >= 0.9
    );

    return {
      totalActiveClients,
      totalSmsTodayCount,
      googleConversionRate,
      totalMRR,
      totalARR,
      trialingClients,
      pastDueClients,
      annualClients,
      premiumAiClients,
      totalCustomers,
      totalLocations,
      upsellAlerts,
    };
  },
});

export const getAllRestaurants = query({
  args: {},
  handler: async (ctx) => {
    const [restaurants, users, customers, locations] = await Promise.all([
      ctx.db.query("restaurants").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("customers").collect(),
      ctx.db.query("locations").collect(),
    ]);

    return restaurants.map((r) => {
      const owner = users.find(
        (u) => u.restaurantId === r._id && u.role === "OWNER"
      );
      const customerCount = customers.filter((c) => c.restaurantId === r._id).length;
      const locationCount = locations.filter(
        (location) => location.restaurantId === r._id
      ).length;
      return {
        ...r,
        ownerEmail: owner?.email ?? "No owner",
        customerCount,
        locationCount,
      };
    });
  },
});

export const getGlobalSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("globalSettings").collect();
    return settings.reduce<Record<string, string>>((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
  },
});

export const getRecentAdminAuditLogs = query({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db
      .query("adminAuditLogs")
      .withIndex("by_createdAt")
      .order("desc")
      .take(12);

    const restaurants = await ctx.db.query("restaurants").collect();

    return logs.map((log) => ({
      ...log,
      restaurantName: log.targetRestaurantId
        ? restaurants.find((restaurant) => restaurant._id === log.targetRestaurantId)
            ?.name ?? "Removed workspace"
        : null,
    }));
  },
});

export const getRestaurantSupportSnapshot = query({
  args: {
    actorClerkId: v.string(),
    actorEmail: v.optional(v.string()),
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, { actorClerkId, actorEmail, restaurantId }) => {
    await requireSuperAdmin(ctx, actorClerkId, actorEmail);

    const restaurant = await ctx.db.get(restaurantId);
    if (!restaurant) {
      throw new Error("Workspace not found");
    }

    const [
      settings,
      locations,
      users,
      customers,
      feedback,
      smsLogs,
      notifications,
      integrations,
      receipts,
      loyaltyRewards,
      loyaltyClaims,
      voiceRecoveryCalls,
      billingPurchases,
      adminAuditLogs,
    ] = await Promise.all([
      ctx.db
        .query("restaurantSettings")
        .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurantId))
        .first(),
      ctx.db
        .query("locations")
        .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurantId))
        .collect(),
      ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
        .collect(),
      ctx.db
        .query("customers")
        .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
        .collect(),
      ctx.db
        .query("feedback")
        .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
        .collect(),
      ctx.db
        .query("smsLogs")
        .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
        .collect(),
      ctx.db
        .query("notifications")
        .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
        .collect(),
      ctx.db
        .query("integrations")
        .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
        .collect(),
      ctx.db
        .query("receipts")
        .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
        .collect(),
      ctx.db
        .query("loyaltyRewards")
        .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurantId))
        .collect(),
      ctx.db
        .query("loyaltyClaims")
        .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
        .collect(),
      ctx.db
        .query("voiceRecoveryCalls")
        .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
        .collect(),
      ctx.db
        .query("billingPurchases")
        .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurantId))
        .collect(),
      ctx.db
        .query("adminAuditLogs")
        .withIndex("by_createdAt")
        .order("desc")
        .collect(),
    ]);

    const customerById = new Map(
      customers.map((customer) => [customer._id, customer] as const)
    );
    const locationById = new Map(
      locations.map((location) => [location._id, location] as const)
    );
    const owner = users.find((user) => user.role === "OWNER") ?? null;
    const team = users.sort((a, b) => a.email.localeCompare(b.email));

    const pendingApprovals = smsLogs.filter(
      (log) => log.status === "PENDING_APPROVAL"
    ).length;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const smsSentThisMonth = smsLogs.filter(
      (log) => log.status === "SENT" && log.sentAt >= monthStart.getTime()
    ).length;
    const totalTrackedSpend = receipts.reduce(
      (sum, receipt) => sum + receipt.billAmount,
      0
    );

    const recentCustomers = customers
      .slice()
      .sort(
        (a, b) => (b.lastVisitAt ?? b.createdAt) - (a.lastVisitAt ?? a.createdAt)
      )
      .slice(0, 8)
      .map((customer) => ({
        ...customer,
        totalSpent: receipts
          .filter((receipt) => receipt.customerId === customer._id)
          .reduce((sum, receipt) => sum + receipt.billAmount, 0),
      }));

    const recentFeedback = feedback
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 8)
      .map((item) => ({
        ...item,
        customerName: item.customerId
          ? customerById.get(item.customerId)?.name ?? "Unknown customer"
          : "Unknown customer",
        customerPhone: item.customerId
          ? customerById.get(item.customerId)?.phone ?? ""
          : "",
        locationName: item.locationId
          ? locationById.get(item.locationId)?.name ?? "Unknown location"
          : "Workspace wide",
      }));

    const recentMessages = smsLogs
      .slice()
      .sort((a, b) => b.sentAt - a.sentAt)
      .slice(0, 10)
      .map((log) => ({
        ...log,
        customerName: log.customerId
          ? customerById.get(log.customerId)?.name ?? "Unknown customer"
          : "Unknown customer",
        customerPhone: log.customerId
          ? customerById.get(log.customerId)?.phone ?? ""
          : "",
        locationName: log.locationId
          ? locationById.get(log.locationId)?.name ?? "Unknown location"
          : "Workspace wide",
      }));

    const supportHealth = {
      pendingApprovals,
      smsSentThisMonth,
      openNotifications: notifications.length,
      totalCustomers: customers.length,
      totalLocations: locations.length,
      totalTrackedSpend,
      recentNegativeFeedback: feedback.filter((item) => item.rating <= 3).length,
      activeIntegrations: integrations.filter((item) => item.status === "ACTIVE")
        .length,
      activeRewards: loyaltyRewards.filter((item) => item.active).length,
      openLoyaltyClaims: loyaltyClaims.filter((item) => item.status === "CLAIMED")
        .length,
      voiceRecoveryCalls: voiceRecoveryCalls.length,
    };

    return {
      restaurant,
      settings,
      owner,
      team,
      locations: locations.sort((a, b) => a.name.localeCompare(b.name)),
      recentCustomers,
      recentFeedback,
      recentMessages,
      integrations: integrations.sort((a, b) => b.updatedAt - a.updatedAt),
      recentPurchases: billingPurchases
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 8),
      supportHealth,
      adminAuditLogs: adminAuditLogs
        .filter((log) => log.targetRestaurantId === restaurantId)
        .slice(0, 12),
    };
  },
});
