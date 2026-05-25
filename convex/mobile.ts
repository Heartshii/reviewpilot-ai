import { v } from "convex/values";
import { query } from "./_generated/server";

export const getOwnerMobileSnapshot = query({
  args: {
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, { restaurantId, locationId }) => {
    const restaurant = await ctx.db.get(restaurantId);
    if (!restaurant) {
      throw new Error("Workspace not found");
    }

    const [pendingApprovals, feedbackRows, claims, customers, recentSms] =
      await Promise.all([
        ctx.db
          .query("smsLogs")
          .filter((q) =>
            q.and(
              q.eq(q.field("restaurantId"), restaurantId),
              q.eq(q.field("status"), "PENDING_APPROVAL")
            )
          )
          .collect(),
        ctx.db
          .query("feedback")
          .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
          .collect(),
        ctx.db
          .query("loyaltyClaims")
          .withIndex("by_restaurant_createdAt", (q) =>
            q.eq("restaurantId", restaurantId)
          )
          .order("desc")
          .take(12),
        ctx.db
          .query("customers")
          .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
          .collect(),
        ctx.db
          .query("smsLogs")
          .withIndex("by_restaurant_sentAt", (q) =>
            q.eq("restaurantId", restaurantId)
          )
          .order("desc")
          .take(8),
      ]);

    const scopedPending = pendingApprovals
      .filter((row) => (locationId ? row.locationId === locationId : true))
      .sort((a, b) => b.sentAt - a.sentAt)
      .slice(0, 6);

    const pendingCards = await Promise.all(
      scopedPending.map(async (row) => {
        const customer = row.customerId ? await ctx.db.get(row.customerId) : null;
        return {
          ...row,
          customerName: customer?.name ?? "Customer",
          customerPhone: customer?.phone ?? "",
        };
      })
    );

    const negativeFeedback = (
      await Promise.all(
        feedbackRows
          .filter((row) => (locationId ? row.locationId === locationId : true))
          .filter((row) => row.rating <= 3)
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 6)
          .map(async (row) => {
            const customer = row.customerId ? await ctx.db.get(row.customerId) : null;
            return {
              ...row,
              customerName: customer?.name ?? "Customer",
            };
          })
      )
    ).filter(Boolean);

    const claimAlerts = (
      await Promise.all(
        claims
          .filter((claim) => (locationId ? claim.locationId === locationId : true))
          .filter((claim) => claim.status === "CLAIMED" || claim.status === "PENDING")
          .map(async (claim) => {
            const [customer, reward] = await Promise.all([
              ctx.db.get(claim.customerId),
              ctx.db.get(claim.rewardId),
            ]);
            return {
              ...claim,
              customerName: customer?.name ?? "Customer",
              rewardTitle: reward?.title ?? "Reward",
            };
          })
      )
    ).slice(0, 6);

    const newCustomersThisWeek = customers.filter(
      (customer) =>
        (locationId ? customer.lastLocationId === locationId : true) &&
        customer.createdAt >= Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length;

    const atRiskCount = feedbackRows.filter(
      (row) =>
        (locationId ? row.locationId === locationId : true) &&
        row.rating <= 3 &&
        row.createdAt >= Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length;

    const recentActivity = await Promise.all(
      recentSms
        .filter((row) => (locationId ? row.locationId === locationId : true))
        .map(async (row) => {
          const customer = row.customerId ? await ctx.db.get(row.customerId) : null;
          return {
            ...row,
            customerName: customer?.name ?? "Customer",
          };
        })
    );

    return {
      restaurantName: restaurant.name,
      smsUsed: restaurant.smsUsed,
      smsLimit: restaurant.smsLimit,
      pendingApprovals: pendingCards,
      negativeFeedback,
      claimAlerts,
      recentActivity,
      stats: {
        newCustomersThisWeek,
        atRiskCount,
        pendingApprovalCount: scopedPending.length,
        claimedRewardCount: claimAlerts.filter((claim) => claim.status === "CLAIMED")
          .length,
      },
    };
  },
});
