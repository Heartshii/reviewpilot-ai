import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

function getVoiceRecoveryThreshold() {
  const raw = process.env.VOICE_AI_HIGH_VALUE_SPEND;
  const parsed = raw ? Number(raw) : 150;
  return Number.isFinite(parsed) ? parsed : 150;
}

export const getVoiceRecoveryContext = internalQuery({
  args: {
    feedbackId: v.id("feedback"),
  },
  handler: async (ctx, { feedbackId }) => {
    const feedback = await ctx.db.get(feedbackId);
    if (!feedback || !feedback.customerId) {
      return null;
    }

    const [customer, restaurant, location, receipts, calls] = await Promise.all([
      ctx.db.get(feedback.customerId),
      ctx.db.get(feedback.restaurantId),
      feedback.locationId ? ctx.db.get(feedback.locationId) : Promise.resolve(null),
      ctx.db
        .query("receipts")
        .filter((q) =>
          q.and(
            q.eq(q.field("restaurantId"), feedback.restaurantId),
            q.eq(q.field("customerId"), feedback.customerId)
          )
        )
        .collect(),
      ctx.db
        .query("voiceRecoveryCalls")
        .withIndex("by_feedbackId", (q) => q.eq("feedbackId", feedbackId))
        .collect(),
    ]);

    if (!customer || !restaurant) {
      return null;
    }

    const totalSpent = receipts.reduce((sum, receipt) => sum + receipt.billAmount, 0);
    const latestCall = calls.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;

    return {
      feedback,
      customer,
      restaurant,
      location,
      totalSpent,
      latestCall,
    };
  },
});

export const createVoiceRecoveryCall = internalMutation({
  args: {
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
    customerId: v.id("customers"),
    feedbackId: v.id("feedback"),
    triggeredByClerkId: v.string(),
    script: v.string(),
    aiSummary: v.optional(v.string()),
    totalSpent: v.number(),
    visitCount: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("voiceRecoveryCalls", {
      ...args,
      status: "QUEUED",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateVoiceRecoveryCall = mutation({
  args: {
    callId: v.id("voiceRecoveryCalls"),
    callSid: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("QUEUED"),
        v.literal("INITIATED"),
        v.literal("RINGING"),
        v.literal("IN_PROGRESS"),
        v.literal("ANSWERED"),
        v.literal("COMPLETED"),
        v.literal("NO_ANSWER"),
        v.literal("BUSY"),
        v.literal("FAILED"),
        v.literal("CANCELED")
      )
    ),
    callDurationSeconds: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, { callId, ...patch }) => {
    await ctx.db.patch(callId, {
      ...patch,
      updatedAt: Date.now(),
    });
  },
});

export const getVoiceRecoveryTwiMLContext = query({
  args: {
    callId: v.id("voiceRecoveryCalls"),
  },
  handler: async (ctx, { callId }) => {
    const call = await ctx.db.get(callId);
    if (!call) {
      return null;
    }

    const [customer, restaurant] = await Promise.all([
      ctx.db.get(call.customerId),
      ctx.db.get(call.restaurantId),
    ]);

    return {
      call,
      customer,
      restaurant,
    };
  },
});

export const getVoiceRecoveryCandidates = query({
  args: {
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, { restaurantId, locationId }) => {
    const threshold = getVoiceRecoveryThreshold();
    const feedbackRows = (await ctx.db
      .query("feedback")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect())
      .filter((row) => (locationId ? row.locationId === locationId : true))
      .filter((row) => row.customerId && row.rating <= 3)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 12);

    const rows = await Promise.all(
      feedbackRows.map(async (feedback) => {
        const customer = feedback.customerId ? await ctx.db.get(feedback.customerId) : null;
        if (!customer) {
          return null;
        }

        const [receipts, calls] = await Promise.all([
          ctx.db
            .query("receipts")
            .filter((q) =>
              q.and(
                q.eq(q.field("restaurantId"), restaurantId),
                q.eq(q.field("customerId"), customer._id)
              )
            )
            .collect(),
          ctx.db
            .query("voiceRecoveryCalls")
            .withIndex("by_feedbackId", (q) => q.eq("feedbackId", feedback._id))
            .collect(),
        ]);

        const totalSpent = receipts.reduce((sum, receipt) => sum + receipt.billAmount, 0);
        const latestCall = calls.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
        const eligible = totalSpent >= threshold || customer.visitCount >= 4;

        return {
          feedbackId: feedback._id,
          customerId: customer._id,
          customerName: customer.name,
          customerPhone: customer.phone,
          rating: feedback.rating,
          createdAt: feedback.createdAt,
          sentimentCategory: feedback.sentimentCategory,
          sentimentSummary: feedback.sentimentSummary,
          customerMessage: feedback.customerMessage,
          visitCount: customer.visitCount,
          totalSpent,
          eligible,
          latestCallStatus: latestCall?.status,
          latestCallAt: latestCall?.createdAt,
        };
      })
    );

    return rows.filter(Boolean);
  },
});

export const getVoiceRecoveryCalls = query({
  args: {
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, { restaurantId, locationId }) => {
    const calls = (await ctx.db
      .query("voiceRecoveryCalls")
      .withIndex("by_restaurant_createdAt", (q) => q.eq("restaurantId", restaurantId))
      .order("desc")
      .take(12))
      .filter((row) => (locationId ? row.locationId === locationId : true));

    return await Promise.all(
      calls.map(async (call) => {
        const [customer, feedback] = await Promise.all([
          ctx.db.get(call.customerId),
          ctx.db.get(call.feedbackId),
        ]);
        return {
          ...call,
          customerName: customer?.name ?? "Customer",
          customerPhone: customer?.phone ?? "",
          rating: feedback?.rating ?? 0,
        };
      })
    );
  },
});
