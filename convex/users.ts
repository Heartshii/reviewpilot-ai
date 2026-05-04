import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getPlanByTier } from "../lib/billing-plans";

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

export const completeOwnerOnboarding = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    restaurantName: v.string(),
    restaurantSlug: v.string(),
    businessType: v.union(
      v.literal("RESTAURANT"),
      v.literal("DENTAL_CLINIC"),
      v.literal("GROCERY_STORE"),
      v.literal("SALON_SPA"),
      v.literal("FITNESS_STUDIO"),
      v.literal("HOME_SERVICE"),
      v.literal("AUTOMOTIVE_SERVICE"),
      v.literal("RETAIL_STORE"),
      v.literal("PROFESSIONAL_SERVICE"),
      v.literal("GENERAL_SERVICE")
    ),
    businessSubtype: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    googleBusinessUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User record not found");
    }

    if (user.restaurantId) {
      return { restaurantId: user.restaurantId, slug: args.restaurantSlug };
    }

    const baseSlug = args.restaurantSlug.trim().toLowerCase();
    let nextSlug = baseSlug;
    let counter = 2;

    while (
      await ctx.db
        .query("restaurants")
        .withIndex("by_slug", (q) => q.eq("slug", nextSlug))
        .first()
    ) {
      nextSlug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    const restaurantId = await ctx.db.insert("restaurants", {
      name: args.restaurantName.trim(),
      slug: nextSlug,
      businessType: args.businessType,
      businessSubtype: args.businessSubtype,
      contactPhone: args.contactPhone,
      websiteUrl: args.websiteUrl,
      tier: 1,
      smsLimit: getPlanByTier(1).smsLimit,
      smsUsed: 0,
      overageRate: 0.05,
      googleBusinessUrl: args.googleBusinessUrl,
      active: true,
    });

    await ctx.db.insert("restaurantSettings", {
      restaurantId,
      sendDelayMinutes: 60,
      birthdayEnabled: true,
      reengagement30: true,
      reengagement60: true,
      reengagement90: true,
      aiTone: "Friendly",
      responseLength: "Medium",
      autoApprove: false,
      includeReviewLink: true,
      kioskDisplayName: args.restaurantName.trim(),
    });

    await ctx.db.patch(user._id, {
      email: args.email,
      role: "OWNER",
      restaurantId,
    });

    return { restaurantId, slug: nextSlug };
  },
});

export const promoteCurrentUserToSuperAdmin = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, { clerkId, email }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        role: "SUPER_ADMIN",
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId,
      email,
      role: "SUPER_ADMIN",
    });
  },
});
