"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import twilio from "twilio";
import { hasFeatureForTier } from "../lib/billing-plans";

type AiTone = "Friendly" | "Professional" | "Casual";
type ResponseLength = "Short" | "Medium" | "Detailed";

type RestaurantAiSettings = {
  aiTone: AiTone;
  responseLength: ResponseLength;
  autoApprove: boolean;
  includeReviewLink: boolean;
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
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) throw new Error("Missing Twilio credentials");
  return twilio(accountSid, authToken);
}

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
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
  customerName?: string;
  dealDescription?: string;
  rating?: number;
  days?: number;
  googleBusinessUrl?: string;
  aiSettings: RestaurantAiSettings;
}) {
  const apiKey = process.env.OPENAI_API_KEY;

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
      model: "gpt-4o-mini",
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

export const sendPendingApologyOwnerAlert = internalAction({
  args: {
    restaurantId: v.id("restaurants"),
    customerId: v.optional(v.id("customers")),
    smsLogId: v.id("smsLogs"),
    rating: v.number(),
  },
  handler: async (ctx, { restaurantId, customerId, smsLogId, rating }) => {
    const owner = await ctx.runQuery(internal.smsMutations.getOwnerForRestaurant, {
      restaurantId,
    });
    const restaurant = await ctx.runQuery(internal.smsMutations.getRestaurant, {
      restaurantId,
    });
    const customer = customerId
      ? await ctx.runQuery(internal.smsMutations.getCustomer, { customerId })
      : null;
    const smsLog = await ctx.runQuery(internal.smsMutations.getSmsLog, { smsLogId });

    if (!owner?.email || !restaurant || !smsLog) {
      return { sent: false, reason: "missing-owner-or-context" as const };
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail =
      process.env.REVIEWPILOT_ALERT_FROM_EMAIL ?? "alerts@reviewpilot.ai";

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
      `A customer at ${restaurant.name} left a ${rating}/5 rating and is waiting for follow-up.`,
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
            A customer at <strong>${restaurant.name}</strong> left a <strong>${rating}/5</strong> rating.
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
        subject: `${restaurant.name}: ${rating}/5 feedback needs review`,
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

    const restaurant = await ctx.runQuery(internal.smsMutations.getRestaurant, {
      restaurantId: customer.restaurantId,
    });
    if (!restaurant.twilioNumber) throw new Error("Restaurant has no Twilio number");

    const isOverage = restaurant.smsUsed >= restaurant.smsLimit;
    const cost = isOverage ? restaurant.overageRate : 0;

    const message = `Hi ${customer.name}! Thanks for visiting ${restaurant.name}. How was your experience? Reply with a number from 1 to 5. (1=Poor, 5=Excellent)`;

    const client = getTwilioClient();
    await client.messages.create({
      body: message,
      from: restaurant.twilioNumber,
      to: customer.phone,
    });

    await ctx.runMutation(internal.smsMutations.saveSmsLog, {
      smsType: "WELCOME",
      content: message,
      status: "SENT",
      cost,
      isOverage,
      restaurantId: restaurant._id,
      customerId: customer._id,
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
  },
  handler: async (ctx, { customerPhone, rating, restaurantId }) => {
    const restaurant = await ctx.runQuery(internal.smsMutations.getRestaurant, {
      restaurantId,
    });
    const aiSettings = await getRestaurantAiSettings(ctx, restaurantId);
    const customer = await ctx.runQuery(internal.smsMutations.getCustomerByPhone, {
      restaurantId,
      phone: customerPhone,
    });
    const customerId = customer?._id ?? undefined;

    await ctx.runMutation(internal.smsMutations.saveFeedback, {
      rating,
      restaurantId,
      customerId,
      atRisk: rating <= 3,
    });

    if (rating >= 4) {
      const name = customer?.name ?? "there";
      const msg = await generateSmsCopy({
        purpose: "review",
        restaurantName: restaurant.name,
        customerName: name,
        rating,
        googleBusinessUrl: restaurant.googleBusinessUrl,
        aiSettings,
      });

      const shouldAutoApproveReview = rating !== 5 || aiSettings.autoApprove;

      if (restaurant.twilioNumber && shouldAutoApproveReview) {
        const client = getTwilioClient();
        await client.messages.create({
          body: msg,
          from: restaurant.twilioNumber,
          to: customerPhone,
        });
      }

      await ctx.runMutation(internal.smsMutations.saveSmsLog, {
        smsType: "GOOGLE_REVIEW",
        content: msg,
        status: shouldAutoApproveReview ? "SENT" : "PENDING_APPROVAL",
        cost: 0,
        isOverage: false,
        restaurantId,
        customerId,
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
      restaurantName: restaurant.name,
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
      customerId,
    });

    await ctx.runMutation(internal.smsMutations.saveNotification, {
      restaurantId,
      smsLogId,
      customerId,
    });

    try {
      await ctx.runAction(internal.sms.sendPendingApologyOwnerAlert, {
        restaurantId,
        customerId,
        smsLogId,
        rating,
      });
    } catch (error) {
      console.error("Owner email alert failed:", error);
    }
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

    const restaurant = await ctx.runQuery(internal.smsMutations.getRestaurant, {
      restaurantId: smsLog.restaurantId,
    });
    if (!restaurant) throw new Error("Restaurant not found");
    if (!restaurant.twilioNumber) throw new Error("Restaurant has no Twilio number");

    const client = getTwilioClient();
    await client.messages.create({
      body: smsLog.content,
      from: restaurant.twilioNumber,
      to: customer.phone,
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

    const restaurant = await ctx.runQuery(internal.smsMutations.getRestaurant, {
      restaurantId: customer.restaurantId,
    });
    if (!restaurant.twilioNumber) throw new Error("Restaurant has no Twilio number");

    const settings = await ctx.runQuery(internal.smsMutations.getRestaurantSettings, {
      restaurantId: customer.restaurantId,
    });
    if (!hasFeatureForTier(restaurant.tier, "birthdayReengagement")) return;
    if (!settings?.birthdayEnabled) return;

    const template =
      settings?.birthdayTemplate ??
      `Happy Birthday ${customer.name}! We have a treat waiting on your next visit. Show this text. - ${restaurant.name}`;

    const msg = template
      .replace("[name]", customer.name)
      .replace("[business]", restaurant.name)
      .replace("[restaurant]", restaurant.name);

    const client = getTwilioClient();
    await client.messages.create({
      body: msg,
      from: restaurant.twilioNumber,
      to: customer.phone,
    });

    await ctx.runMutation(internal.smsMutations.saveSmsLog, {
      smsType: "BIRTHDAY",
      content: msg,
      status: "SENT",
      cost: 0,
      isOverage: false,
      restaurantId: restaurant._id,
      customerId: customer._id,
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

    const restaurant = await ctx.runQuery(internal.smsMutations.getRestaurant, {
      restaurantId: customer.restaurantId,
    });
    if (!restaurant.twilioNumber) throw new Error("Restaurant has no Twilio number");
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
      restaurantName: restaurant.name,
      customerName: customer.name,
      days,
      aiSettings,
    });

    const client = getTwilioClient();
    await client.messages.create({
      body: message,
      from: restaurant.twilioNumber,
      to: customer.phone,
    });

    await ctx.runMutation(internal.smsMutations.saveSmsLog, {
      smsType: "REENGAGEMENT",
      content: message,
      status: "SENT",
      cost: 0,
      isOverage: false,
      restaurantId: restaurant._id,
      customerId: customer._id,
    });

    await ctx.runMutation(internal.smsMutations.incrementSmsUsed, {
      restaurantId: restaurant._id,
    });
  },
});

export const sendBulkSms = action({
  args: {
    restaurantId: v.id("restaurants"),
    message: v.string(),
    segment: v.union(
      v.literal("ALL"),
      v.literal("LOYAL"),
      v.literal("NEW"),
      v.literal("ATRISK"),
      v.literal("INACTIVE"),
      v.literal("VIP")
    ),
  },
  handler: async (ctx, { restaurantId, message, segment }) => {
    const customerIds = await ctx.runQuery(internal.smsMutations.getSegmentCustomers, {
      restaurantId,
      segment,
    });
    const restaurant = await ctx.runQuery(internal.smsMutations.getRestaurant, {
      restaurantId,
    });
    if (!hasFeatureForTier(restaurant.tier, "campaigns")) {
      throw new Error("Campaign Builder is available on Pro and Agency.");
    }
    if (!restaurant.twilioNumber) throw new Error("Restaurant has no Twilio number");

    const client = getTwilioClient();
    let sentCount = 0;
    let failedCount = 0;

    for (const customerId of customerIds) {
      const customer = await ctx.runQuery(internal.smsMutations.getCustomer, {
        customerId,
      });
      try {
        await client.messages.create({
          body: message.replace("[name]", customer.name),
          from: restaurant.twilioNumber,
          to: customer.phone,
        });
        await ctx.runMutation(internal.smsMutations.saveSmsLog, {
          smsType: "DEAL",
          content: message,
          status: "SENT",
          cost: 0,
          isOverage: false,
          restaurantId,
          customerId,
        });
        await ctx.runMutation(internal.smsMutations.incrementSmsUsed, {
          restaurantId,
        });
        sentCount++;
      } catch {
        await ctx.runMutation(internal.smsMutations.saveSmsLog, {
          smsType: "DEAL",
          content: message,
          status: "FAILED",
          cost: 0,
          isOverage: false,
          restaurantId,
          customerId,
        });
        failedCount++;
      }
    }

    return { sentCount, failedCount };
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
      dealDescription,
      aiSettings,
    });
  },
});

export const sendToSpecificCustomers = action({
  args: {
    restaurantId: v.id("restaurants"),
    customerIds: v.array(v.id("customers")),
    message: v.string(),
  },
  handler: async (ctx, { restaurantId, customerIds, message }) => {
    const restaurant = await ctx.runQuery(internal.smsMutations.getRestaurant, {
      restaurantId,
    });
    if (!hasFeatureForTier(restaurant.tier, "campaigns")) {
      throw new Error("Campaign Builder is available on Pro and Agency.");
    }
    if (!restaurant.twilioNumber) throw new Error("Restaurant has no Twilio number");

    const client = getTwilioClient();
    let sentCount = 0;
    let failedCount = 0;

    for (const customerId of customerIds) {
      const customer = await ctx.runQuery(internal.smsMutations.getCustomer, {
        customerId,
      });
      if (!customer.optedInSms) continue;

      try {
        await client.messages.create({
          body: message.replace("[name]", customer.name),
          from: restaurant.twilioNumber,
          to: customer.phone,
        });
        await ctx.runMutation(internal.smsMutations.saveSmsLog, {
          smsType: "DEAL",
          content: message.replace("[name]", customer.name),
          status: "SENT",
          cost: 0,
          isOverage: false,
          restaurantId,
          customerId,
        });
        await ctx.runMutation(internal.smsMutations.incrementSmsUsed, {
          restaurantId,
        });
        sentCount++;
      } catch {
        await ctx.runMutation(internal.smsMutations.saveSmsLog, {
          smsType: "DEAL",
          content: message.replace("[name]", customer.name),
          status: "FAILED",
          cost: 0,
          isOverage: false,
          restaurantId,
          customerId,
        });
        failedCount++;
      }
    }

    return { sentCount, failedCount };
  },
});
