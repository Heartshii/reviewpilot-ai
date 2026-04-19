import { v } from "convex/values";
import { api } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";

export const getCustomer = internalQuery({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    const c = await ctx.db.get(customerId);
    if (!c) throw new Error("Customer not found");
    return c;
  },
});

export const getRestaurant = internalQuery({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const r = await ctx.db.get(restaurantId);
    if (!r) throw new Error("Restaurant not found");
    return r;
  },
});

export const getCustomerByPhone = internalQuery({
  args: {
    restaurantId: v.id("restaurants"),
    phone: v.string(),
  },
  handler: async (ctx, { restaurantId, phone }) => {
    return await ctx.db
      .query("customers")
      .withIndex("by_restaurant_phone", (q) =>
        q.eq("restaurantId", restaurantId).eq("phone", phone)
      )
      .first();
  },
});

export const getSmsLog = internalQuery({
  args: { smsLogId: v.id("smsLogs") },
  handler: async (ctx, { smsLogId }) => ctx.db.get(smsLogId),
});

export const saveFeedback = internalMutation({
  args: {
    rating: v.number(),
    restaurantId: v.id("restaurants"),
    customerId: v.optional(v.id("customers")),
    atRisk: v.boolean(),
  },
  handler: async (ctx, { rating, restaurantId, customerId, atRisk }) => {
    return await ctx.db.insert("feedback", {
      rating,
      restaurantId,
      customerId,
      atRisk: atRisk ? true : undefined,
      createdAt: Date.now(),
    });
  },
});

export const saveSmsLog = internalMutation({
  args: {
    smsType: v.union(
      v.literal("WELCOME"),
      v.literal("GOOGLE_REVIEW"),
      v.literal("APOLOGY"),
      v.literal("DEAL"),
      v.literal("BIRTHDAY"),
      v.literal("REENGAGEMENT")
    ),
    content: v.string(),
    status: v.union(
      v.literal("PENDING_APPROVAL"),
      v.literal("SENT"),
      v.literal("FAILED")
    ),
    cost: v.number(),
    isOverage: v.boolean(),
    restaurantId: v.id("restaurants"),
    customerId: v.optional(v.id("customers")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("smsLogs", {
      ...args,
      sentAt: Date.now(),
    });
  },
});

export const incrementSmsUsed = internalMutation({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const r = await ctx.db.get(restaurantId);
    if (r) await ctx.db.patch(restaurantId, { smsUsed: r.smsUsed + 1 });
  },
});

export const addPoints = internalMutation({
  args: { customerId: v.id("customers"), points: v.number() },
  handler: async (ctx, { customerId, points }) => {
    const c = await ctx.db.get(customerId);
    if (c) await ctx.db.patch(customerId, { points: c.points + points });
  },
});

export const getOwnerForRestaurant = internalQuery({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    return await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.eq(q.field("restaurantId"), restaurantId),
          q.eq(q.field("role"), "OWNER")
        )
      )
      .first();
  },
});

export const saveNotification = internalMutation({
  args: {
    restaurantId: v.id("restaurants"),
    smsLogId: v.id("smsLogs"),
    customerId: v.optional(v.id("customers")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      type: "PENDING_APOLOGY_APPROVAL",
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getSegmentCustomers = internalQuery({
  args: {
    restaurantId: v.id("restaurants"),
    segment: v.union(
      v.literal("ALL"),
      v.literal("LOYAL"),
      v.literal("NEW"),
      v.literal("ATRISK"),
      v.literal("INACTIVE"),
      v.literal("VIP")
    ),
  },
  handler: async (ctx, { restaurantId, segment }) => {
    const all = await ctx.db
      .query("customers")
      .filter((q) =>
        q.and(
          q.eq(q.field("restaurantId"), restaurantId),
          q.eq(q.field("optedInSms"), true)
        )
      )
      .collect();
    const now = Date.now();
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;

    if (segment === "ALL") return all.map((c) => c._id);
    if (segment === "LOYAL")
      return all.filter((c) => c.visitCount >= 5).map((c) => c._id);
    if (segment === "NEW")
      return all.filter((c) => c.visitCount === 1).map((c) => c._id);
    if (segment === "VIP")
      return all.filter((c) => c.points >= 200).map((c) => c._id);
    if (segment === "INACTIVE") {
      return all
        .filter((c) => {
          const lastVisit = c.lastVisitAt ?? c.createdAt;
          return lastVisit < sixtyDaysAgo;
        })
        .map((c) => c._id);
    }
    if (segment === "ATRISK") {
      const feedbacks = await ctx.db
        .query("feedback")
        .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
        .collect();
        const latestByCustomer = new Map();
      for (const f of feedbacks) {
        if (!f.customerId) continue;
        const k = f.customerId;
        const existing = latestByCustomer.get(k);
        if (!existing || f.createdAt > existing.createdAt)
          latestByCustomer.set(k, {
            rating: f.rating,
            createdAt: f.createdAt,
          });
      }
      return all
        .filter((c) => {
          const last = latestByCustomer.get(c._id);
          return last && last.rating <= 3;
        })
        .map((c) => c._id);
    }
    return [];
  },
});

export const handleOptOut = internalMutation({
  args: {
    customerPhone: v.string(),
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, { customerPhone, restaurantId }) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_restaurant_phone", (q) =>
        q.eq("restaurantId", restaurantId).eq("phone", customerPhone)
      )
      .first();
    if (customer) {
      await ctx.db.patch(customer._id, { optedInSms: false });
    }
  },
});

export const createCustomer = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    restaurantId: v.id("restaurants"),
    birthdayMonth: v.optional(v.number()),
    birthdayDay: v.optional(v.number()),
    optedInSms: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_restaurant_phone", (q) =>
        q.eq("restaurantId", args.restaurantId).eq("phone", args.phone)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        visitCount: existing.visitCount + 1,
        lastVisitAt: Date.now(),
      });
      const updated = await ctx.db.get(existing._id);
      return { existing: true, customer: updated };
    }

    const customerId = await ctx.db.insert("customers", {
      name: args.name,
      phone: args.phone,
      restaurantId: args.restaurantId,
      birthdayMonth: args.birthdayMonth,
      birthdayDay: args.birthdayDay,
      points: 0,
      visitCount: 1,
      optedInSms: args.optedInSms,
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(
      60 * 60 * 1000,
      api.sms.sendWelcomeSms,
      { customerId }
    );

    const customer = await ctx.db.get(customerId);
    return { existing: false, customer };
  },
});

export const approveSms = mutation({
  args: {
    smsLogId: v.id("smsLogs"),
    approvedByUserId: v.string(),
  },
  handler: async (ctx, { smsLogId, approvedByUserId }) => {
    const log = await ctx.db.get(smsLogId);
    if (!log || log.status !== "PENDING_APPROVAL")
      throw new Error("Invalid or already processed SMS log");
    await ctx.db.patch(smsLogId, {
      status: "SENT",
      approvedBy: approvedByUserId,
    });
    return { ok: true };
  },
});

export const updateSmsLogStatus = internalMutation({
  args: {
    smsLogId: v.id("smsLogs"),
    status: v.union(
      v.literal("PENDING_APPROVAL"),
      v.literal("SENT"),
      v.literal("FAILED")
    ),
    approvedBy: v.optional(v.string()),
  },
  handler: async (ctx, { smsLogId, status, approvedBy }) => {
    await ctx.db.patch(smsLogId, { status, approvedBy });
  },
});

export const findCustomerByLastFour = internalQuery({
  args: {
    lastFour: v.string(),
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, { lastFour, restaurantId }) => {
    const customers = await ctx.db
      .query("customers")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect();
    return customers.find((c) => c.phone.slice(-4) === lastFour) ?? null;
  },
});
export const getRestaurantSettings = internalQuery({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    return await ctx.db
      .query("restaurantSettings")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurantId))
      .first();
  },
});