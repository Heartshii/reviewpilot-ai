import { cronJobs } from "convex/server";
import { internalAction, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

const crons = cronJobs();

crons.daily(
  "birthday-sms",
  { hourUTC: 14, minuteUTC: 0 },
  internal.crons.runBirthdaySms
);

crons.daily(
  "reengagement-30-days",
  { hourUTC: 15, minuteUTC: 0 },
  internal.crons.runReengagementSms,
  { daysSinceVisit: 30 }
);

crons.daily(
  "reengagement-60-days",
  { hourUTC: 15, minuteUTC: 5 },
  internal.crons.runReengagementSms,
  { daysSinceVisit: 60 }
);

crons.daily(
  "reengagement-90-days",
  { hourUTC: 15, minuteUTC: 10 },
  internal.crons.runReengagementSms,
  { daysSinceVisit: 90 }
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

export const runReengagementSms = internalAction({
  args: {
    daysSinceVisit: v.union(
      v.literal(30),
      v.literal(60),
      v.literal(90)
    ),
  },
  handler: async (ctx, { daysSinceVisit }) => {
    const customerIds = await ctx.runQuery(
      internal.crons.getReengagementCustomers,
      { daysSinceVisit }
    );
    for (const customerId of customerIds) {
      await ctx.runAction(api.sms.sendReengagementSms, {
        customerId,
        daysSinceVisit,
      });
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

export const getReengagementCustomers = internalQuery({
  args: {
    daysSinceVisit: v.union(
      v.literal(30),
      v.literal(60),
      v.literal(90)
    ),
  },
  handler: async (ctx, { daysSinceVisit }) => {
    const threshold = Date.now() - daysSinceVisit * 24 * 60 * 60 * 1000;
    const all = await ctx.db.query("customers").collect();
    return all
      .filter((c) => {
        const lastVisit = c.lastVisitAt ?? c.createdAt;
        return c.optedInSms && lastVisit <= threshold;
      })
      .map((c) => c._id);
  },
});
