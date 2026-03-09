import { v } from "convex/values";
import { mutation,query } from "./_generated/server";

export const getCurrentUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
  },
});

export const ensureUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("SUPER_ADMIN"),
      v.literal("OWNER"),
      v.literal("STAFF")
    ),
    restaurantId: v.optional(v.id("restaurants")),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      // Update email if changed
      await ctx.db.patch(existing._id, { email: args.email });
      return existing._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      role: args.role,
      restaurantId: args.restaurantId,
    });

    return userId;
  },
});
