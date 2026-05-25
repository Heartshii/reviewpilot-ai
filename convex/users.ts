import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getInitialTrialEndsAt, getPlanByTier } from "../lib/billing-plans";
import { parseLocationInput, parseOnboardingInput } from "../lib/validation";

const workspaceRoleValidator = v.union(
  v.literal("SUPER_ADMIN"),
  v.literal("OWNER"),
  v.literal("MANAGER"),
  v.literal("STAFF")
);

const inviteRoleValidator = v.union(v.literal("MANAGER"), v.literal("STAFF"));

type WorkspaceRole = "SUPER_ADMIN" | "OWNER" | "MANAGER" | "STAFF";

type WorkspaceUserRecord = {
  _id: string;
  clerkId: string;
  email: string;
  role: WorkspaceRole;
  restaurantId?: string;
};

async function getUserByClerkId(ctx: { db: unknown }, clerkId: string) {
  const usersQuery = (
    ctx.db as {
      query: (table: "users") => {
        withIndex: (
          name: "by_clerkId",
          cb: (q: { eq: (field: "clerkId", value: string) => unknown }) => unknown
        ) => {
          first: () => Promise<WorkspaceUserRecord | null>;
        };
      };
    }
  ).query("users");

  return await usersQuery
    .withIndex("by_clerkId", (q: { eq: (field: "clerkId", value: string) => unknown }) =>
      q.eq("clerkId", clerkId)
    )
    .first();
}

async function requireWorkspaceRole(
  ctx: { db: unknown },
  clerkId: string,
  allowedRoles: WorkspaceRole[]
) {
  const actor = await getUserByClerkId(ctx, clerkId);
  if (!actor) {
    throw new Error("User record not found");
  }
  if (!allowedRoles.includes(actor.role)) {
    throw new Error("You do not have permission for this action");
  }
  return actor;
}

function makeInviteToken() {
  return `invite_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function makeUniqueReferralCode(ctx: { db: unknown }, nameOrSlug: string) {
  const base = nameOrSlug
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6) || "REVIEW";

  while (true) {
    const candidate = `${base}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const existing = await (
      ctx.db as {
        query: (table: "restaurants") => {
          filter: (
            cb: (q: {
              eq: (field: unknown, value: string) => unknown;
              field: (name: "referralCode") => unknown;
            }) => unknown
          ) => { first: () => Promise<unknown> };
        };
      }
    )
      .query("restaurants")
      .filter((q) => q.eq(q.field("referralCode"), candidate))
      .first();

    if (!existing) {
      return candidate;
    }
  }
}

async function slugExists(ctx: { db: unknown }, slug: string) {
  type SlugLookupQuery = {
    withIndex: (
      name: "by_slug",
      cb: (q: { eq: (field: "slug", value: string) => unknown }) => unknown
    ) => {
      first: () => Promise<unknown>;
    };
  };

  const restaurantsQuery = (
    ctx.db as { query: (table: "restaurants") => SlugLookupQuery }
  ).query("restaurants");
  const restaurantMatch = await restaurantsQuery
    .withIndex("by_slug", (q: { eq: (field: "slug", value: string) => unknown }) =>
      q.eq("slug", slug)
    )
    .first();

  if (restaurantMatch) {
    return true;
  }

  const locationsQuery = (
    ctx.db as { query: (table: "locations") => SlugLookupQuery }
  ).query("locations");
  const locationMatch = await locationsQuery
    .withIndex("by_slug", (q: { eq: (field: "slug", value: string) => unknown }) =>
      q.eq("slug", slug)
    )
    .first();

  return !!locationMatch;
}

export const getCurrentUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
  },
});

export const getWorkspaceUsers = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect();

    return users.sort((a, b) => {
      const rank = {
        SUPER_ADMIN: 0,
        OWNER: 1,
        MANAGER: 2,
        STAFF: 3,
      };
      return rank[a.role] - rank[b.role] || a.email.localeCompare(b.email);
    });
  },
});

export const getStaffInvites = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, { restaurantId }) => {
    const invites = await ctx.db
      .query("staffInvites")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurantId))
      .collect();

    return invites.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getStaffInviteByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const invite = await ctx.db
      .query("staffInvites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!invite) {
      return null;
    }

    const restaurant = await ctx.db.get(invite.restaurantId);

    return {
      ...invite,
      restaurantName: restaurant?.name ?? "ReviewPilot workspace",
      restaurantSlug: restaurant?.slug ?? null,
    };
  },
});

export const ensureUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    role: workspaceRoleValidator,
    restaurantId: v.optional(v.id("restaurants")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { email: args.email });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      role: args.role,
      restaurantId: args.restaurantId,
    });
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
    referralCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const parsed = parseOnboardingInput(args);
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

    const baseSlug = parsed.restaurantSlug;
    let nextSlug = baseSlug;
    let counter = 2;

    while (await slugExists(ctx, nextSlug)) {
      nextSlug = `${baseSlug}-${counter}`;
      counter += 1;
    }
    const referralCode = await makeUniqueReferralCode(ctx, nextSlug);
    const trialEndsAt = getInitialTrialEndsAt();

    const restaurantId = await ctx.db.insert("restaurants", {
      name: parsed.restaurantName,
      slug: nextSlug,
      businessType: parsed.businessType,
      businessSubtype: parsed.businessSubtype,
      contactPhone: parsed.contactPhone,
      websiteUrl: parsed.websiteUrl,
      referralCode,
      tier: 1,
      smsLimit: getPlanByTier(1).smsLimit,
      smsUsed: 0,
      smsCreditsBalance: 0,
      overageRate: 0.05,
      premiumAiEnabled: false,
      referralCreditsEarnedCents: 0,
      googleBusinessUrl: parsed.googleBusinessUrl,
      billingInterval: "MONTHLY",
      subscriptionStatus: "TRIALING",
      trialEndsAt,
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
      kioskDisplayName: parsed.restaurantName,
    });

    const primaryLocation = parseLocationInput({
      locationName: `${parsed.restaurantName} Main Location`,
      locationSlug: nextSlug,
      contactPhone: parsed.contactPhone,
      googleBusinessUrl: parsed.googleBusinessUrl,
      kioskDisplayName: parsed.restaurantName,
    });

    await ctx.db.insert("locations", {
      restaurantId,
      name: primaryLocation.locationName,
      slug: primaryLocation.locationSlug,
      contactPhone: primaryLocation.contactPhone,
      googleBusinessUrl: primaryLocation.googleBusinessUrl,
      kioskDisplayName: primaryLocation.kioskDisplayName,
      active: true,
    });

    await ctx.db.patch(user._id, {
      email: args.email,
      role: "OWNER",
      restaurantId,
    });

    const normalizedReferralCode = args.referralCode?.trim().toUpperCase();
    if (normalizedReferralCode) {
      const referrer = await ctx.db
        .query("restaurants")
        .filter((q) => q.eq(q.field("referralCode"), normalizedReferralCode))
        .first();

      if (referrer && referrer._id !== restaurantId) {
        await ctx.db.insert("referrals", {
          referrerRestaurantId: referrer._id,
          referredRestaurantId: restaurantId,
          referralCode: normalizedReferralCode,
          referredEmail: args.email.trim().toLowerCase(),
          status: "ONBOARDED",
          rewardAmountCents: Number(process.env.STRIPE_REFERRAL_CREDIT_CENTS || "2000"),
          onboardedAt: Date.now(),
          createdAt: Date.now(),
        });
      }
    }

    return { restaurantId, slug: nextSlug };
  },
});

export const createStaffInvite = mutation({
  args: {
    actorClerkId: v.string(),
    actorEmail: v.string(),
    restaurantId: v.id("restaurants"),
    email: v.string(),
    role: inviteRoleValidator,
  },
  handler: async (ctx, { actorClerkId, actorEmail, restaurantId, email, role }) => {
    const actor = await requireWorkspaceRole(ctx, actorClerkId, [
      "OWNER",
      "SUPER_ADMIN",
    ]);

    if (actor.restaurantId !== restaurantId && actor.role !== "SUPER_ADMIN") {
      throw new Error("Invite does not belong to your workspace");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.eq(q.field("restaurantId"), restaurantId),
          q.eq(q.field("email"), normalizedEmail)
        )
      )
      .first();

    if (existingUser) {
      throw new Error("That email is already part of this workspace");
    }

    const existingInvite = await ctx.db
      .query("staffInvites")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .collect();

    const activeInvite = existingInvite.find(
      (invite) =>
        invite.restaurantId === restaurantId && invite.status === "PENDING"
    );

    if (activeInvite) {
      return activeInvite;
    }

    const token = makeInviteToken();
    const inviteId = await ctx.db.insert("staffInvites", {
      restaurantId,
      email: normalizedEmail,
      role,
      token,
      status: "PENDING",
      invitedByClerkId: actorClerkId,
      invitedByEmail: actorEmail,
      createdAt: Date.now(),
    });

    return await ctx.db.get(inviteId);
  },
});

export const revokeStaffInvite = mutation({
  args: {
    actorClerkId: v.string(),
    inviteId: v.id("staffInvites"),
  },
  handler: async (ctx, { actorClerkId, inviteId }) => {
    const actor = await requireWorkspaceRole(ctx, actorClerkId, [
      "OWNER",
      "SUPER_ADMIN",
    ]);
    const invite = await ctx.db.get(inviteId);

    if (!invite) {
      throw new Error("Invite not found");
    }
    if (actor.restaurantId !== invite.restaurantId && actor.role !== "SUPER_ADMIN") {
      throw new Error("Invite does not belong to your workspace");
    }

    await ctx.db.patch(inviteId, { status: "REVOKED" });
    return { ok: true };
  },
});

export const acceptStaffInvite = mutation({
  args: {
    token: v.string(),
    clerkId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, { token, clerkId, email }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const invite = await ctx.db
      .query("staffInvites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!invite || invite.status !== "PENDING") {
      throw new Error("Invite is no longer available");
    }
    if (invite.email !== normalizedEmail) {
      throw new Error("This invite belongs to a different email address");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existingUser?.restaurantId && existingUser.restaurantId !== invite.restaurantId) {
      throw new Error("This account already belongs to another workspace");
    }

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: normalizedEmail,
        role: invite.role,
        restaurantId: invite.restaurantId,
      });
    } else {
      await ctx.db.insert("users", {
        clerkId,
        email: normalizedEmail,
        role: invite.role,
        restaurantId: invite.restaurantId,
      });
    }

    await ctx.db.patch(invite._id, {
      status: "ACCEPTED",
      acceptedAt: Date.now(),
      acceptedByClerkId: clerkId,
    });

    return { ok: true, restaurantId: invite.restaurantId };
  },
});

export const updateWorkspaceUserRole = mutation({
  args: {
    actorClerkId: v.string(),
    userId: v.id("users"),
    role: inviteRoleValidator,
  },
  handler: async (ctx, { actorClerkId, userId, role }) => {
    const actor = await requireWorkspaceRole(ctx, actorClerkId, [
      "OWNER",
      "SUPER_ADMIN",
    ]);
    const targetUser = await ctx.db.get(userId);

    if (!targetUser?.restaurantId) {
      throw new Error("User not found");
    }
    if (
      actor.restaurantId !== targetUser.restaurantId &&
      actor.role !== "SUPER_ADMIN"
    ) {
      throw new Error("User does not belong to your workspace");
    }
    if (targetUser.role === "OWNER" || targetUser.role === "SUPER_ADMIN") {
      throw new Error("This role cannot be changed here");
    }

    await ctx.db.patch(userId, { role });
    return { ok: true };
  },
});

export const removeWorkspaceUser = mutation({
  args: {
    actorClerkId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { actorClerkId, userId }) => {
    const actor = await requireWorkspaceRole(ctx, actorClerkId, [
      "OWNER",
      "SUPER_ADMIN",
    ]);
    const targetUser = await ctx.db.get(userId);

    if (!targetUser?.restaurantId) {
      throw new Error("User not found");
    }
    if (
      actor.restaurantId !== targetUser.restaurantId &&
      actor.role !== "SUPER_ADMIN"
    ) {
      throw new Error("User does not belong to your workspace");
    }
    if (targetUser.role === "OWNER" || targetUser.role === "SUPER_ADMIN") {
      throw new Error("Owners and super admins cannot be removed here");
    }

    await ctx.db.delete(userId);
    return { ok: true };
  },
});

export const syncUserFromClerkWebhook = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    role: v.union(v.literal("SUPER_ADMIN"), v.literal("OWNER")),
  },
  handler: async (ctx, { clerkId, email, role }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: normalizedEmail,
        role:
          existing.role === "SUPER_ADMIN" || role === "SUPER_ADMIN"
            ? "SUPER_ADMIN"
            : existing.role,
      });
      return existing._id;
    }

    const pendingInvite = (
      await ctx.db
        .query("staffInvites")
        .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
        .collect()
    )
      .filter((invite) => invite.status === "PENDING")
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    return await ctx.db.insert("users", {
      clerkId,
      email: normalizedEmail,
      role: pendingInvite?.role ?? role,
      restaurantId: pendingInvite?.restaurantId,
    });
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
