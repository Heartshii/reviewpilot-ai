import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type WorkspaceRole = "SUPER_ADMIN" | "OWNER" | "MANAGER" | "STAFF";

async function requireLoyaltyPermission(
  ctx: { db: QueryCtx["db"] },
  actorClerkId: string,
  restaurantId: Id<"restaurants">,
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

function makeClaimToken() {
  return `reward_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

function makeClaimCode() {
  return `RP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export const getLoyaltyRewards = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const rewards = await ctx.db
      .query("loyaltyRewards")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurantId))
      .collect();

    return rewards.sort((a, b) => {
      if (a.active !== b.active) {
        return a.active ? -1 : 1;
      }
      return a.pointsCost - b.pointsCost || a.title.localeCompare(b.title);
    });
  },
});

export const getRecentLoyaltyClaims = query({
  args: {
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, { restaurantId, locationId }) => {
    const claims = (await ctx.db
      .query("loyaltyClaims")
      .withIndex("by_restaurant_createdAt", (q) =>
        q.eq("restaurantId", restaurantId)
      )
      .order("desc")
      .take(30)).filter((claim) =>
      locationId ? claim.locationId === locationId : true
    );

    return await Promise.all(
      claims.map(async (claim) => {
        const [customer, reward] = await Promise.all([
          ctx.db.get(claim.customerId),
          ctx.db.get(claim.rewardId),
        ]);

        return {
          ...claim,
          customerName: customer?.name ?? "Customer",
          customerPhone: customer?.phone ?? "",
          rewardTitle: reward?.title ?? "Reward",
        };
      })
    );
  },
});

export const getPublicClaimByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const claim = await ctx.db
      .query("loyaltyClaims")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!claim) {
      return null;
    }

    const [reward, customer, restaurant] = await Promise.all([
      ctx.db.get(claim.rewardId),
      ctx.db.get(claim.customerId),
      ctx.db.get(claim.restaurantId),
    ]);

    if (!reward || !customer || !restaurant) {
      return null;
    }

    const isExpired =
      claim.status === "EXPIRED" ||
      (claim.status === "PENDING" && claim.expiresAt <= Date.now());

    return {
      claimId: claim._id,
      token: claim.token,
      status: isExpired ? "EXPIRED" : claim.status,
      claimCode: claim.claimCode,
      expiresAt: claim.expiresAt,
      createdAt: claim.createdAt,
      claimedAt: claim.claimedAt,
      redeemedAt: claim.redeemedAt,
      restaurantName: restaurant.name,
      customerName: customer.name,
      customerPoints: customer.points,
      reward: {
        title: reward.title,
        description: reward.description,
        pointsCost: reward.pointsCost,
        active: reward.active,
      },
    };
  },
});

export const upsertLoyaltyReward = mutation({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    rewardId: v.optional(v.id("loyaltyRewards")),
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    pointsCost: v.number(),
    smsCopy: v.optional(v.string()),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireLoyaltyPermission(ctx, args.actorClerkId, args.restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
      "MANAGER",
    ]);

    const title = args.title.trim();
    if (!title) {
      throw new Error("Reward title is required.");
    }
    const pointsCost = Math.max(1, Math.round(args.pointsCost));
    const now = Date.now();

    if (args.rewardId) {
      const reward = await ctx.db.get(args.rewardId);
      if (!reward || reward.restaurantId !== args.restaurantId) {
        throw new Error("Reward not found.");
      }

      await ctx.db.patch(args.rewardId, {
        title,
        description: args.description?.trim() || undefined,
        imageUrl: args.imageUrl?.trim() || undefined,
        pointsCost,
        smsCopy: args.smsCopy?.trim() || undefined,
        active: args.active,
        updatedAt: now,
      });

      return args.rewardId;
    }

    return await ctx.db.insert("loyaltyRewards", {
      restaurantId: args.restaurantId,
      title,
      description: args.description?.trim() || undefined,
      imageUrl: args.imageUrl?.trim() || undefined,
      pointsCost,
      smsCopy: args.smsCopy?.trim() || undefined,
      active: args.active,
      createdByClerkId: args.actorClerkId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createLoyaltyClaim = mutation({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
    rewardId: v.id("loyaltyRewards"),
    customerId: v.id("customers"),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await requireLoyaltyPermission(ctx, args.actorClerkId, args.restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
      "MANAGER",
    ]);

    const [reward, customer] = await Promise.all([
      ctx.db.get(args.rewardId),
      ctx.db.get(args.customerId),
    ]);

    if (!reward || reward.restaurantId !== args.restaurantId) {
      throw new Error("Reward not found.");
    }
    if (!reward.active) {
      throw new Error("This reward is not active.");
    }
    if (!customer || customer.restaurantId !== args.restaurantId) {
      throw new Error("Customer not found.");
    }
    if (!customer.optedInSms) {
      throw new Error("Customer has SMS opt-out enabled.");
    }

    const existingPending = await ctx.db
      .query("loyaltyClaims")
      .withIndex("by_customerId", (q) => q.eq("customerId", args.customerId))
      .collect();

    const duplicate = existingPending.find(
      (claim) =>
        claim.rewardId === args.rewardId &&
        claim.status === "PENDING" &&
        claim.expiresAt > Date.now()
    );

    if (duplicate) {
      return {
        claimId: duplicate._id,
        token: duplicate.token,
        claimCode: duplicate.claimCode,
        existed: true,
      };
    }

    const claimId = await ctx.db.insert("loyaltyClaims", {
      restaurantId: args.restaurantId,
      locationId: args.locationId ?? customer.lastLocationId,
      customerId: args.customerId,
      rewardId: args.rewardId,
      token: makeClaimToken(),
      claimCode: undefined,
      status: "PENDING",
      pointsCostSnapshot: reward.pointsCost,
      createdByClerkId: args.actorClerkId,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
    });

    const claim = await ctx.db.get(claimId);
    return {
      claimId,
      token: claim?.token ?? "",
      claimCode: claim?.claimCode,
      existed: false,
    };
  },
});

export const claimRewardByToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const claim = await ctx.db
      .query("loyaltyClaims")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!claim) {
      throw new Error("Reward link not found.");
    }

    const [reward, customer] = await Promise.all([
      ctx.db.get(claim.rewardId),
      ctx.db.get(claim.customerId),
    ]);

    if (!reward || !customer) {
      throw new Error("Reward is no longer available.");
    }

    if (claim.status === "REDEEMED") {
      return { status: "REDEEMED", claimCode: claim.claimCode };
    }

    if (claim.status === "CLAIMED") {
      return { status: "CLAIMED", claimCode: claim.claimCode };
    }

    if (claim.status === "EXPIRED") {
      return { status: "EXPIRED" as const };
    }

    if (claim.status === "CANCELED") {
      throw new Error("This reward link is no longer active.");
    }

    if (claim.expiresAt <= Date.now()) {
      await ctx.db.patch(claim._id, { status: "EXPIRED" });
      return { status: "EXPIRED" as const };
    }

    if (!reward.active) {
      throw new Error("This reward is no longer active.");
    }

    if (customer.points < claim.pointsCostSnapshot) {
      throw new Error("This customer no longer has enough points to claim it.");
    }

    const claimCode = makeClaimCode();
    await ctx.db.patch(customer._id, {
      points: customer.points - claim.pointsCostSnapshot,
    });
    await ctx.db.patch(claim._id, {
      status: "CLAIMED",
      claimCode,
      claimedAt: Date.now(),
    });

    return { status: "CLAIMED" as const, claimCode };
  },
});

export const markLoyaltyClaimRedeemed = mutation({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    claimId: v.id("loyaltyClaims"),
  },
  handler: async (ctx, { actorClerkId, restaurantId, claimId }) => {
    await requireLoyaltyPermission(ctx, actorClerkId, restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
      "MANAGER",
    ]);

    const claim = await ctx.db.get(claimId);
    if (!claim || claim.restaurantId !== restaurantId) {
      throw new Error("Claim not found.");
    }
    if (claim.status !== "CLAIMED") {
      throw new Error("Only claimed rewards can be marked redeemed.");
    }

    await ctx.db.patch(claimId, {
      status: "REDEEMED",
      redeemedAt: Date.now(),
    });

    return { ok: true };
  },
});
