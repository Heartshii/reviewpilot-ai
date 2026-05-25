/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import twilio from "twilio";
import { getAiModelForWorkspace } from "../lib/ai-models";
import { getBusinessLabels } from "../lib/business-copy";
import { hasWorkspaceBillingAccess } from "../lib/billing-plans";
import {
  getOptionalEnvValue,
  getRequiredEnvValue,
  getVoiceAiHighValueSpendValue,
} from "../lib/env";

type VoiceRecoveryStatus =
  | "QUEUED"
  | "INITIATED"
  | "RINGING"
  | "IN_PROGRESS"
  | "ANSWERED"
  | "COMPLETED"
  | "NO_ANSWER"
  | "BUSY"
  | "FAILED"
  | "CANCELED";

function getTwilioClient() {
  return twilio(
    getRequiredEnvValue("TWILIO_ACCOUNT_SID"),
    getRequiredEnvValue("TWILIO_AUTH_TOKEN")
  );
}

function getAppUrl() {
  return (
    getOptionalEnvValue("NEXT_PUBLIC_APP_URL") ??
    getOptionalEnvValue("APP_URL") ??
    "http://localhost:3000"
  );
}

function isCallStillOpen(status?: VoiceRecoveryStatus) {
  return (
    status === "QUEUED" ||
    status === "INITIATED" ||
    status === "RINGING" ||
    status === "IN_PROGRESS" ||
    status === "ANSWERED"
  );
}

function buildFallbackVoiceScript(args: {
  customerName: string;
  businessName: string;
  visitLabel: string;
  issueSummary?: string;
}) {
  const summaryPart = args.issueSummary
    ? ` We noticed feedback about ${args.issueSummary.toLowerCase()}.`
    : "";

  return `Hello ${args.customerName}, this is an automated follow-up from ${args.businessName}.${summaryPart} We are sorry your recent ${args.visitLabel} did not go as expected. Your feedback matters to us, and our team would appreciate the chance to make things right. Please reply to the follow-up text message or contact ${args.businessName} directly so we can help. Thank you.`;
}

async function generateVoiceScript(args: {
  restaurant: {
    name: string;
    businessType?: string;
    premiumAiEnabled?: boolean;
  };
  customerName: string;
  rating: number;
  totalSpent: number;
  visitCount: number;
  issueSummary?: string;
  sentimentCategory?: string;
}) {
  const labels = getBusinessLabels(args.restaurant.businessType);
  const fallback = buildFallbackVoiceScript({
    customerName: args.customerName,
    businessName: args.restaurant.name,
    visitLabel: labels.visitLabel,
    issueSummary: args.issueSummary ?? args.sentimentCategory?.replaceAll("_", " "),
  });

  const apiKey = getOptionalEnvValue("OPENAI_API_KEY");
  if (!apiKey) {
    return { script: fallback, summary: args.issueSummary ?? "Negative feedback follow-up." };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getAiModelForWorkspace(args.restaurant),
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Return JSON with keys script and summary. script must be a natural outbound phone call script for a recovery call under 95 spoken words. summary must be one short sentence. Do not include markdown or placeholders.",
        },
        {
          role: "user",
          content: `Business: ${args.restaurant.name}. Business type: ${labels.businessLabel}. Customer: ${args.customerName}. Rating: ${args.rating}/5. Total spend: $${args.totalSpent.toFixed(
            2
          )}. Visits: ${args.visitCount}. Issue summary: ${
            args.issueSummary ?? args.sentimentCategory ?? "General dissatisfaction"
          }. Goal: acknowledge the bad experience, sound calm and premium, and invite the customer to reply to the follow-up text or contact the business directly for resolution.`,
        },
      ],
      max_tokens: 220,
    }),
  });

  if (!response.ok) {
    return { script: fallback, summary: args.issueSummary ?? "Negative feedback follow-up." };
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) {
    return { script: fallback, summary: args.issueSummary ?? "Negative feedback follow-up." };
  }

  try {
    const parsed = JSON.parse(raw) as { script?: string; summary?: string };
    return {
      script: parsed.script?.trim() || fallback,
      summary: parsed.summary?.trim() || args.issueSummary || "Negative feedback follow-up.",
    };
  } catch {
    return { script: fallback, summary: args.issueSummary ?? "Negative feedback follow-up." };
  }
}

export const queueVoiceRecoveryCall = action({
  args: {
    actorClerkId: v.string(),
    restaurantId: v.id("restaurants"),
    feedbackId: v.id("feedback"),
  },
  handler: async (ctx, { actorClerkId, restaurantId, feedbackId }) => {
    const user = await ctx.runQuery(api.users.getCurrentUserByClerkId, {
      clerkId: actorClerkId,
    });
    if (!user) {
      throw new Error("User record not found");
    }
    if (
      user.role !== "SUPER_ADMIN" &&
      user.role !== "OWNER" &&
      user.role !== "MANAGER" &&
      user.role !== "STAFF"
    ) {
      throw new Error("You do not have permission for this action");
    }
    if (user.role !== "SUPER_ADMIN" && user.restaurantId !== restaurantId) {
      throw new Error("Workspace access denied");
    }

    const context = await ctx.runQuery(internal.voice.getVoiceRecoveryContext, {
      feedbackId,
    });
    if (!context || context.feedback.restaurantId !== restaurantId) {
      throw new Error("Recovery call context not found");
    }
    if (context.feedback.rating > 3) {
      throw new Error("Voice recovery is only available for negative feedback.");
    }
    if (
      !hasWorkspaceBillingAccess({
        subscriptionStatus: context.restaurant.subscriptionStatus ?? "NONE",
        trialEndsAt: context.restaurant.trialEndsAt,
        stripeSubscriptionId: context.restaurant.stripeSubscriptionId,
      })
    ) {
      throw new Error("Activate billing before using voice recovery calls.");
    }

    const threshold = getVoiceAiHighValueSpendValue();
    const eligible =
      context.totalSpent >= threshold || context.customer.visitCount >= 4;
    if (!eligible) {
      throw new Error(
        `Voice recovery is reserved for higher-value unhappy customers. Current threshold: $${threshold}+ tracked spend or 4+ visits.`
      );
    }

    if (context.latestCall && isCallStillOpen(context.latestCall.status)) {
      throw new Error("A recovery call is already in progress for this feedback.");
    }

    const twilioNumber =
      context.location?.twilioNumber ?? context.restaurant.twilioNumber;
    if (!twilioNumber) {
      throw new Error("No Twilio number is configured for this workspace.");
    }

    const generated = await generateVoiceScript({
      restaurant: context.restaurant,
      customerName: context.customer.name,
      rating: context.feedback.rating,
      totalSpent: context.totalSpent,
      visitCount: context.customer.visitCount,
      issueSummary:
        context.feedback.sentimentSummary ?? context.feedback.customerMessage,
      sentimentCategory: context.feedback.sentimentCategory,
    });

    const callId = await ctx.runMutation(internal.voice.createVoiceRecoveryCall, {
      restaurantId,
      locationId: context.feedback.locationId,
      customerId: context.customer._id,
      feedbackId,
      triggeredByClerkId: actorClerkId,
      script: generated.script,
      aiSummary: generated.summary,
      totalSpent: context.totalSpent,
      visitCount: context.customer.visitCount,
    });

    try {
      const client = getTwilioClient();
      const voiceUrl = `${getAppUrl()}/api/twilio/voice/recovery/${callId}`;
      const statusUrl = `${getAppUrl()}/api/twilio/voice/status?callId=${callId}`;

      const call = await client.calls.create({
        to: context.customer.phone,
        from: twilioNumber,
        url: voiceUrl,
        method: "POST",
        statusCallback: statusUrl,
        statusCallbackMethod: "POST",
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      });

      await ctx.runMutation(api.voice.updateVoiceRecoveryCall, {
        callId,
        callSid: call.sid,
        status: "INITIATED",
      });

      return { ok: true, callId, callSid: call.sid };
    } catch (error) {
      await ctx.runMutation(api.voice.updateVoiceRecoveryCall, {
        callId,
        status: "FAILED",
        failureReason:
          error instanceof Error ? error.message : "Voice call could not be created",
      });
      throw error;
    }
  },
});
