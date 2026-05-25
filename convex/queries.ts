import { v } from "convex/values";
import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";

type WorkspaceRole = "SUPER_ADMIN" | "OWNER" | "MANAGER" | "STAFF";

async function requireWorkspacePermission(
  ctx: QueryCtx,
  actorClerkId: string,
  restaurantId: string,
  allowedRoles: WorkspaceRole[]
) {
  const actor = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", actorClerkId))
    .first();

  if (!actor) {
    throw new Error("User record not found");
  }
  if (!allowedRoles.includes(actor.role)) {
    throw new Error("You do not have permission for this action");
  }
  if (actor.role !== "SUPER_ADMIN" && actor.restaurantId !== restaurantId) {
    throw new Error("Workspace access denied");
  }

  return actor;
}

export const getRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const r = await ctx.db.get(restaurantId);
    if (!r) throw new Error("Restaurant not found");
    return r;
  },
});

export const getRestaurantBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const location = await ctx.db
      .query("locations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (location) {
      const restaurant = await ctx.db.get(location.restaurantId);
      if (!restaurant) return null;
      const settings = await ctx.db
        .query("restaurantSettings")
        .withIndex("by_restaurantId", (q) =>
          q.eq("restaurantId", restaurant._id)
        )
        .first();
      return {
        ...restaurant,
        slug: location.slug,
        locationId: location._id,
        locationName: location.name,
        googleBusinessUrl:
          location.googleBusinessUrl ?? restaurant.googleBusinessUrl,
        twilioNumber: location.twilioNumber ?? restaurant.twilioNumber,
        restaurantSettings: {
          sendDelayMinutes: 60,
          birthdayEnabled: true,
          reengagement30: true,
          reengagement60: true,
          reengagement90: true,
          aiTone: "Friendly",
          responseLength: "Medium",
          autoApprove: false,
          includeReviewLink: true,
          whiteLabelEnabled: false,
          whiteLabelHideReviewPilot: false,
          leaderboardOptIn: false,
          leaderboardBadgeLabel: "",
          preferredMessagingChannel: "SMS",
          ...settings,
          kioskDisplayName:
            location.kioskDisplayName ??
            settings?.kioskDisplayName ??
            restaurant.name,
          kioskAccentColor:
            location.kioskAccentColor ?? settings?.kioskAccentColor,
          kioskLogoUrl: location.kioskLogoUrl ?? settings?.kioskLogoUrl,
          kioskBgImageUrl:
            location.kioskBgImageUrl ?? settings?.kioskBgImageUrl,
        },
      };
    }

    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!restaurant) return null;
    const settings = await ctx.db
      .query("restaurantSettings")
      .withIndex("by_restaurantId", (q) =>
        q.eq("restaurantId", restaurant._id)
      )
      .first();
    return {
      ...restaurant,
      restaurantSettings: {
        sendDelayMinutes: 60,
        birthdayEnabled: true,
        reengagement30: true,
        reengagement60: true,
        reengagement90: true,
        aiTone: "Friendly",
        responseLength: "Medium",
        autoApprove: false,
        includeReviewLink: true,
        whiteLabelEnabled: false,
        whiteLabelHideReviewPilot: false,
        leaderboardOptIn: false,
        leaderboardBadgeLabel: "",
        preferredMessagingChannel: "SMS",
        ...settings,
      },
    };
  },
});

export const getLocationsForRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const locations = await ctx.db
      .query("locations")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurantId))
      .collect();

    return locations.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const findCustomerByLastFour = query({
  args: {
    lastFour: v.string(),
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, { lastFour, restaurantId }) => {
    const customers = await ctx.db
      .query("customers")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect();
    const match = customers.find((c) => c.phone.endsWith(lastFour));
    if (!match) return null;
    return {
      name: match.name,
      points: match.points,
      _id: match._id,
      phone: match.phone,
    };
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
        aiTone: "Friendly",
        responseLength: "Medium",
        autoApprove: false,
        includeReviewLink: true,
        whiteLabelEnabled: false,
        whiteLabelHideReviewPilot: false,
        leaderboardOptIn: false,
        leaderboardBadgeLabel: "",
        preferredMessagingChannel: "SMS",
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
  args: {
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, { restaurantId, locationId }) => {
    const restaurant = await ctx.db.get(restaurantId);
    if (!restaurant) throw new Error("Restaurant not found");

    const monthStart = startOfMonth();
    const weekStart = sevenDaysAgo();

    const customers = (await ctx.db
      .query("customers")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect()).filter((customer) =>
      locationId ? customer.lastLocationId === locationId : true
    );

    const allSmsLogs = (await ctx.db
      .query("smsLogs")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect()).filter((log) => (locationId ? log.locationId === locationId : true));

    const smsSentThisMonth = allSmsLogs.filter(
      (s) => s.sentAt >= monthStart && s.status === "SENT"
    ).length;

    const googleLinksClicked = allSmsLogs.filter(
      (s) => s.smsType === "GOOGLE_REVIEW" && s.status === "SENT"
    ).length;

    const pendingApprovals = allSmsLogs.filter(
      (s) => s.status === "PENDING_APPROVAL"
    ).length;

    const feedbacks = (await ctx.db
      .query("feedback")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect()).filter((feedback) =>
      locationId ? feedback.locationId === locationId : true
    );

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
  args: {
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, { restaurantId, locationId }) => {
    const logs = (await ctx.db
      .query("smsLogs")
      .withIndex("by_restaurant_sentAt", (q) =>
        q.eq("restaurantId", restaurantId)
      )
      .order("desc")
      .take(40)).filter((log) => (locationId ? log.locationId === locationId : true)).slice(0, 20);

    const result = await Promise.all(
      logs.map(async (log) => {
        let customerName = "—";
        let visitCount = 0;
        if (log.customerId) {
          const c = await ctx.db.get(log.customerId);
          customerName = c?.name ?? "—";
          visitCount = c?.visitCount ?? 0;
        }
        return {
          ...log,
          customerName,
          visitCount,
        };
      })
    );
    return result;
  },
});

export const getPendingApprovals = query({
  args: {
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, { restaurantId, locationId }) => {
    const logs = (await ctx.db
      .query("smsLogs")
      .filter((q) =>
        q.and(
          q.eq(q.field("restaurantId"), restaurantId),
          q.eq(q.field("status"), "PENDING_APPROVAL")
        )
      )
      .collect()).filter((log) => (locationId ? log.locationId === locationId : true));

    const feedbacks = (await ctx.db
      .query("feedback")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect()).filter((feedback) =>
      locationId ? feedback.locationId === locationId : true
    );

    const feedbackByCustomer = new Map<
      string,
      {
        rating: number;
        createdAt: number;
        sentiment?: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
        sentimentCategory?: string;
        sentimentSummary?: string;
        customerMessage?: string;
      }
    >();
    for (const f of feedbacks) {
      if (f.customerId) {
        const existing = feedbackByCustomer.get(f.customerId);
        if (!existing || f.createdAt > existing.createdAt)
          feedbackByCustomer.set(f.customerId, {
            rating: f.rating,
            createdAt: f.createdAt,
            sentiment: f.sentiment,
            sentimentCategory: f.sentimentCategory,
            sentimentSummary: f.sentimentSummary,
            customerMessage: f.customerMessage,
          });
      }
    }

    const result = await Promise.all(
      logs.map(async (log) => {
        let customerName = "—";
        let phone = "";
        let rating = 0;
        let latestFeedback:
          | {
              rating: number;
              createdAt: number;
              sentiment?: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
              sentimentCategory?: string;
              sentimentSummary?: string;
              customerMessage?: string;
            }
          | undefined;
        if (log.customerId) {
          const c = await ctx.db.get(log.customerId);
          customerName = c?.name ?? "—";
          phone = c?.phone ?? "";
          latestFeedback = feedbackByCustomer.get(log.customerId);
          if (latestFeedback) rating = latestFeedback.rating;
        }
        return {
          ...log,
          customerName,
          phone,
          rating,
          sentiment: latestFeedback?.sentiment,
          sentimentCategory: latestFeedback?.sentimentCategory,
          sentimentSummary: latestFeedback?.sentimentSummary,
          customerMessage: latestFeedback?.customerMessage,
        };
      })
    );
    return result;
  },
});

export const getCustomers = query({
  args: {
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, { restaurantId, locationId }) => {
    const customers = (await ctx.db
      .query("customers")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect()).filter((customer) =>
      locationId ? customer.lastLocationId === locationId : true
    );

    const feedbacks = (await ctx.db
      .query("feedback")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect()).filter((feedback) =>
      locationId ? feedback.locationId === locationId : true
    );
    const receipts = (await ctx.db
      .query("receipts")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect()).filter((receipt) =>
      locationId ? receipt.locationId === locationId : true
    );

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
    const receiptsByCustomer = new Map<string, { totalSpent: number; lastBillAmount?: number }>();
    for (const receipt of receipts) {
      const key = receipt.customerId;
      const current = receiptsByCustomer.get(key) ?? { totalSpent: 0 };
      receiptsByCustomer.set(key, {
        totalSpent: current.totalSpent + receipt.billAmount,
        lastBillAmount: receipt.billAmount,
      });
    }

    return customers
      .map((c) => {
        const latest = latestFeedbackByCustomer.get(c._id);
        const receiptSummary = receiptsByCustomer.get(c._id) ?? { totalSpent: 0 };
        const latestRating = latest?.rating;
        const isLoyal = c.visitCount >= 5;
        const lastVisit = c.lastVisitAt ?? c.createdAt;
        const isInactive = lastVisit < sixtyDays;
        const isUnhappy = latestRating !== undefined && latestRating <= 3;
        return {
          ...c,
          latestRating,
          totalSpent: receiptSummary.totalSpent,
          lastBillAmount: receiptSummary.lastBillAmount,
          isLoyal,
          isInactive,
          isUnhappy,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getCustomerReceiptHistory = query({
  args: {
    customerId: v.id("customers"),
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, { customerId, restaurantId, locationId }) => {
    const customer = await ctx.db.get(customerId);
    if (!customer || customer.restaurantId !== restaurantId) {
      return [];
    }

    const receipts = await ctx.db
      .query("receipts")
      .filter((q) =>
        q.and(
          q.eq(q.field("restaurantId"), restaurantId),
          q.eq(q.field("customerId"), customerId)
        )
      )
      .collect();

    return receipts
      .filter((receipt) => (locationId ? receipt.locationId === locationId : true))
      .sort((a, b) => b.submittedAt - a.submittedAt);
  },
});

export const getCustomerSmsHistory = query({
  args: {
    customerId: v.id("customers"),
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, { customerId, restaurantId, locationId }) => {
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

    return logs
      .filter((log) => (locationId ? log.locationId === locationId : true))
      .sort((a, b) => b.sentAt - a.sentAt);
  },
});

export const getCustomerPrivacyExport = query({
  args: {
    actorClerkId: v.string(),
    customerId: v.id("customers"),
    restaurantId: v.id("restaurants"),
  },
  handler: async (ctx, { actorClerkId, customerId, restaurantId }) => {
    await requireWorkspacePermission(ctx, actorClerkId, restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
    ]);

    const customer = await ctx.db.get(customerId);
    if (!customer || customer.restaurantId !== restaurantId) {
      throw new Error("Invalid customer");
    }

    const [restaurant, feedback, receipts, smsLogs, claims, voiceCalls, notifications] =
      await Promise.all([
        ctx.db.get(restaurantId),
        ctx.db
          .query("feedback")
          .filter((q) =>
            q.and(
              q.eq(q.field("restaurantId"), restaurantId),
              q.eq(q.field("customerId"), customerId)
            )
          )
          .collect(),
        ctx.db
          .query("receipts")
          .filter((q) =>
            q.and(
              q.eq(q.field("restaurantId"), restaurantId),
              q.eq(q.field("customerId"), customerId)
            )
          )
          .collect(),
        ctx.db
          .query("smsLogs")
          .filter((q) =>
            q.and(
              q.eq(q.field("restaurantId"), restaurantId),
              q.eq(q.field("customerId"), customerId)
            )
          )
          .collect(),
        ctx.db
          .query("loyaltyClaims")
          .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
          .collect(),
        ctx.db
          .query("voiceRecoveryCalls")
          .filter((q) =>
            q.and(
              q.eq(q.field("restaurantId"), restaurantId),
              q.eq(q.field("customerId"), customerId)
            )
          )
          .collect(),
        ctx.db
          .query("notifications")
          .filter((q) =>
            q.and(
              q.eq(q.field("restaurantId"), restaurantId),
              q.eq(q.field("customerId"), customerId)
            )
          )
          .collect(),
      ]);

    return {
      exportedAt: Date.now(),
      restaurant: restaurant
        ? {
            id: restaurant._id,
            name: restaurant.name,
            slug: restaurant.slug,
          }
        : null,
      customer,
      feedback: feedback.sort((a, b) => b.createdAt - a.createdAt),
      receipts: receipts.sort((a, b) => b.submittedAt - a.submittedAt),
      smsLogs: smsLogs.sort((a, b) => b.sentAt - a.sentAt),
      loyaltyClaims: claims.sort((a, b) => b.createdAt - a.createdAt),
      voiceRecoveryCalls: voiceCalls.sort((a, b) => b.createdAt - a.createdAt),
      notifications: notifications.sort((a, b) => b.createdAt - a.createdAt),
    };
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
  args: {
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, { restaurantId, locationId }) => {
    const logs = (await ctx.db
      .query("smsLogs")
      .withIndex("by_restaurant_sentAt", (q) =>
        q.eq("restaurantId", restaurantId)
      )
      .order("desc")
      .collect()).filter((log) => (locationId ? log.locationId === locationId : true));

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

export const getAiInsightsSnapshot = query({
  args: {
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, { restaurantId, locationId }) => {
    const computeCstat = (rows: Array<{ rating: number }>) => {
      if (rows.length === 0) return 0;
      return Math.round(
        (rows.filter((row) => row.rating >= 4).length / rows.length) * 100
      );
    };

    const computeNps = (rows: Array<{ rating: number }>) => {
      if (rows.length === 0) return 0;
      const promoters = rows.filter((row) => row.rating === 5).length;
      const detractors = rows.filter((row) => row.rating <= 3).length;
      return Math.round(((promoters - detractors) / rows.length) * 100);
    };

    const restaurant = await ctx.db.get(restaurantId);
    if (!restaurant) throw new Error("Restaurant not found");

    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const currentWeekStart = now - weekMs;
    const previousWeekStart = now - weekMs * 2;
    const monthStart = startOfMonth();
    const sixtyDays = sixtyDaysAgo();

    const [allCustomers, allFeedbacks, allReceipts, allSmsLogs] = await Promise.all([
      ctx.db
        .query("customers")
        .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
        .collect(),
      ctx.db
        .query("feedback")
        .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
        .collect(),
      ctx.db
        .query("receipts")
        .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
        .collect(),
      ctx.db
        .query("smsLogs")
        .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
        .collect(),
    ]);

    const customers = allCustomers.filter((customer) =>
      locationId ? customer.lastLocationId === locationId : true
    );
    const feedbacks = allFeedbacks.filter((feedback) =>
      locationId ? feedback.locationId === locationId : true
    );
    const receipts = allReceipts.filter((receipt) =>
      locationId ? receipt.locationId === locationId : true
    );
    const smsLogs = allSmsLogs.filter((log) =>
      locationId ? log.locationId === locationId : true
    );

    const currentWeekFeedback = feedbacks.filter(
      (feedback) => feedback.createdAt >= currentWeekStart
    );
    const previousWeekFeedback = feedbacks.filter(
      (feedback) =>
        feedback.createdAt >= previousWeekStart &&
        feedback.createdAt < currentWeekStart
    );
    const currentWeekNewCustomers = customers.filter(
      (customer) => customer.createdAt >= currentWeekStart
    ).length;
    const previousWeekNewCustomers = customers.filter(
      (customer) =>
        customer.createdAt >= previousWeekStart &&
        customer.createdAt < currentWeekStart
    ).length;

    const averageCurrentWeekRating =
      currentWeekFeedback.length > 0
        ? currentWeekFeedback.reduce((sum, feedback) => sum + feedback.rating, 0) /
          currentWeekFeedback.length
        : 0;
    const averagePreviousWeekRating =
      previousWeekFeedback.length > 0
        ? previousWeekFeedback.reduce((sum, feedback) => sum + feedback.rating, 0) /
          previousWeekFeedback.length
        : 0;
    const currentWeekCsat = computeCstat(currentWeekFeedback);
    const previousWeekCsat = computeCstat(previousWeekFeedback);
    const currentWeekNps = computeNps(currentWeekFeedback);
    const previousWeekNps = computeNps(previousWeekFeedback);

    const latestFeedbackByCustomer = new Map<
      string,
      { rating: number; createdAt: number }
    >();
    for (const feedback of feedbacks) {
      if (!feedback.customerId) continue;
      const existing = latestFeedbackByCustomer.get(feedback.customerId);
      if (!existing || feedback.createdAt > existing.createdAt) {
        latestFeedbackByCustomer.set(feedback.customerId, {
          rating: feedback.rating,
          createdAt: feedback.createdAt,
        });
      }
    }

    const inactiveCount = customers.filter((customer) => {
      const lastVisit = customer.lastVisitAt ?? customer.createdAt;
      return lastVisit < sixtyDays;
    }).length;
    const loyalCount = customers.filter((customer) => customer.visitCount >= 5).length;
    const atRiskCount = customers.filter((customer) => {
      const latest = latestFeedbackByCustomer.get(customer._id);
      return latest ? latest.rating <= 3 : false;
    }).length;
    const vipCount = customers.filter((customer) => customer.points >= 200).length;

    const trackedSpend = receipts.reduce(
      (sum, receipt) => sum + receipt.billAmount,
      0
    );
    const trackedCustomers = new Set(receipts.map((receipt) => receipt.customerId)).size;
    const averageSpendPerTrackedCustomer =
      trackedCustomers > 0 ? trackedSpend / trackedCustomers : 0;
    const averageVisits =
      customers.length > 0
        ? customers.reduce((sum, customer) => sum + customer.visitCount, 0) /
          customers.length
        : 0;

    const smsSentThisMonth = smsLogs.filter(
      (log) => log.sentAt >= monthStart && log.status === "SENT"
    ).length;
    const failedSmsThisMonth = smsLogs.filter(
      (log) => log.sentAt >= monthStart && log.status === "FAILED"
    ).length;
    const pendingApprovals = smsLogs.filter(
      (log) => log.status === "PENDING_APPROVAL"
    ).length;
    const reviewRequestsThisMonth = smsLogs.filter(
      (log) => log.sentAt >= monthStart && log.smsType === "GOOGLE_REVIEW" && log.status === "SENT"
    ).length;
    const reengagementSentThisMonth = smsLogs.filter(
      (log) =>
        log.sentAt >= monthStart &&
        log.smsType === "REENGAGEMENT" &&
        log.status === "SENT"
    ).length;
    const birthdaySentThisMonth = smsLogs.filter(
      (log) =>
        log.sentAt >= monthStart &&
        log.smsType === "BIRTHDAY" &&
        log.status === "SENT"
    ).length;

    const ratingDelta =
      averageCurrentWeekRating > 0 && averagePreviousWeekRating > 0
        ? averageCurrentWeekRating - averagePreviousWeekRating
        : averageCurrentWeekRating > 0
          ? averageCurrentWeekRating
          : 0;

    const customerGrowthDelta = currentWeekNewCustomers - previousWeekNewCustomers;
    const reviewConversionRate =
      smsSentThisMonth > 0
        ? Math.round((reviewRequestsThisMonth / smsSentThisMonth) * 100)
        : 0;
    const smsUsagePercent =
      restaurant.smsLimit > 0
        ? Math.round((restaurant.smsUsed / restaurant.smsLimit) * 100)
        : 0;

    const weeklyTrend = Array.from({ length: 6 }, (_, index) => {
      const weeksAgo = 5 - index;
      const start = now - weekMs * (weeksAgo + 1);
      const end = now - weekMs * weeksAgo;
      const bucketFeedback = feedbacks.filter(
        (feedback) => feedback.createdAt >= start && feedback.createdAt < end
      );
      const bucketCustomers = customers.filter(
        (customer) => customer.createdAt >= start && customer.createdAt < end
      );
      const bucketSms = smsLogs.filter(
        (log) => log.sentAt >= start && log.sentAt < end && log.status === "SENT"
      );

      const avgRating =
        bucketFeedback.length > 0
          ? bucketFeedback.reduce((sum, feedback) => sum + feedback.rating, 0) /
            bucketFeedback.length
          : 0;
      const bucketCsat = computeCstat(bucketFeedback);
      const bucketNps = computeNps(bucketFeedback);

      return {
        label: weeksAgo === 0 ? "This week" : `${weeksAgo}w ago`,
        rating: Number(avgRating.toFixed(1)),
        csat: bucketCsat,
        nps: bucketNps,
        feedback: bucketFeedback.length,
        newCustomers: bucketCustomers.length,
        sms: bucketSms.length,
      };
    });

    const lastThirtyDaysStart = now - 30 * 24 * 60 * 60 * 1000;
    const lastThirtyDayFeedback = feedbacks.filter(
      (feedback) => feedback.createdAt >= lastThirtyDaysStart
    );
    const promoters30d = lastThirtyDayFeedback.filter(
      (feedback) => feedback.rating === 5
    ).length;
    const passives30d = lastThirtyDayFeedback.filter(
      (feedback) => feedback.rating === 4
    ).length;
    const detractors30d = lastThirtyDayFeedback.filter(
      (feedback) => feedback.rating <= 3
    ).length;

    let recommendedSegment: "INACTIVE" | "LOYAL" | "ATRISK" | "NEW" | "ALL" = "ALL";
    let recommendationTitle = "Keep the core funnel running";
    let recommendationBody =
      "Your main growth lever is still consistent check-ins, fast approvals, and steady review routing.";

    if (inactiveCount > 0) {
      recommendedSegment = "INACTIVE";
      recommendationTitle = "Bring back inactive customers";
      recommendationBody = `${inactiveCount} customers have gone quiet. A simple comeback offer or reminder message is your clearest win right now.`;
    } else if (atRiskCount > 0) {
      recommendedSegment = "ATRISK";
      recommendationTitle = "Recover unhappy customers first";
      recommendationBody = `${atRiskCount} customers are currently at risk. Fast follow-up here protects both retention and public reputation.`;
    } else if (loyalCount > 0) {
      recommendedSegment = "LOYAL";
      recommendationTitle = "Promote reviews from loyal customers";
      recommendationBody = `${loyalCount} loyal customers already trust the business. They are the best group for review and referral asks.`;
    } else if (currentWeekNewCustomers > 0) {
      recommendedSegment = "NEW";
      recommendationTitle = "Nurture new customers early";
      recommendationBody = `${currentWeekNewCustomers} new customers arrived this week. Early follow-up is the fastest way to turn first visits into repeat business.`;
    }

    return {
      totalCustomers: customers.length,
      inactiveCount,
      loyalCount,
      atRiskCount,
      vipCount,
      trackedSpend,
      trackedCustomers,
      averageSpendPerTrackedCustomer,
      averageVisits,
      smsSentThisMonth,
      failedSmsThisMonth,
      pendingApprovals,
      reviewRequestsThisMonth,
      reengagementSentThisMonth,
      birthdaySentThisMonth,
      averageCurrentWeekRating: Number(averageCurrentWeekRating.toFixed(1)),
      averagePreviousWeekRating: Number(averagePreviousWeekRating.toFixed(1)),
      currentWeekCsat,
      previousWeekCsat,
      currentWeekNps,
      previousWeekNps,
      csatDelta: currentWeekCsat - previousWeekCsat,
      npsDelta: currentWeekNps - previousWeekNps,
      promoters30d,
      passives30d,
      detractors30d,
      ratingDelta: Number(ratingDelta.toFixed(1)),
      currentWeekNewCustomers,
      previousWeekNewCustomers,
      customerGrowthDelta,
      negativeFeedbackThisWeek: currentWeekFeedback.filter(
        (feedback) => feedback.rating <= 3
      ).length,
      reviewConversionRate,
      smsUsagePercent,
      recommendedSegment,
      recommendationTitle,
      recommendationBody,
      weeklyTrend,
    };
  },
});
