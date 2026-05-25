/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import twilio from "twilio";
import { hasFeatureForTier, hasWorkspaceBillingAccess } from "../lib/billing-plans";
import { getAiModelForWorkspace } from "../lib/ai-models";
import { getOptionalEnvValue, getRequiredEnvValue } from "../lib/env";
import { toTwilioMessagingAddress, type PhoneMessagingChannel } from "../lib/validation";

type AiTone = "Friendly" | "Professional" | "Casual";
type ResponseLength = "Short" | "Medium" | "Detailed";

type RestaurantAiSettings = {
  aiTone: AiTone;
  responseLength: ResponseLength;
  autoApprove: boolean;
  includeReviewLink: boolean;
};

type MessagingContext = {
  restaurantName: string;
  twilioNumber?: string;
  googleBusinessUrl?: string;
  locationId?: Id<"locations">;
  preferredMessagingChannel: PhoneMessagingChannel;
};

type QueryRunner = {
  runQuery: (
    query: typeof internal.smsMutations.getRestaurantSettings,
    args: { restaurantId: Id<"restaurants"> }
  ) => Promise<unknown>;
};

const DEFAULT_AI_SETTINGS: RestaurantAiSettings = {
  aiTone: "Friendly",
  responseLength: "Medium",
  autoApprove: false,
  includeReviewLink: true,
};

function getTwilioClient() {
  const accountSid = getRequiredEnvValue("TWILIO_ACCOUNT_SID");
  const authToken = getRequiredEnvValue("TWILIO_AUTH_TOKEN");
  return twilio(accountSid, authToken);
}

function getAppUrl() {
  return (
    getOptionalEnvValue("NEXT_PUBLIC_APP_URL") ??
    getOptionalEnvValue("APP_URL") ??
    "http://localhost:3000"
  );
}

async function getRestaurantAiSettings(
  ctx: QueryRunner,
  restaurantId: Id<"restaurants">
): Promise<RestaurantAiSettings> {
  const settings = (await ctx.runQuery(
    internal.smsMutations.getRestaurantSettings,
    {
      restaurantId,
    }
  )) as Partial<RestaurantAiSettings> | null;

  return {
    aiTone: settings?.aiTone ?? DEFAULT_AI_SETTINGS.aiTone,
    responseLength: settings?.responseLength ?? DEFAULT_AI_SETTINGS.responseLength,
    autoApprove: settings?.autoApprove ?? DEFAULT_AI_SETTINGS.autoApprove,
    includeReviewLink:
      settings?.includeReviewLink ?? DEFAULT_AI_SETTINGS.includeReviewLink,
  } satisfies RestaurantAiSettings;
}

async function getMessagingContextForRestaurant(args: {
  ctx: unknown;
  restaurantId: Id<"restaurants">;
  locationId?: Id<"locations">;
}) {
  const runQuery = (
    args.ctx as {
      runQuery: (...input: readonly unknown[]) => Promise<unknown>;
    }
  ).runQuery;

  const restaurant = (await runQuery(
    internal.smsMutations.getRestaurant,
    {
      restaurantId: args.restaurantId,
    }
  )) as {
    _id: Id<"restaurants">;
    name: string;
    smsUsed: number;
    smsLimit: number;
    overageRate: number;
    tier: number;
    subscriptionStatus?: string;
    trialEndsAt?: number;
    stripeSubscriptionId?: string;
    twilioNumber?: string;
      googleBusinessUrl?: string;
  };
  const settings = await runQuery(internal.smsMutations.getRestaurantSettings, {
    restaurantId: args.restaurantId,
  });
  const preferredMessagingChannel = resolvePreferredMessagingChannel(settings);

  if (!args.locationId) {
    return {
      restaurant,
      messaging: {
        restaurantName: restaurant.name,
        twilioNumber: restaurant.twilioNumber,
        googleBusinessUrl: restaurant.googleBusinessUrl,
        preferredMessagingChannel,
      } satisfies MessagingContext,
    };
  }

  const location = (await runQuery(internal.restaurants.getLocation, {
    locationId: args.locationId,
  })) as
    | {
        _id: Id<"locations">;
        name: string;
        twilioNumber?: string;
        googleBusinessUrl?: string;
      }
    | null;

  return {
    restaurant,
    location,
    messaging: {
      restaurantName: location?.name ?? restaurant.name,
      twilioNumber: location?.twilioNumber ?? restaurant.twilioNumber,
      googleBusinessUrl:
        location?.googleBusinessUrl ?? restaurant.googleBusinessUrl,
      locationId: location?._id,
      preferredMessagingChannel,
    } satisfies MessagingContext,
  };
}

function resolvePreferredMessagingChannel(settings: unknown): PhoneMessagingChannel {
  return (settings as { preferredMessagingChannel?: PhoneMessagingChannel } | null)
    ?.preferredMessagingChannel ?? "SMS";
}

function buildTwilioPhoneArgs(args: {
  channel: PhoneMessagingChannel;
  from: string;
  to: string;
}) {
  return {
    from: toTwilioMessagingAddress(args.channel, args.from),
    to: toTwilioMessagingAddress(args.channel, args.to),
  };
}

function assertWorkspaceMessagingAccess(restaurant: {
  subscriptionStatus?: string;
  trialEndsAt?: number;
  stripeSubscriptionId?: string;
}) {
  if (
    !hasWorkspaceBillingAccess({
      subscriptionStatus: restaurant.subscriptionStatus ?? "NONE",
      trialEndsAt: restaurant.trialEndsAt,
      stripeSubscriptionId: restaurant.stripeSubscriptionId,
    })
  ) {
    throw new Error(
      "This workspace trial has ended. Activate billing to continue sending automated messages."
    );
  }
}

function getSmsLengthCap(
  length: ResponseLength,
  purpose: "deal" | "apology" | "review" | "reengagement"
) {
  if (purpose === "deal" || purpose === "reengagement") {
    if (length === "Short") return 100;
    if (length === "Detailed") return 150;
    return 120;
  }
  if (length === "Short") return 120;
  if (length === "Detailed") return 260;
  return 180;
}

function fallbackDealMessage(
  restaurantName: string,
  dealDescription: string,
  tone: AiTone
) {
  if (tone === "Professional") {
    return `Hi [name], ${dealDescription}. Visit ${restaurantName} soon.`;
  }
  if (tone === "Casual") {
    return `Hey [name]! ${dealDescription} at ${restaurantName}. See you soon!`;
  }
  return `Hi [name]! ${dealDescription} - ${restaurantName}`;
}

function fallbackReviewRequestMessage(args: {
  customerName: string;
  restaurantName: string;
  googleBusinessUrl?: string;
  tone: AiTone;
  includeReviewLink: boolean;
}) {
  const linkPart =
    args.includeReviewLink && args.googleBusinessUrl
      ? ` ${args.googleBusinessUrl}`
      : "";

  if (args.tone === "Professional") {
    return `Thank you, ${args.customerName}. We are glad you enjoyed ${args.restaurantName}. If you have a moment, we would appreciate a Google review.${linkPart}`;
  }
  if (args.tone === "Casual") {
    return `Thanks ${args.customerName}! So glad you had a great time at ${args.restaurantName}. Mind leaving us a quick Google review?${linkPart}`;
  }
  return `Thanks ${args.customerName}! We're so glad you had a great experience at ${args.restaurantName}. Would you mind leaving us a Google review?${linkPart}`;
}

function fallbackReengagementMessage(args: {
  customerName: string;
  restaurantName: string;
  days: number;
  tone: AiTone;
}) {
  if (args.tone === "Professional") {
    return `Hi ${args.customerName}, it has been about ${args.days} days since your last visit with ${args.restaurantName}. We would love to welcome you back soon.`;
  }
  if (args.tone === "Casual") {
    return `Hey ${args.customerName}! It's been about ${args.days} days since we saw you at ${args.restaurantName}. Come back soon, we'd love to have you in again.`;
  }
  return `Hi ${args.customerName}! It's been about ${args.days} days since your last visit at ${args.restaurantName}. We'd love to see you again soon.`;
}

function fallbackApologyMessage(args: {
  customerName: string;
  restaurantName: string;
  tone: AiTone;
  responseLength: ResponseLength;
}) {
  if (args.tone === "Professional") {
    return args.responseLength === "Detailed"
      ? `Hi ${args.customerName}, we're sorry your experience at ${args.restaurantName} missed the mark. We take your feedback seriously and would appreciate the chance to make this right. Please reply here and our team will follow up.`
      : `Hi ${args.customerName}, we're sorry your visit to ${args.restaurantName} was not up to standard. Please reply here so we can make it right.`;
  }

  if (args.tone === "Casual") {
    return args.responseLength === "Short"
      ? `Hey ${args.customerName}, sorry your visit at ${args.restaurantName} wasn't great. Reply here and we'll fix it.`
      : `Hey ${args.customerName}, we're really sorry things weren't great at ${args.restaurantName}. Reply here and we'll do our best to make it right.`;
  }

  return args.responseLength === "Detailed"
    ? `Hi ${args.customerName}, we're really sorry your experience at ${args.restaurantName} wasn't great. We'd love the chance to make it right and learn what went wrong. Please reply here and our team will follow up as soon as possible.`
    : `Hi ${args.customerName}, we're really sorry your experience at ${args.restaurantName} wasn't great. Please reply and we'll make it right.`;
}

async function generateSmsCopy(args: {
  purpose: "deal" | "apology" | "review" | "reengagement";
  restaurantName: string;
  premiumAiEnabled?: boolean;
  customerName?: string;
  dealDescription?: string;
  rating?: number;
  days?: number;
  googleBusinessUrl?: string;
  aiSettings: RestaurantAiSettings;
}) {
  const apiKey = getOptionalEnvValue("OPENAI_API_KEY");

  const fallback =
    args.purpose === "deal"
      ? fallbackDealMessage(
          args.restaurantName,
          args.dealDescription ?? "",
          args.aiSettings.aiTone
        )
      : args.purpose === "reengagement"
        ? fallbackReengagementMessage({
            customerName: args.customerName ?? "there",
            restaurantName: args.restaurantName,
            days: args.days ?? 30,
            tone: args.aiSettings.aiTone,
          })
      : args.purpose === "review"
        ? fallbackReviewRequestMessage({
            customerName: args.customerName ?? "there",
            restaurantName: args.restaurantName,
            googleBusinessUrl: args.googleBusinessUrl,
            tone: args.aiSettings.aiTone,
            includeReviewLink: args.aiSettings.includeReviewLink,
          })
        : fallbackApologyMessage({
            customerName: args.customerName ?? "there",
            restaurantName: args.restaurantName,
            tone: args.aiSettings.aiTone,
            responseLength: args.aiSettings.responseLength,
          });

  if (!apiKey) {
    return fallback;
  }

  const maxChars = getSmsLengthCap(args.aiSettings.responseLength, args.purpose);
  const audienceName =
    args.purpose === "deal"
      ? "Use [name] as the customer placeholder."
      : `Address the customer as ${args.customerName ?? "there"}.`;
  const reviewLinkInstruction =
    args.purpose === "review"
      ? args.aiSettings.includeReviewLink && args.googleBusinessUrl
        ? `Include this Google review URL exactly once at the end: ${args.googleBusinessUrl}`
        : "Do not include any review URL."
      : "";
  const promptDetails =
    args.purpose === "deal"
      ? `Deal details: ${args.dealDescription}`
      : args.purpose === "reengagement"
        ? `The customer has not visited for about ${args.days ?? 30} days. Goal: invite them back in a natural, helpful way without sounding pushy.`
      : args.purpose === "review"
        ? `Customer rating: ${args.rating ?? 5}/5`
        : `Customer rating: ${args.rating ?? 2}/5. Goal: acknowledge the issue and invite a reply so the team can recover the customer.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getAiModelForWorkspace({
        premiumAiEnabled: args.premiumAiEnabled,
      }),
      messages: [
        {
          role: "system",
          content: `Write one plain-text business SMS. Tone: ${args.aiSettings.aiTone}. Length: ${args.aiSettings.responseLength}. Stay under ${maxChars} characters. No markdown. No emojis unless they feel minimal and natural. ${audienceName} ${reviewLinkInstruction}`.trim(),
        },
        {
          role: "user",
          content: `Restaurant: ${args.restaurantName}. Purpose: ${args.purpose}. ${promptDetails}`,
        },
      ],
      max_tokens: 120,
    }),
  });

  if (!res.ok) {
    return fallback;
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  return data.choices?.[0]?.message?.content?.trim() || fallback;
}

async function sendCampaignMessageBatch(args: {
  ctx: unknown;
  restaurantId: Id<"restaurants">;
  locationId?: Id<"locations">;
  customerIds: Id<"customers">[];
  message: string;
  channel: PhoneMessagingChannel;
}) {
  const { restaurant, messaging } = await getMessagingContextForRestaurant({
    ctx: args.ctx,
    restaurantId: args.restaurantId,
    locationId: args.locationId,
  });

  if (!hasFeatureForTier(restaurant.tier, "campaigns")) {
    throw new Error("Campaign Builder is available on Pro and Agency.");
  }
  assertWorkspaceMessagingAccess(restaurant);
  if (!messaging.twilioNumber) {
    throw new Error("Business has no Twilio number configured for this scope.");
  }

  const runQuery = (
    args.ctx as {
      runQuery: (...input: readonly unknown[]) => Promise<unknown>;
    }
  ).runQuery;
  const runMutation = (
    args.ctx as {
      runMutation: (...input: readonly unknown[]) => Promise<unknown>;
    }
  ).runMutation;

  const client = getTwilioClient();
  let sentCount = 0;
  let failedCount = 0;

  for (const customerId of args.customerIds) {
    const customer = (await runQuery(internal.smsMutations.getCustomer, {
      customerId,
    })) as {
      _id: Id<"customers">;
      restaurantId: Id<"restaurants">;
      phone: string;
      name: string;
      optedInSms: boolean;
      lastLocationId?: Id<"locations">;
    };

    if (
      !customer ||
      customer.restaurantId !== args.restaurantId ||
      !customer.optedInSms
    ) {
      continue;
    }

    const personalized = args.message.replaceAll("[name]", customer.name);
    const logLocationId = args.locationId ?? customer.lastLocationId;

    try {
      await client.messages.create({
        body: personalized,
        ...buildTwilioPhoneArgs({
          channel: args.channel,
          from: messaging.twilioNumber,
          to: customer.phone,
        }),
      });
      await runMutation(internal.smsMutations.saveSmsLog, {
        smsType: "DEAL",
        content: personalized,
        status: "SENT",
        cost: 0,
        isOverage: false,
        restaurantId: args.restaurantId,
        locationId: logLocationId,
        customerId,
        deliveryChannel: args.channel,
      });
      await runMutation(internal.smsMutations.incrementSmsUsed, {
        restaurantId: args.restaurantId,
      });
      sentCount++;
    } catch {
      await runMutation(internal.smsMutations.saveSmsLog, {
        smsType: "DEAL",
        content: personalized,
        status: "FAILED",
        cost: 0,
        isOverage: false,
        restaurantId: args.restaurantId,
        locationId: logLocationId,
        customerId,
        deliveryChannel: args.channel,
      });
      failedCount++;
    }
  }

  return { sentCount, failedCount };
}

async function sendCampaignEmailBatch(args: {
  ctx: unknown;
  restaurantId: Id<"restaurants">;
  locationId?: Id<"locations">;
  customerIds: Id<"customers">[];
  subject: string;
  message: string;
}) {
  const resendApiKey = getOptionalEnvValue("RESEND_API_KEY");
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is required for email campaigns.");
  }

  const fromEmail =
    getOptionalEnvValue("REVIEWPILOT_CAMPAIGN_FROM_EMAIL") ??
    getOptionalEnvValue("REVIEWPILOT_ALERT_FROM_EMAIL") ??
    "campaigns@reviewpilot.ai";

  const { restaurant } = await getMessagingContextForRestaurant({
    ctx: args.ctx,
    restaurantId: args.restaurantId,
    locationId: args.locationId,
  });

  if (!hasFeatureForTier(restaurant.tier, "campaigns")) {
    throw new Error("Campaign Builder is available on Pro and Agency.");
  }
  assertWorkspaceMessagingAccess(restaurant);

  const runQuery = (
    args.ctx as {
      runQuery: (...input: readonly unknown[]) => Promise<unknown>;
    }
  ).runQuery;

  let sentCount = 0;
  let failedCount = 0;

  for (const customerId of args.customerIds) {
    const customer = (await runQuery(internal.smsMutations.getCustomer, {
      customerId,
    })) as {
      _id: Id<"customers">;
      restaurantId: Id<"restaurants">;
      email?: string;
      name: string;
      optedInEmail?: boolean;
    };

    if (
      !customer ||
      customer.restaurantId !== args.restaurantId ||
      !customer.email ||
      customer.optedInEmail !== true
    ) {
      continue;
    }

    const personalizedBody = args.message.replaceAll("[name]", customer.name);
    const personalizedSubject = args.subject.replaceAll("[name]", customer.name);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [customer.email],
        subject: personalizedSubject,
        text: personalizedBody,
      }),
    });

    if (response.ok) {
      sentCount++;
    } else {
      failedCount++;
      const body = await response.text();
      console.error("Resend campaign send failed:", body);
    }
  }

  return { sentCount, failedCount };
}

export const sendPendingApologyOwnerAlert = internalAction({
  args: {
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
    customerId: v.optional(v.id("customers")),
    smsLogId: v.id("smsLogs"),
    rating: v.number(),
  },
  handler: async (ctx, { restaurantId, locationId, customerId, smsLogId, rating }) => {
    const owner = await ctx.runQuery(internal.smsMutations.getOwnerForRestaurant, {
      restaurantId,
    });
    const { restaurant, messaging } = await getMessagingContextForRestaurant({
      ctx,
      restaurantId,
      locationId,
    });
    const customer = customerId
      ? await ctx.runQuery(internal.smsMutations.getCustomer, { customerId })
      : null;
    const smsLog = await ctx.runQuery(internal.smsMutations.getSmsLog, { smsLogId });

    if (!owner?.email || !restaurant || !smsLog) {
      return { sent: false, reason: "missing-owner-or-context" as const };
    }

    const resendApiKey = getOptionalEnvValue("RESEND_API_KEY");
    const fromEmail =
      getOptionalEnvValue("REVIEWPILOT_ALERT_FROM_EMAIL") ??
      "alerts@reviewpilot.ai";

    if (!resendApiKey) {
      console.warn(
        `Skipping owner email alert for ${restaurant.name}: RESEND_API_KEY not configured`
      );
      return { sent: false, reason: "missing-resend-key" as const };
    }

    const reviewsUrl = `${getAppUrl()}/dashboard/reviews`;
    const customerName = customer?.name ?? "Unknown customer";
    const customerPhone = customer?.phone ?? "No phone on file";

    const text = [
      `A customer at ${messaging.restaurantName} left a ${rating}/5 rating and is waiting for follow-up.`,
      `Customer: ${customerName}`,
      `Phone: ${customerPhone}`,
      `Draft message: ${smsLog.content}`,
      `Review and approve: ${reviewsUrl}`,
    ].join("\n");

    const html = `
      <div style="font-family: Arial, sans-serif; color: #e5eef9; background: #08111d; padding: 24px;">
        <div style="max-width: 640px; margin: 0 auto; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px;">
          <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #34d399;">
            ReviewPilot Alert
          </p>
          <h1 style="margin: 0 0 16px; font-size: 28px; line-height: 1.2; color: white;">
            Feedback needs your approval
          </h1>
          <p style="margin: 0 0 18px; color: rgba(229,238,249,0.72);">
            A customer at <strong>${messaging.restaurantName}</strong> left a <strong>${rating}/5</strong> rating.
            ReviewPilot drafted a follow-up message and is waiting for approval.
          </p>
          <div style="border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 16px; margin-bottom: 18px; background: rgba(255,255,255,0.02);">
            <p style="margin: 0 0 8px; color: white;"><strong>Customer:</strong> ${customerName}</p>
            <p style="margin: 0 0 8px; color: rgba(229,238,249,0.72);"><strong>Phone:</strong> ${customerPhone}</p>
            <p style="margin: 0 0 8px; color: rgba(229,238,249,0.72);"><strong>Draft message:</strong></p>
            <p style="margin: 0; color: rgba(229,238,249,0.85);">${smsLog.content}</p>
          </div>
          <a href="${reviewsUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 12px; background: linear-gradient(135deg, #34d399, #38bdf8); color: #06111c; font-weight: 700; text-decoration: none;">
            Open Reviews Dashboard
          </a>
        </div>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [owner.email],
        subject: `${messaging.restaurantName}: ${rating}/5 feedback needs review`,
        text,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Resend owner alert failed:", body);
      return { sent: false, reason: "provider-error" as const };
    }

    return { sent: true };
  },
});

export const sendWelcomeSms = action({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    const customer = await ctx.runQuery(internal.smsMutations.getCustomer, { customerId });
    if (!customer.optedInSms) return;

    const { restaurant, messaging } = await getMessagingContextForRestaurant({
      ctx,
      restaurantId: customer.restaurantId,
      locationId: customer.lastLocationId,
    });
    assertWorkspaceMessagingAccess(restaurant);
    if (!messaging.twilioNumber) throw new Error("Restaurant has no Twilio number");

    const creditsRemaining = restaurant.smsCreditsBalance ?? 0;
    const isOverage =
      restaurant.smsUsed >= restaurant.smsLimit && creditsRemaining <= 0;
    const cost = isOverage ? restaurant.overageRate : 0;
    const deliveryChannel = messaging.preferredMessagingChannel;

    const message = `Hi ${customer.name}! Thanks for visiting ${messaging.restaurantName}. How was your experience? Reply with a number from 1 to 5. (1=Poor, 5=Excellent)`;

    const client = getTwilioClient();
    await client.messages.create({
      body: message,
      ...buildTwilioPhoneArgs({
        channel: deliveryChannel,
        from: messaging.twilioNumber,
        to: customer.phone,
      }),
    });

    await ctx.runMutation(internal.smsMutations.saveSmsLog, {
      smsType: "WELCOME",
      content: message,
      status: "SENT",
      cost,
      isOverage,
      restaurantId: restaurant._id,
      locationId: customer.lastLocationId,
      customerId: customer._id,
      deliveryChannel,
    });

    await ctx.runMutation(internal.smsMutations.incrementSmsUsed, {
      restaurantId: restaurant._id,
    });
  },
});

export const handleRatingReply = internalAction({
  args: {
    customerPhone: v.string(),
    rating: v.number(),
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, { customerPhone, rating, restaurantId, locationId }) => {
    const { restaurant, messaging } = await getMessagingContextForRestaurant({
      ctx,
      restaurantId,
      locationId,
    });
    const aiSettings = await getRestaurantAiSettings(ctx, restaurantId);
    const customer = await ctx.runQuery(internal.smsMutations.getCustomerByPhone, {
      restaurantId,
      phone: customerPhone,
    });
    const customerId = customer?._id ?? undefined;
    const deliveryChannel = messaging.preferredMessagingChannel;

    const feedbackId = await ctx.runMutation(internal.smsMutations.saveFeedback, {
      rating,
      restaurantId,
      locationId: messaging.locationId,
      customerId,
      atRisk: rating <= 3,
    });

    await ctx.runAction(internal.sentiment.analyzeFeedbackSentiment, {
      feedbackId,
    });

    if (!hasWorkspaceBillingAccess({
      subscriptionStatus: restaurant.subscriptionStatus ?? "NONE",
      trialEndsAt: restaurant.trialEndsAt,
      stripeSubscriptionId: restaurant.stripeSubscriptionId,
    })) {
      return;
    }

    if (rating >= 4) {
      const name = customer?.name ?? "there";
      const msg = await generateSmsCopy({
        purpose: "review",
        restaurantName: messaging.restaurantName,
        premiumAiEnabled: restaurant.premiumAiEnabled,
        customerName: name,
        rating,
        googleBusinessUrl: messaging.googleBusinessUrl,
        aiSettings,
      });

      const shouldAutoApproveReview = rating !== 5 || aiSettings.autoApprove;

      if (messaging.twilioNumber && shouldAutoApproveReview) {
        const client = getTwilioClient();
        await client.messages.create({
          body: msg,
          ...buildTwilioPhoneArgs({
            channel: deliveryChannel,
            from: messaging.twilioNumber,
            to: customerPhone,
          }),
        });
      }

      await ctx.runMutation(internal.smsMutations.saveSmsLog, {
        smsType: "GOOGLE_REVIEW",
        content: msg,
        status: shouldAutoApproveReview ? "SENT" : "PENDING_APPROVAL",
        cost: 0,
        isOverage: false,
        restaurantId,
        locationId: messaging.locationId,
        customerId,
        deliveryChannel,
      });
      if (shouldAutoApproveReview) {
        await ctx.runMutation(internal.smsMutations.incrementSmsUsed, {
          restaurantId,
        });
      }
      return;
    }

    if (!hasFeatureForTier(restaurant.tier, "aiRecovery")) {
      return;
    }

    const name = customer?.name ?? "there";
    const apology = await generateSmsCopy({
      purpose: "apology",
      restaurantName: messaging.restaurantName,
      premiumAiEnabled: restaurant.premiumAiEnabled,
      customerName: name,
      rating,
      aiSettings,
    });

    const smsLogId = await ctx.runMutation(internal.smsMutations.saveSmsLog, {
      smsType: "APOLOGY",
      content: apology,
      status: "PENDING_APPROVAL",
      cost: 0,
      isOverage: false,
      restaurantId,
      locationId: messaging.locationId,
      customerId,
      deliveryChannel,
    });

    await ctx.runMutation(internal.smsMutations.saveNotification, {
      restaurantId,
      locationId: messaging.locationId,
      smsLogId,
      customerId,
    });

    try {
      await ctx.runAction(internal.sms.sendPendingApologyOwnerAlert, {
        restaurantId,
        locationId: messaging.locationId,
        customerId,
        smsLogId,
        rating,
      });
    } catch (error) {
      console.error("Owner email alert failed:", error);
    }
  },
});

export const handleCustomerReplyMessage = internalAction({
  args: {
    customerPhone: v.string(),
    message: v.string(),
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
  },
  handler: async (ctx, { customerPhone, message, restaurantId, locationId }) => {
    const { messaging } = await getMessagingContextForRestaurant({
      ctx,
      restaurantId,
      locationId,
    });
    const customer = await ctx.runQuery(internal.smsMutations.getCustomerByPhone, {
      restaurantId,
      phone: customerPhone,
    });

    if (!customer?._id) {
      return { ok: false, reason: "customer-not-found" as const };
    }

    const latestFeedback = await ctx.runQuery(
      internal.smsMutations.getLatestFeedbackForCustomer,
      {
        restaurantId,
        customerId: customer._id,
        locationId: messaging.locationId,
      }
    );

    if (!latestFeedback) {
      return { ok: false, reason: "feedback-not-found" as const };
    }

    await ctx.runMutation(internal.smsMutations.updateFeedbackAnalysis, {
      feedbackId: latestFeedback._id,
      customerMessage: message.trim(),
    });

    await ctx.runAction(internal.sentiment.analyzeFeedbackSentiment, {
      feedbackId: latestFeedback._id,
    });

    return { ok: true };
  },
});

export const approveSms = action({
  args: {
    smsLogId: v.id("smsLogs"),
    approvedByUserId: v.string(),
  },
  handler: async (ctx, { smsLogId, approvedByUserId }) => {
    const smsLog = await ctx.runQuery(internal.smsMutations.getSmsLog, { smsLogId });
    if (!smsLog) throw new Error("SMS log not found");
    if (!smsLog.customerId) throw new Error("SMS log has no customer");

    const customer = await ctx.runQuery(internal.smsMutations.getCustomer, {
      customerId: smsLog.customerId,
    });
    if (!customer) throw new Error("Customer not found");

    const { restaurant, messaging } = await getMessagingContextForRestaurant({
      ctx,
      restaurantId: smsLog.restaurantId,
      locationId: smsLog.locationId,
    });
    if (!restaurant) throw new Error("Restaurant not found");
    assertWorkspaceMessagingAccess(restaurant);
    if (!messaging.twilioNumber) throw new Error("Restaurant has no Twilio number");

    const client = getTwilioClient();
    const deliveryChannel = smsLog.deliveryChannel ?? messaging.preferredMessagingChannel;
    await client.messages.create({
      body: smsLog.content,
      ...buildTwilioPhoneArgs({
        channel: deliveryChannel,
        from: messaging.twilioNumber,
        to: customer.phone,
      }),
    });

    await ctx.runMutation(internal.smsMutations.updateSmsLogStatus, {
      smsLogId,
      status: "SENT",
      approvedBy: approvedByUserId,
    });

    await ctx.runMutation(internal.smsMutations.incrementSmsUsed, {
      restaurantId: restaurant._id,
    });

    return { success: true };
  },
});

export const sendBirthdaySms = action({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    const customer = await ctx.runQuery(internal.smsMutations.getCustomer, { customerId });
    if (!customer.optedInSms) return;

    const { restaurant, messaging } = await getMessagingContextForRestaurant({
      ctx,
      restaurantId: customer.restaurantId,
      locationId: customer.lastLocationId,
    });
    assertWorkspaceMessagingAccess(restaurant);
    if (!messaging.twilioNumber) throw new Error("Restaurant has no Twilio number");

    const settings = await ctx.runQuery(internal.smsMutations.getRestaurantSettings, {
      restaurantId: customer.restaurantId,
    });
    if (!hasFeatureForTier(restaurant.tier, "birthdayReengagement")) return;
    if (!settings?.birthdayEnabled) return;

    const template =
      settings?.birthdayTemplate ??
      `Happy Birthday ${customer.name}! We have a treat waiting on your next visit. Show this text. - ${messaging.restaurantName}`;
    const deliveryChannel = messaging.preferredMessagingChannel;

    const msg = template
      .replace("[name]", customer.name)
      .replace("[business]", messaging.restaurantName)
      .replace("[restaurant]", messaging.restaurantName);

    const client = getTwilioClient();
    await client.messages.create({
      body: msg,
      ...buildTwilioPhoneArgs({
        channel: deliveryChannel,
        from: messaging.twilioNumber,
        to: customer.phone,
      }),
    });

    await ctx.runMutation(internal.smsMutations.saveSmsLog, {
      smsType: "BIRTHDAY",
      content: msg,
      status: "SENT",
      cost: 0,
      isOverage: false,
      restaurantId: restaurant._id,
      locationId: customer.lastLocationId,
      customerId: customer._id,
      deliveryChannel,
    });

    await ctx.runMutation(internal.smsMutations.incrementSmsUsed, {
      restaurantId: restaurant._id,
    });
  },
});

export const sendReengagementSms = action({
  args: {
    customerId: v.id("customers"),
    days: v.union(v.literal(30), v.literal(60), v.literal(90)),
  },
  handler: async (ctx, { customerId, days }) => {
    const customer = await ctx.runQuery(internal.smsMutations.getCustomer, {
      customerId,
    });
    if (!customer.optedInSms) return;

    const { restaurant, messaging } = await getMessagingContextForRestaurant({
      ctx,
      restaurantId: customer.restaurantId,
      locationId: customer.lastLocationId,
    });
    assertWorkspaceMessagingAccess(restaurant);
    if (!messaging.twilioNumber) throw new Error("Restaurant has no Twilio number");
    if (!hasFeatureForTier(restaurant.tier, "birthdayReengagement")) return;

    const settings = await ctx.runQuery(internal.smsMutations.getRestaurantSettings, {
      restaurantId: customer.restaurantId,
    });
    const enabled =
      days === 30
        ? settings?.reengagement30
        : days === 60
          ? settings?.reengagement60
          : settings?.reengagement90;

    if (!enabled) return;

    const lastVisitAt = customer.lastVisitAt ?? customer.createdAt;
    const elapsedDays = Math.floor(
      (Date.now() - lastVisitAt) / (1000 * 60 * 60 * 24)
    );
    if (elapsedDays < days) return;

    const mostRecentReengagement = await ctx.runQuery(
      internal.smsMutations.getMostRecentSmsForCustomer,
      {
        customerId,
        smsType: "REENGAGEMENT",
      }
    );

    if (
      mostRecentReengagement &&
      Date.now() - mostRecentReengagement.sentAt < 21 * 24 * 60 * 60 * 1000
    ) {
      return;
    }

    const aiSettings = await getRestaurantAiSettings(ctx, customer.restaurantId);
    const message = await generateSmsCopy({
      purpose: "reengagement",
      restaurantName: messaging.restaurantName,
      premiumAiEnabled: restaurant.premiumAiEnabled,
      customerName: customer.name,
      days,
      aiSettings,
    });
    const deliveryChannel = messaging.preferredMessagingChannel;

    const client = getTwilioClient();
    await client.messages.create({
      body: message,
      ...buildTwilioPhoneArgs({
        channel: deliveryChannel,
        from: messaging.twilioNumber,
        to: customer.phone,
      }),
    });

    await ctx.runMutation(internal.smsMutations.saveSmsLog, {
      smsType: "REENGAGEMENT",
      content: message,
      status: "SENT",
      cost: 0,
      isOverage: false,
      restaurantId: restaurant._id,
      locationId: customer.lastLocationId,
      customerId: customer._id,
      deliveryChannel,
    });

    await ctx.runMutation(internal.smsMutations.incrementSmsUsed, {
      restaurantId: restaurant._id,
    });
  },
});

export const sendBulkSms = action({
  args: {
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
    channel: v.optional(
      v.union(v.literal("SMS"), v.literal("WHATSAPP"), v.literal("EMAIL"))
    ),
    subject: v.optional(v.string()),
    message: v.string(),
    segment: v.union(
      v.literal("ALL"),
      v.literal("NEW"),
      v.literal("LOYAL"),
      v.literal("VIP"),
      v.literal("HIGH_SPEND"),
      v.literal("RECENT"),
      v.literal("INACTIVE_30"),
      v.literal("INACTIVE_60"),
      v.literal("NEEDS_ATTENTION"),
      v.literal("REVIEW_READY")
    ),
  },
  handler: async (ctx, { restaurantId, locationId, channel, subject, message, segment }) => {
    const customerIds = await ctx.runQuery(internal.smsMutations.getSegmentCustomers, {
      restaurantId,
      locationId,
      segment,
      channel: channel ?? "SMS",
    });
    if ((channel ?? "SMS") === "EMAIL") {
      return await sendCampaignEmailBatch({
        ctx,
        restaurantId,
        locationId,
        customerIds,
        subject: subject ?? "Your update from ReviewPilot",
        message,
      });
    }
    return await sendCampaignMessageBatch({
      ctx,
      restaurantId,
      locationId,
      customerIds,
      message,
      channel: (channel ?? "SMS") as PhoneMessagingChannel,
    });
  },
});

export const generateDealMessage = action({
  args: {
    restaurantId: v.id("restaurants"),
    restaurantName: v.string(),
    dealDescription: v.string(),
  },
  handler: async (ctx, { restaurantId, restaurantName, dealDescription }) => {
    const restaurant = await ctx.runQuery(internal.smsMutations.getRestaurant, {
      restaurantId,
    });
    if (!hasFeatureForTier(restaurant.tier, "campaigns")) {
      throw new Error("Campaign Builder is available on Pro and Agency.");
    }
    const aiSettings = await getRestaurantAiSettings(ctx, restaurantId);
    return await generateSmsCopy({
      purpose: "deal",
      restaurantName,
      premiumAiEnabled: restaurant.premiumAiEnabled,
      dealDescription,
      aiSettings,
    });
  },
});

export const sendToSpecificCustomers = action({
  args: {
    restaurantId: v.id("restaurants"),
    locationId: v.optional(v.id("locations")),
    channel: v.optional(
      v.union(v.literal("SMS"), v.literal("WHATSAPP"), v.literal("EMAIL"))
    ),
    subject: v.optional(v.string()),
    customerIds: v.array(v.id("customers")),
    message: v.string(),
  },
  handler: async (ctx, { restaurantId, locationId, channel, subject, customerIds, message }) => {
    if ((channel ?? "SMS") === "EMAIL") {
      return await sendCampaignEmailBatch({
        ctx,
        restaurantId,
        locationId,
        customerIds,
        subject: subject ?? "Your update from ReviewPilot",
        message,
      });
    }
    return await sendCampaignMessageBatch({
      ctx,
      restaurantId,
      locationId,
      customerIds,
      message,
      channel: (channel ?? "SMS") as PhoneMessagingChannel,
    });
  },
});

export const executeScheduledCampaign = internalAction({
  args: {
    campaignId: v.id("campaigns"),
  },
  handler: async (ctx, { campaignId }) => {
    const claimed = await ctx.runMutation(internal.campaigns.claimScheduledCampaign, {
      campaignId,
    });

    if (!claimed) {
      return { skipped: true };
    }

    try {
      const customerIds = await ctx.runQuery(
        internal.campaigns.getScheduledCampaignRecipients,
        { campaignId }
      );

      const finalResult =
        claimed.channel === "EMAIL"
          ? await sendCampaignEmailBatch({
              ctx,
              restaurantId: claimed.restaurantId,
              locationId: claimed.locationId,
              customerIds,
              subject: claimed.subject ?? claimed.title,
              message: claimed.message,
            })
          : await sendCampaignMessageBatch({
              ctx,
              restaurantId: claimed.restaurantId,
              locationId: claimed.locationId,
              customerIds,
              message: claimed.message,
              channel: claimed.channel as PhoneMessagingChannel,
            });

      await ctx.runMutation(internal.campaigns.finalizeScheduledCampaign, {
        campaignId,
        status: "SENT",
        sentCount: finalResult.sentCount,
        failedCount: finalResult.failedCount,
      });

      return finalResult;
    } catch (error) {
      await ctx.runMutation(internal.campaigns.finalizeScheduledCampaign, {
        campaignId,
        status: "FAILED",
        sentCount: 0,
        failedCount: 0,
        failureReason:
          error instanceof Error ? error.message : "Campaign execution failed",
      });
      throw error;
    }
  },
});
