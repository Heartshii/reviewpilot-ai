import { cronJobs } from "convex/server";
import { internalAction, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

const crons = cronJobs();

// Only birthday SMS runs automatically
crons.daily(
  "birthday-sms",
  { hourUTC: 14, minuteUTC: 0 }, // 10 AM EST (adjust to your preference)
  internal.crons.runBirthdaySms
);

crons.daily(
  "reengagement-sms",
  { hourUTC: 15, minuteUTC: 0 },
  internal.crons.runReengagementSms
);

crons.interval(
  "scheduled-campaigns",
  { minutes: 15 },
  internal.crons.runScheduledCampaigns
);

crons.weekly(
  "competitor-watch",
  { dayOfWeek: "monday", hourUTC: 13, minuteUTC: 0 },
  internal.crons.runCompetitorWatch
);

export default crons;

export const runBirthdaySms = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const month = now.getUTCMonth() + 1;
    const day = now.getUTCDate();
    const customerIds = await ctx.runQuery(
      internal.crons.getBirthdayCustomers,
      { month, day }
    );
    for (const customerId of customerIds) {
      await ctx.runAction(api.sms.sendBirthdaySms, { customerId });
    }
  },
});

export const getBirthdayCustomers = internalQuery({
  args: { month: v.number(), day: v.number() },
  handler: async (ctx, { month, day }) => {
    const all = await ctx.db.query("customers").collect();
    return all
      .filter(
        (c) =>
          c.birthdayMonth === month &&
          c.birthdayDay === day &&
          c.optedInSms
      )
      .map((c) => c._id);
  },
});

export const runReengagementSms = internalAction({
  args: {},
  handler: async (ctx) => {
    for (const days of [30, 60, 90] as const) {
      const customerIds = await ctx.runQuery(
        internal.crons.getReengagementCustomers,
        { days }
      );

      for (const customerId of customerIds) {
        await ctx.runAction(api.sms.sendReengagementSms, { customerId, days });
      }
    }
  },
});

export const getReengagementCustomers = internalQuery({
  args: { days: v.union(v.literal(30), v.literal(60), v.literal(90)) },
  handler: async (ctx, { days }) => {
    const now = Date.now();
    const windowEnd = now - days * 24 * 60 * 60 * 1000;
    const windowStart = windowEnd - 24 * 60 * 60 * 1000;
    const customers = await ctx.db.query("customers").collect();

    return customers
      .filter((customer) => {
        if (!customer.optedInSms) return false;
        const lastVisitAt = customer.lastVisitAt ?? customer.createdAt;
        return lastVisitAt >= windowStart && lastVisitAt < windowEnd;
      })
      .map((customer) => customer._id);
  },
});

export const runScheduledCampaigns = internalAction({
  args: {},
  handler: async (ctx) => {
    const dueCampaignIds = await ctx.runQuery(internal.campaigns.getDueCampaignIds, {});

    for (const campaignId of dueCampaignIds) {
      await ctx.runAction(internal.sms.executeScheduledCampaign, { campaignId });
    }
  },
});

export const runCompetitorWatch = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    ok: boolean;
    reason?: string;
    synced?: number;
  }> => {
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return { ok: false, reason: "missing-api-key" };
    }

    const competitorIds = await ctx.runQuery(
      internal.competitorInternal.getCompetitorIdsForSync,
      {}
    );
    for (const competitorId of competitorIds) {
      await ctx.runAction(internal.competitorInternal.syncCompetitorSnapshot, {
        competitorId,
      });
    }

    return { ok: true, synced: competitorIds.length };
  },
});
