import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const findRestaurantByTwilioNumber = internalQuery({
  args: { twilioNumber: v.string() },
  handler: async (ctx, { twilioNumber }) => {
    const location = await ctx.db
      .query("locations")
      .withIndex("by_twilioNumber", (q) => q.eq("twilioNumber", twilioNumber))
      .first();

    if (location) {
      const restaurant = await ctx.db.get(location.restaurantId);
      if (!restaurant) {
        return null;
      }
      return {
        restaurant,
        location,
      };
    }

    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_twilioNumber", (q) => q.eq("twilioNumber", twilioNumber))
      .first();
    if (!restaurant) {
      return null;
    }
    return {
      restaurant,
      location: null,
    };
  },
});

export const getLocation = internalQuery({
  args: { locationId: v.id("locations") },
  handler: async (ctx, { locationId }) => {
    return await ctx.db.get(locationId);
  },
});
