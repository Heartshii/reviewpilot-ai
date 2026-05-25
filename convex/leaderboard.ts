import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

function badgeTier(avgRating: number, feedbackCount: number) {
  if (avgRating >= 4.8 && feedbackCount >= 25) {
    return "Top Rated";
  }
  if (avgRating >= 4.5 && feedbackCount >= 15) {
    return "Customer Favorite";
  }
  if (avgRating >= 4.2 && feedbackCount >= 10) {
    return "Rising Reputation";
  }
  return "ReviewPilot Member";
}

async function getSettingsByRestaurantId(
  ctx: QueryCtx,
  restaurantId: Id<"restaurants">
) {
  return await ctx.db
    .query("restaurantSettings")
    .withIndex("by_restaurantId", (q) => q.eq("restaurantId", restaurantId))
    .first();
}

export const getPublicLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const restaurants = (await ctx.db.query("restaurants").collect()).filter(
      (restaurant) => restaurant.active
    );
    const allFeedback = await ctx.db.query("feedback").collect();
    const allLocations = await ctx.db.query("locations").collect();

    const rows = await Promise.all(
      restaurants.map(async (restaurant) => {
        const settings = await getSettingsByRestaurantId(ctx, restaurant._id);
        if (!settings?.leaderboardOptIn) {
          return null;
        }

        const feedback = allFeedback.filter(
          (row) => row.restaurantId === restaurant._id
        );
        if (feedback.length < 5) {
          return null;
        }

        const avgRating =
          feedback.reduce((sum, row) => sum + row.rating, 0) / feedback.length;
        const recentFeedback = feedback.filter(
          (row) => row.createdAt >= Date.now() - 30 * 24 * 60 * 60 * 1000
        );
        const recentAvg =
          recentFeedback.length > 0
            ? recentFeedback.reduce((sum, row) => sum + row.rating, 0) /
              recentFeedback.length
            : avgRating;
        const locationCount = allLocations.filter(
          (location) => location.restaurantId === restaurant._id && location.active
        ).length;

        return {
          restaurantId: restaurant._id,
          name: restaurant.name,
          slug: restaurant.slug,
          businessType: restaurant.businessType ?? "GENERAL_SERVICE",
          avgRating: Number(avgRating.toFixed(2)),
          feedbackCount: feedback.length,
          recentAvgRating: Number(recentAvg.toFixed(2)),
          momentum: Number((recentAvg - avgRating).toFixed(2)),
          locationCount,
          badgeLabel:
            settings.leaderboardBadgeLabel?.trim() ||
            badgeTier(avgRating, feedback.length),
        };
      })
    );

    return rows
      .filter(Boolean)
      .sort((a, b) => {
        if (b!.avgRating !== a!.avgRating) {
          return b!.avgRating - a!.avgRating;
        }
        return b!.feedbackCount - a!.feedbackCount;
      })
      .slice(0, 50)
      .map((row, index) => ({
        ...row!,
        rank: index + 1,
      }));
  },
});

export const getPublicBadgeBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!restaurant || !restaurant.active) {
      return null;
    }

    const settings = await getSettingsByRestaurantId(ctx, restaurant._id);
    if (!settings?.leaderboardOptIn) {
      return null;
    }

    const feedback = (await ctx.db
      .query("feedback")
      .filter((q) => q.eq(q.field("restaurantId"), restaurant._id))
      .collect()).sort((a, b) => b.createdAt - a.createdAt);

    if (feedback.length < 5) {
      return null;
    }

    const avgRating =
      feedback.reduce((sum, row) => sum + row.rating, 0) / feedback.length;
    const recentFeedback = feedback.filter(
      (row) => row.createdAt >= Date.now() - 30 * 24 * 60 * 60 * 1000
    );
    const recentAvg =
      recentFeedback.length > 0
        ? recentFeedback.reduce((sum, row) => sum + row.rating, 0) /
          recentFeedback.length
        : avgRating;

    return {
      name: restaurant.name,
      slug: restaurant.slug,
      avgRating: Number(avgRating.toFixed(2)),
      feedbackCount: feedback.length,
      momentum: Number((recentAvg - avgRating).toFixed(2)),
      badgeLabel:
        settings.leaderboardBadgeLabel?.trim() ||
        badgeTier(avgRating, feedback.length),
    };
  },
});
