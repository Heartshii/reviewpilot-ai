import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import { internal } from "./_generated/api";

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
      const latestByCustomer = new Map<
        string,
        { rating: number; createdAt: number }
      >();
      for (const f of feedbacks) {
        if (!f.customerId) continue;
        const k = f.customerId;
        const existing = latestByCustomer.get(k);
        if (!existing || f.createdAt > existing.createdAt)
          latestByCustomer.set(k, { rating: f.rating, createdAt: f.createdAt });
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
    if (log.customerId) {
      await ctx.scheduler.runAfter(0, internal.sms.sendApprovedApology, {
        smsLogId,
        customerId: log.customerId,
        restaurantId: log.restaurantId,
        approvedByUserId,
      });
    }
    return { ok: true };
  },
});
