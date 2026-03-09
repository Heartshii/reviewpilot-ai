import { v } from "convex/values";
import { query } from "./_generated/server";

export const getRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const r = await ctx.db.get(restaurantId);
    if (!r) throw new Error("Restaurant not found");
    return r;
  },
});

export const getStaff = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect();
  },
});

export const getRestaurantSettings = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const s = await ctx.db
      .query("restaurantSettings")
      .withIndex("by_restaurantId", (q) =>
        q.eq("restaurantId", restaurantId)
      )
      .first();
    return (
      s ?? {
        sendDelayMinutes: 60,
        birthdayEnabled: true,
        reengagement30: true,
        reengagement60: true,
        reengagement90: true,
      }
    );
  },
});

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function sevenDaysAgo() {
  return Date.now() - 7 * 24 * 60 * 60 * 1000;
}

function sixtyDaysAgo() {
  return Date.now() - 60 * 24 * 60 * 60 * 1000;
}

export const getDashboardStats = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const restaurant = await ctx.db.get(restaurantId);
    if (!restaurant) throw new Error("Restaurant not found");

    const monthStart = startOfMonth();
    const weekStart = sevenDaysAgo();

    const customers = await ctx.db
      .query("customers")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect();

    const allSmsLogs = await ctx.db
      .query("smsLogs")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect();

    const smsSentThisMonth = allSmsLogs.filter(
      (s) => s.sentAt >= monthStart && s.status === "SENT"
    ).length;

    const googleLinksClicked = allSmsLogs.filter(
      (s) => s.smsType === "GOOGLE_REVIEW" && s.status === "SENT"
    ).length;

    const pendingApprovals = allSmsLogs.filter(
      (s) => s.status === "PENDING_APPROVAL"
    ).length;

    const feedbacks = await ctx.db
      .query("feedback")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect();

    const feedbackThisWeek = feedbacks.filter(
      (f) => f.createdAt >= weekStart
    );
    const avgRatingThisWeek =
      feedbackThisWeek.length > 0
        ? feedbackThisWeek.reduce((a, f) => a + f.rating, 0) /
          feedbackThisWeek.length
        : 0;

    const newCustomersThisWeek = customers.filter(
      (c) => c.createdAt >= weekStart
    ).length;

    return {
      totalCustomers: customers.length,
      customersChangeThisWeek: newCustomersThisWeek,
      smsSentThisMonth,
      avgRatingThisWeek,
      googleLinksClicked,
      pendingApprovals,
      smsUsed: restaurant.smsUsed,
      smsLimit: restaurant.smsLimit,
    };
  },
});

export const getRecentActivity = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const logs = await ctx.db
      .query("smsLogs")
      .withIndex("by_restaurant_sentAt", (q) =>
        q.eq("restaurantId", restaurantId)
      )
      .order("desc")
      .take(20);

    const result = await Promise.all(
      logs.map(async (log) => {
        let customerName = "—";
        if (log.customerId) {
          const c = await ctx.db.get(log.customerId);
          customerName = c?.name ?? "—";
        }
        return {
          ...log,
          customerName,
        };
      })
    );
    return result;
  },
});

export const getPendingApprovals = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const logs = await ctx.db
      .query("smsLogs")
      .filter((q) =>
        q.and(
          q.eq(q.field("restaurantId"), restaurantId),
          q.eq(q.field("status"), "PENDING_APPROVAL")
        )
      )
      .collect();

    const feedbacks = await ctx.db
      .query("feedback")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect();

    const feedbackByCustomer = new Map<
      string,
      { rating: number; createdAt: number }
    >();
    for (const f of feedbacks) {
      if (f.customerId) {
        const existing = feedbackByCustomer.get(f.customerId);
        if (!existing || f.createdAt > existing.createdAt)
          feedbackByCustomer.set(f.customerId, { rating: f.rating, createdAt: f.createdAt });
      }
    }

    const result = await Promise.all(
      logs.map(async (log) => {
        let customerName = "—";
        let phone = "";
        let rating = 0;
        if (log.customerId) {
          const c = await ctx.db.get(log.customerId);
          customerName = c?.name ?? "—";
          phone = c?.phone ?? "";
        const r = feedbackByCustomer.get(log.customerId);
        if (r) rating = r.rating;
        }
        return {
          ...log,
          customerName,
          phone,
          rating,
        };
      })
    );
    return result;
  },
});

export const getCustomers = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const customers = await ctx.db
      .query("customers")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect();

    const feedbacks = await ctx.db
      .query("feedback")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect();

    const latestFeedbackByCustomer = new Map<
      string,
      { rating: number; createdAt: number }
    >();
    for (const f of feedbacks) {
      if (f.customerId) {
        const existing = latestFeedbackByCustomer.get(f.customerId);
        if (!existing || f.createdAt > existing.createdAt) {
          latestFeedbackByCustomer.set(f.customerId, {
            rating: f.rating,
            createdAt: f.createdAt,
          });
        }
      }
    }

    const sixtyDays = sixtyDaysAgo();

    return customers
      .map((c) => {
        const latest = latestFeedbackByCustomer.get(c._id);
        const latestRating = latest?.rating;
        const isLoyal = c.visitCount >= 5;
        const isInactive = c.createdAt < sixtyDays;
        const isUnhappy = latestRating !== undefined && latestRating <= 3;
        return {
          ...c,
          latestRating,
          isLoyal,
          isInactive,
          isUnhappy,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getCustomerSmsHistory = query({
  args: {
    customerId: v.id("customers"),
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, { customerId, restaurantId }) => {
    const customer = await ctx.db.get(customerId);
    if (!customer || customer.restaurantId !== restaurantId) {
      return [];
    }

    const logs = await ctx.db
      .query("smsLogs")
      .filter((q) =>
        q.and(
          q.eq(q.field("restaurantId"), restaurantId),
          q.eq(q.field("customerId"), customerId)
        )
      )
      .collect();

    return logs.sort((a, b) => b.sentAt - a.sentAt);
  },
});

export const getSegmentCounts = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const customers = await ctx.db
      .query("customers")
      .filter((q) =>
        q.and(
          q.eq(q.field("restaurantId"), restaurantId),
          q.eq(q.field("optedInSms"), true)
        )
      )
      .collect();

    const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;

    const all = customers.length;
    const loyal = customers.filter((c) => c.visitCount >= 5).length;
    const new_ = customers.filter((c) => c.visitCount === 1).length;
    const vip = customers.filter((c) => c.points >= 200).length;
    const inactive = customers.filter((c) => {
      const last = c.lastVisitAt ?? c.createdAt;
      return last < sixtyDaysAgo;
    }).length;

    return { all, loyal, new: new_, inactive, vip };
  },
});

export const getSmsHistory = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const logs = await ctx.db
      .query("smsLogs")
      .withIndex("by_restaurant_sentAt", (q) =>
        q.eq("restaurantId", restaurantId)
      )
      .order("desc")
      .collect();

    const result = await Promise.all(
      logs.map(async (log) => {
        let customerName = "—";
        if (log.customerId) {
          const c = await ctx.db.get(log.customerId);
          customerName = c?.name ?? "—";
        }
        return {
          ...log,
          customerName,
        };
      })
    );
    return result;
  },
});
