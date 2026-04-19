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