import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import { getAiModelForWorkspace } from "../lib/ai-models";
import { getBusinessLabels } from "../lib/business-copy";
import {
  buildDefaultWidgetHeadline,
  buildDefaultWidgetSubheadline,
  formatPublicCustomerName,
  sanitizePublicQuote,
  type TestimonialWidgetTheme,
} from "../lib/testimonial-widget";

type WorkspaceRole = "SUPER_ADMIN" | "OWNER" | "MANAGER" | "STAFF";

async function requireReviewAccess(
  ctx: { db: unknown },
  actorClerkId: string,
  restaurantId: string,
  allowedRoles: WorkspaceRole[]
) {
  const actor = await (
    ctx.db as {
      query: (table: "users") => {
        withIndex: (
          name: "by_clerkId",
          cb: (q: { eq: (field: "clerkId", value: string) => unknown }) => unknown
        ) => {
          first: () => Promise<{
            role: WorkspaceRole;
            restaurantId?: string;
          } | null>;
        };
      };
    }
  )
    .query("users")
    .withIndex("by_clerkId", (q: { eq: (field: "clerkId", value: string) => unknown }) =>
      q.eq("clerkId", actorClerkId)
    )
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
}

function fallbackPublicReply(args: {
  businessName: string;
  customerName: string;
  rating: number;
  businessType?: string;
}) {
  const labels = getBusinessLabels(args.businessType);

  if (args.rating >= 5) {
    return `Thank you, ${args.customerName}, for the 5-star review. We are grateful you chose ${args.businessName} and we are glad your ${labels.visitLabel} was a great one. We look forward to welcoming you back soon.`;
  }

  return `Thank you, ${args.customerName}, for taking the time to share your feedback. We are glad you chose ${args.businessName}, and we appreciate the opportunity to keep improving every ${labels.visitLabel}. We hope to see you again soon.`;
}

const testimonialWidgetThemeValidator = v.union(
  v.literal("EMERALD"),
  v.literal("MIDNIGHT"),
  v.literal("GLASS")
);

async function buildWidgetPayload(
  ctx: Pick<QueryCtx, "db">,
  args: {
    restaurantId: Id<"restaurants">;
    locationId?: Id<"locations">;
    slug: string;
    scopeLabel: string;
    forceEnabled?: boolean;
  }
) {
  const restaurant = (await ctx.db.get(args.restaurantId)) as
    | {
        name: string;
      }
    | null;
  if (!restaurant) {
    return null;
  }

  const settings = (await (
    ctx.db.query("restaurantSettings") as {
      filter: (cb: (q: {
        eq: (field: unknown, value: unknown) => unknown;
        field: (name: string) => unknown;
      }) => unknown) => {
        collect: () => Promise<
          Array<{
            testimonialWidgetEnabled?: boolean;
            testimonialWidgetHeadline?: string;
            testimonialWidgetSubheadline?: string;
            testimonialWidgetTheme?: TestimonialWidgetTheme;
            whiteLabelEnabled?: boolean;
            whiteLabelBrandName?: string;
            whiteLabelSupportEmail?: string;
            whiteLabelHideReviewPilot?: boolean;
          }>
        >;
      };
    }
  )
    .filter((q) => q.eq(q.field("restaurantId"), args.restaurantId))
    .collect())[0];

  const enabled = settings?.testimonialWidgetEnabled ?? false;
  if (!enabled && !args.forceEnabled) {
    return null;
  }

  const feedbackRows = (await (
    ctx.db.query("feedback") as {
      filter: (cb: (q: {
        eq: (field: unknown, value: unknown) => unknown;
        field: (name: string) => unknown;
      }) => unknown) => {
        collect: () => Promise<
          Array<{
            _id: Id<"feedback">;
            customerId?: Id<"customers">;
            rating: number;
            customerMessage?: string;
            sentimentSummary?: string;
            createdAt: number;
            locationId?: Id<"locations">;
          }>
        >;
      };
    }
  )
    .filter((q) => q.eq(q.field("restaurantId"), args.restaurantId))
    .collect())
    .filter((row) => (args.locationId ? row.locationId === args.locationId : true))
    .filter((row) => row.rating >= 5)
    .sort((a, b) => b.createdAt - a.createdAt);

  const deduped = new Map<string, (typeof feedbackRows)[number]>();
  for (const row of feedbackRows) {
    if (!row.customerId) {
      continue;
    }
    if (!deduped.has(row.customerId)) {
      deduped.set(row.customerId, row);
    }
  }

  const items = await Promise.all(
    Array.from(deduped.values())
      .slice(0, 6)
      .map(async (row) => {
        const customer = row.customerId
          ? ((await ctx.db.get(row.customerId)) as
              | { name?: string; visitCount?: number }
              | null)
          : null;
        const quote = sanitizePublicQuote(
          row.customerMessage ?? row.sentimentSummary
        );

        if (!quote) {
          return null;
        }

        return {
          id: row._id,
          quote,
          customerName: formatPublicCustomerName(customer?.name),
          rating: row.rating,
          visitCount: customer?.visitCount ?? 1,
          createdAt: row.createdAt,
        };
      })
  );

  return {
    slug: args.slug,
    businessName: restaurant.name,
    scopeLabel: args.scopeLabel,
    badgeLabel:
      settings?.whiteLabelEnabled && settings?.whiteLabelHideReviewPilot
        ? settings.whiteLabelBrandName?.trim() || "Client testimonials"
        : "ReviewPilot widget",
    footerLabel:
      settings?.whiteLabelEnabled && settings?.whiteLabelHideReviewPilot
        ? settings.whiteLabelSupportEmail?.trim() ||
          settings.whiteLabelBrandName?.trim() ||
          args.scopeLabel
        : "Powered by ReviewPilot AI",
    supportEmail:
      settings?.whiteLabelEnabled && settings?.whiteLabelHideReviewPilot
        ? settings.whiteLabelSupportEmail?.trim() || undefined
        : undefined,
    headline:
      settings?.testimonialWidgetHeadline?.trim() ||
      buildDefaultWidgetHeadline(args.scopeLabel),
    subheadline:
      settings?.testimonialWidgetSubheadline?.trim() ||
      buildDefaultWidgetSubheadline(
        args.scopeLabel,
        !(settings?.whiteLabelEnabled && settings?.whiteLabelHideReviewPilot)
      ),
    theme: settings?.testimonialWidgetTheme ?? "EMERALD",
    enabled,
    items: items.filter(Boolean),
  };
}

export const getReviewReplyCandidates = query({
  args: {
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, { restaurantId, locationId }) => {
    const feedbackRows = (await ctx.db
      .query("feedback")
      .filter((q) => q.eq(q.field("restaurantId"), restaurantId))
      .collect()).filter((row) =>
      locationId ? row.locationId === locationId : true
    );

    const eligible = feedbackRows
      .filter((row) => row.customerId && row.rating >= 4)
      .sort((a, b) => b.createdAt - a.createdAt);

    const deduped = new Map<string, (typeof eligible)[number]>();
    for (const row of eligible) {
      if (!row.customerId) continue;
      if (!deduped.has(row.customerId)) {
        deduped.set(row.customerId, row);
      }
    }

    const result = await Promise.all(
      Array.from(deduped.values()).map(async (row) => {
        const customer = row.customerId ? await ctx.db.get(row.customerId) : null;
        const restaurant = await ctx.db.get(row.restaurantId);
        return {
          _id: row._id,
          customerId: row.customerId,
          customerName: customer?.name ?? "Customer",
          customerEmail: customer?.email,
          rating: row.rating,
          createdAt: row.createdAt,
          customerMessage: row.customerMessage,
          sentiment: row.sentiment,
          sentimentCategory: row.sentimentCategory,
          sentimentSummary: row.sentimentSummary,
          publicReplySuggestion: row.publicReplySuggestion,
          publicReplyGeneratedAt: row.publicReplyGeneratedAt,
          restaurantName: restaurant?.name ?? "ReviewPilot workspace",
          businessType: restaurant?.businessType,
          visitCount: customer?.visitCount ?? 0,
        };
      })
    );

    return result.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getWidgetEditorState = query({
  args: {
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, { restaurantId, locationId }) => {
    const restaurant = await ctx.db.get(restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    const location = locationId ? await ctx.db.get(locationId) : null;
    const settings = await ctx.db
      .query("restaurantSettings")
      .withIndex("by_restaurantId", (q) =>
        q.eq("restaurantId", restaurantId)
      )
      .first();

    const payload = await buildWidgetPayload(ctx, {
      restaurantId,
      locationId: locationId ?? undefined,
      slug: location?.slug ?? restaurant.slug,
      scopeLabel: location?.name ?? restaurant.name,
      forceEnabled: true,
    });

    return {
      slug: location?.slug ?? restaurant.slug,
      scopeLabel: location?.name ?? restaurant.name,
      settings: {
        enabled: settings?.testimonialWidgetEnabled ?? false,
        headline:
          settings?.testimonialWidgetHeadline ??
          buildDefaultWidgetHeadline(location?.name ?? restaurant.name),
        subheadline:
          settings?.testimonialWidgetSubheadline ??
          buildDefaultWidgetSubheadline(location?.name ?? restaurant.name),
        theme: settings?.testimonialWidgetTheme ?? "EMERALD",
      },
      preview: payload,
    };
  },
});

export const getPublicTestimonialWidgetBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, { slug }) => {
    const normalizedSlug = slug.trim().toLowerCase();
    if (!normalizedSlug) {
      return null;
    }

    const location = await ctx.db
      .query("locations")
      .withIndex("by_slug", (q) => q.eq("slug", normalizedSlug))
      .first();

    if (location) {
      return await buildWidgetPayload(ctx, {
        restaurantId: location.restaurantId,
        locationId: location._id,
        slug: location.slug,
        scopeLabel: location.name,
      });
    }

    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_slug", (q) => q.eq("slug", normalizedSlug))
      .first();

    if (!restaurant) {
      return null;
    }

    return await buildWidgetPayload(ctx, {
      restaurantId: restaurant._id,
      slug: restaurant.slug,
      scopeLabel: restaurant.name,
    });
  },
});

export const updateTestimonialWidgetSettings = mutation({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    enabled: v.boolean(),
    headline: v.string(),
    subheadline: v.string(),
    theme: testimonialWidgetThemeValidator,
  },
  handler: async (ctx, { actorClerkId, restaurantId, enabled, headline, subheadline, theme }) => {
    await requireReviewAccess(ctx, actorClerkId, restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
      "MANAGER",
    ]);

    const existing = await ctx.db
      .query("restaurantSettings")
      .withIndex("by_restaurantId", (q) =>
        q.eq("restaurantId", restaurantId)
      )
      .first();

    const patch = {
      testimonialWidgetEnabled: enabled,
      testimonialWidgetHeadline: headline.trim(),
      testimonialWidgetSubheadline: subheadline.trim(),
      testimonialWidgetTheme: theme,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("restaurantSettings", {
        restaurantId,
        sendDelayMinutes: 60,
        birthdayEnabled: true,
        reengagement30: true,
        reengagement60: true,
        reengagement90: true,
        autoApprove: false,
        includeReviewLink: true,
        ...patch,
      });
    }

    return { ok: true };
  },
});

export const getFeedbackReplyContext = internalQuery({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, { feedbackId }) => {
    const feedback = await ctx.db.get(feedbackId);
    if (!feedback) {
      return null;
    }
    const customer = feedback.customerId ? await ctx.db.get(feedback.customerId) : null;
    const restaurant = await ctx.db.get(feedback.restaurantId);

    return {
      feedback,
      customer,
      restaurant,
    };
  },
});

export const savePublicReplySuggestion = internalMutation({
  args: {
    feedbackId: v.id("feedback"),
    suggestion: v.string(),
  },
  handler: async (ctx, { feedbackId, suggestion }) => {
    await ctx.db.patch(feedbackId, {
      publicReplySuggestion: suggestion,
      publicReplyGeneratedAt: Date.now(),
    });
  },
});

export const overwritePublicReplySuggestion = mutation({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    feedbackId: v.id("feedback"),
    suggestion: v.string(),
  },
  handler: async (ctx, { actorClerkId, restaurantId, feedbackId, suggestion }) => {
    await requireReviewAccess(ctx, actorClerkId, restaurantId, [
      "SUPER_ADMIN",
      "OWNER",
      "MANAGER",
      "STAFF",
    ]);

    const feedback = await ctx.db.get(feedbackId);
    if (!feedback || feedback.restaurantId !== restaurantId) {
      throw new Error("Feedback not found");
    }

    await ctx.db.patch(feedbackId, {
      publicReplySuggestion: suggestion.trim(),
      publicReplyGeneratedAt: Date.now(),
    });

    return { ok: true };
  },
});

export const generatePublicReplySuggestion = action({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    feedbackId: v.id("feedback"),
  },
  handler: async (ctx, { actorClerkId, restaurantId, feedbackId }) => {
    const replyContext = await ctx.runQuery(internal.reviews.getFeedbackReplyContext, {
      feedbackId,
    });

    if (!replyContext) {
      throw new Error("Feedback not found");
    }

    const user = await ctx.runQuery(api.users.getCurrentUserByClerkId, {
      clerkId: actorClerkId,
    });
    if (!user) {
      throw new Error("User record not found");
    }
    if (
      user.role !== "SUPER_ADMIN" &&
      user.restaurantId !== restaurantId
    ) {
      throw new Error("Workspace access denied");
    }

    const feedback = replyContext.feedback;
    const customer = replyContext.customer;
    const restaurant = replyContext.restaurant;

    if (!feedback || !restaurant || feedback.restaurantId !== restaurantId) {
      throw new Error("Feedback context not found");
    }
    if (feedback.rating < 4) {
      throw new Error("Public review replies are only generated for positive review candidates.");
    }

    const fallback = fallbackPublicReply({
      businessName: restaurant.name,
      customerName: customer?.name ?? "there",
      rating: feedback.rating,
      businessType: restaurant.businessType,
    });

    const apiKey = process.env.OPENAI_API_KEY;
    let suggestion = fallback;

    if (apiKey) {
      const labels = getBusinessLabels(restaurant.businessType);
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: getAiModelForWorkspace(restaurant),
          messages: [
            {
              role: "system",
              content:
                "Write one public Google review reply for a local business owner. Keep it warm, professional, and specific. Do not promise discounts or compensation. Do not use markdown. Keep it under 420 characters.",
            },
            {
              role: "user",
              content: `Business: ${restaurant.name}. Business type: ${labels.businessLabel}. Customer name: ${
                customer?.name ?? "Customer"
              }. Rating: ${feedback.rating}/5. Repeat visits: ${
                customer?.visitCount ?? 1
              }. Goal: thank the customer publicly and reinforce trust without sounding robotic.`,
            },
          ],
          max_tokens: 180,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        suggestion = data.choices?.[0]?.message?.content?.trim() || fallback;
      }
    }

    await ctx.runMutation(internal.reviews.savePublicReplySuggestion, {
      feedbackId,
      suggestion,
    });

    return { suggestion };
  },
});
