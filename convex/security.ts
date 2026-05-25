import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const consumeRequestGuard = internalMutation({
  args: {
    scope: v.union(v.literal("KIOSK_CHECKIN"), v.literal("TWILIO_INBOUND")),
    key: v.string(),
    windowMs: v.number(),
    maxHits: v.number(),
  },
  handler: async (ctx, { scope, key, windowMs, maxHits }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("requestGuards")
      .withIndex("by_scope_key", (q) => q.eq("scope", scope).eq("key", key))
      .first();

    if (existing && existing.expiresAt > now) {
      const attempts = existing.attempts + 1;
      await ctx.db.patch(existing._id, {
        attempts,
        lastSeenAt: now,
      });
      return {
        allowed: attempts <= maxHits,
        attempts,
        retryAfterMs: existing.expiresAt - now,
      };
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        attempts: 1,
        lastSeenAt: now,
        expiresAt: now + windowMs,
      });
    } else {
      await ctx.db.insert("requestGuards", {
        scope,
        key,
        attempts: 1,
        createdAt: now,
        lastSeenAt: now,
        expiresAt: now + windowMs,
      });
    }

    return {
      allowed: true,
      attempts: 1,
      retryAfterMs: 0,
    };
  },
});
