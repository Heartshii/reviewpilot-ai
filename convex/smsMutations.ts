import { v } from "convex/values";
import { api } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  DUPLICATE_CHECKIN_WINDOW_MS,
  getPhoneLookupCandidates,
  parseCustomerCheckInInput,
} from "../lib/validation";
import type { CampaignSegmentKey } from "../lib/campaign-segments";
import { hasWorkspaceBillingAccess } from "../lib/billing-plans";
import { getCustomersForSegment } from "./segmentUtils";

async function findCustomerByPhoneCandidates(
  ctx: Pick<QueryCtx | MutationCtx, "db">,
  restaurantId: Id<"restaurants">,
  phone: string
) {
  for (const candidate of getPhoneLookupCandidates(phone)) {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_restaurant_phone", (q) =>
        q.eq("restaurantId", restaurantId).eq("phone", candidate)
      )
      .first();

    if (customer) {
      return customer;
    }
  }

  return null;
}

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
    return await findCustomerByPhoneCandidates(ctx, restaurantId, phone);
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
    locationId: v.optional(v.id("locations")),
    customerId: v.optional(v.id("customers")),
    atRisk: v.boolean(),
    customerMessage: v.optional(v.string()),
  },
  handler: async (ctx, { rating, restaurantId, locationId, customerId, atRisk, customerMessage }) => {
    return await ctx.db.insert("feedback", {
      rating,
      restaurantId,
      locationId,
      customerId,
      customerMessage,
      atRisk: atRisk ? true : undefined,
      createdAt: Date.now(),
    });
  },
});

export const getLatestFeedbackForCustomer = internalQuery({
  args: {
    restaurantId: v.id("restaurants"),
    customerId: v.id("customers"),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, { restaurantId, customerId, locationId }) => {
    const feedbackRows = await ctx.db
      .query("feedback")
      .filter((q) =>
        q.and(
          q.eq(q.field("restaurantId"), restaurantId),
          q.eq(q.field("customerId"), customerId)
        )
      )
      .collect();

    const filtered = feedbackRows
      .filter((row) => (locationId ? row.locationId === locationId : true))
      .sort((a, b) => b.createdAt - a.createdAt);

    return filtered[0] ?? null;
  },
});

export const updateFeedbackAnalysis = internalMutation({
  args: {
    feedbackId: v.id("feedback"),
    sentiment: v.optional(
      v.union(
        v.literal("POSITIVE"),
        v.literal("NEUTRAL"),
        v.literal("NEGATIVE")
      )
    ),
    sentimentCategory: v.optional(
      v.union(
        v.literal("SERVICE"),
        v.literal("STAFF"),
        v.literal("WAIT_TIME"),
        v.literal("PRICE"),
        v.literal("QUALITY"),
        v.literal("CLEANLINESS"),
        v.literal("COMMUNICATION"),
        v.literal("OTHER")
      )
    ),
    sentimentConfidence: v.optional(v.number()),
    sentimentSummary: v.optional(v.string()),
    customerMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { feedbackId, ...patch } = args;
    await ctx.db.patch(feedbackId, patch);
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
      v.literal("REENGAGEMENT"),
      v.literal("LOYALTY_REWARD")
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
    locationId: v.optional(v.id("locations")),
    customerId: v.optional(v.id("customers")),
    deliveryChannel: v.optional(v.union(v.literal("SMS"), v.literal("WHATSAPP"))),
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
    if (!r) return;

    const nextSmsUsed = r.smsUsed + 1;
    const exceededBaseLimit = r.smsLimit > 0 && nextSmsUsed > r.smsLimit;
    const nextCreditsBalance =
      exceededBaseLimit && (r.smsCreditsBalance ?? 0) > 0
        ? Math.max(0, (r.smsCreditsBalance ?? 0) - 1)
        : r.smsCreditsBalance ?? 0;

    await ctx.db.patch(restaurantId, {
      smsUsed: nextSmsUsed,
      smsCreditsBalance: nextCreditsBalance,
    });
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
    locationId: v.optional(v.id("locations")),
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
    locationId: v.optional(v.id("locations")),
    channel: v.optional(
      v.union(v.literal("SMS"), v.literal("WHATSAPP"), v.literal("EMAIL"))
    ),
    segment: v.union(
      v.literal("ALL"),
      v.literal("NEW"),
      v.literal("LOYAL"),
      v.literal("VIP"),
      v.literal("HIGH_SPEND"),
      v.literal("RECENT"),
      v.literal("INACTIVE_30"),
      v.literal("INACTIVE_60"),
      v.literal("NEEDS_ATTENTION"),
      v.literal("REVIEW_READY")
    ),
  },
  handler: async (ctx, { restaurantId, locationId, channel, segment }) => {
    const customers = await getCustomersForSegment({
      ctx,
      restaurantId,
      locationId,
      channel: (channel as "SMS" | "WHATSAPP" | "EMAIL" | undefined) ?? "SMS",
      segment: segment as CampaignSegmentKey,
    });
    return customers.map((customer) => customer._id);
  },
});

export const handleOptOut = internalMutation({
  args: {
    customerPhone: v.string(),
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, { customerPhone, restaurantId }) => {
    const customer = await findCustomerByPhoneCandidates(
      ctx,
      restaurantId,
      customerPhone
    );
    if (customer) {
      await ctx.db.patch(customer._id, {
        optedInSms: false,
        phone: getPhoneLookupCandidates(customerPhone)[0] ?? customer.phone,
      });
    }
  },
});

export const createCustomer = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
    birthdayMonth: v.optional(v.number()),
    birthdayDay: v.optional(v.number()),
    optedInSms: v.boolean(),
    optedInEmail: v.optional(v.boolean()),
    billAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) {
      throw new Error("Business not found");
    }
    if (
      !hasWorkspaceBillingAccess({
        subscriptionStatus: restaurant.subscriptionStatus ?? "NONE",
        trialEndsAt: restaurant.trialEndsAt,
        stripeSubscriptionId: restaurant.stripeSubscriptionId,
      })
    ) {
      throw new Error(
        "This workspace trial has ended. Activate billing to keep collecting new customer check-ins."
      );
    }

    const parsed = parseCustomerCheckInInput({
      ...args,
      restaurantId: args.restaurantId,
    });
    const billAmount = Math.max(0, parsed.billAmount ?? 0);
    const pointsEarned = Math.round(billAmount * 10);
    const now = Date.now();
    const existingGuard = await ctx.db
      .query("requestGuards")
      .withIndex("by_scope_key", (q) =>
        q
          .eq("scope", "KIOSK_CHECKIN")
          .eq("key", `${args.restaurantId}:${parsed.phone}`)
      )
      .first();

    if (existingGuard && existingGuard.expiresAt > now) {
      throw new Error("Please wait a moment before checking in this customer again.");
    }

    if (existingGuard) {
      await ctx.db.patch(existingGuard._id, {
        attempts: existingGuard.attempts + 1,
        expiresAt: now + DUPLICATE_CHECKIN_WINDOW_MS,
        lastSeenAt: now,
      });
    } else {
      await ctx.db.insert("requestGuards", {
        scope: "KIOSK_CHECKIN",
        key: `${args.restaurantId}:${parsed.phone}`,
        attempts: 1,
        createdAt: now,
        lastSeenAt: now,
        expiresAt: now + DUPLICATE_CHECKIN_WINDOW_MS,
      });
    }

    const existing = await findCustomerByPhoneCandidates(
      ctx,
      args.restaurantId,
      parsed.phone
    );

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: parsed.name,
        phone: parsed.phone,
        email: parsed.email ?? existing.email,
        visitCount: existing.visitCount + 1,
        lastVisitAt: now,
        points: existing.points + pointsEarned,
        optedInEmail:
          parsed.email && parsed.optedInEmail !== undefined
            ? parsed.optedInEmail
            : existing.optedInEmail,
        lastLocationId: args.locationId ?? existing.lastLocationId,
      });

      if (billAmount > 0) {
        await ctx.db.insert("receipts", {
          billAmount,
          pointsEarned,
          status: "APPROVED",
          customerId: existing._id,
          restaurantId: args.restaurantId,
          locationId: args.locationId,
          submittedAt: now,
        });
      }

      const updated = await ctx.db.get(existing._id);
      return { existing: true, customer: updated };
    }

    const customerId = await ctx.db.insert("customers", {
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email,
      restaurantId: args.restaurantId,
      lastLocationId: args.locationId,
      birthdayMonth: parsed.birthdayMonth,
      birthdayDay: parsed.birthdayDay,
      points: pointsEarned,
      visitCount: 1,
      optedInSms: parsed.optedInSms,
      optedInEmail: parsed.email ? parsed.optedInEmail ?? false : false,
      createdAt: now,
      lastVisitAt: now,
    });

    if (billAmount > 0) {
      await ctx.db.insert("receipts", {
        billAmount,
        pointsEarned,
        status: "APPROVED",
        customerId,
        restaurantId: args.restaurantId,
        locationId: args.locationId,
        submittedAt: now,
      });
    }

    await ctx.scheduler.runAfter(
      60 * 60 * 1000,
      api.sms.sendWelcomeSms,
      { customerId }
    );

    const customer = await ctx.db.get(customerId);
    return { existing: false, customer };
  },
});

export const addReceiptForCustomer = mutation({
  args: {
    customerId: v.id("customers"),
    billAmount: v.number(),
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, { customerId, billAmount, restaurantId, locationId }) => {
    const billAmountClean = Math.max(0, billAmount);
    const pointsEarned = Math.round(billAmountClean * 10);

    const customer = await ctx.db.get(customerId);
    if (!customer) throw new Error("Customer not found");
    if (customer.restaurantId !== restaurantId) {
      throw new Error("Customer does not belong to this workspace");
    }

    await ctx.db.patch(customerId, {
      points: customer.points + pointsEarned,
      lastLocationId: locationId ?? customer.lastLocationId,
    });

    await ctx.db.insert("receipts", {
      billAmount: billAmountClean,
      pointsEarned,
      status: "APPROVED",
      customerId,
      restaurantId,
      locationId,
      submittedAt: Date.now(),
    });

    return { pointsEarned };
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

export const getMostRecentSmsForCustomer = internalQuery({
  args: {
    customerId: v.id("customers"),
    smsType: v.union(
      v.literal("WELCOME"),
      v.literal("GOOGLE_REVIEW"),
      v.literal("APOLOGY"),
      v.literal("DEAL"),
      v.literal("BIRTHDAY"),
      v.literal("REENGAGEMENT"),
      v.literal("LOYALTY_REWARD")
    ),
  },
  handler: async (ctx, { customerId, smsType }) => {
    const logs = await ctx.db
      .query("smsLogs")
      .filter((q) =>
        q.and(
          q.eq(q.field("customerId"), customerId),
          q.eq(q.field("smsType"), smsType)
        )
      )
      .collect();

    return logs.sort((a, b) => b.sentAt - a.sentAt)[0] ?? null;
  },
});
