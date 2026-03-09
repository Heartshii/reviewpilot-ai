import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const findRestaurantByTwilioNumber = internalQuery({
  args: { twilioNumber: v.string() },
  handler: async (ctx, { twilioNumber }) => {
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_twilioNumber", (q) => q.eq("twilioNumber", twilioNumber))
      .first();
    return restaurant;
  },
});
