import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAiModelForWorkspace } from "../lib/ai-models";

function fallbackSentiment(args: {
  rating: number;
  customerMessage?: string;
}): {
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  sentimentCategory:
    | "SERVICE"
    | "STAFF"
    | "WAIT_TIME"
    | "PRICE"
    | "QUALITY"
    | "CLEANLINESS"
    | "COMMUNICATION"
    | "OTHER";
  sentimentConfidence: number;
  sentimentSummary: string;
} {
  const text = (args.customerMessage ?? "").toLowerCase();
  const negativeWords = ["bad", "slow", "rude", "late", "dirty", "overpriced", "upset"];
  const positiveWords = ["great", "amazing", "friendly", "perfect", "love", "excellent"];

  const negativeHits = negativeWords.filter((word) => text.includes(word)).length;
  const positiveHits = positiveWords.filter((word) => text.includes(word)).length;

  const sentiment =
    negativeHits > positiveHits
      ? "NEGATIVE"
      : positiveHits > negativeHits
        ? "POSITIVE"
        : args.rating >= 4
          ? "POSITIVE"
          : args.rating === 3
            ? "NEUTRAL"
            : "NEGATIVE";

  let sentimentCategory:
    | "SERVICE"
    | "STAFF"
    | "WAIT_TIME"
    | "PRICE"
    | "QUALITY"
    | "CLEANLINESS"
    | "COMMUNICATION"
    | "OTHER" = "OTHER";

  if (text.includes("wait") || text.includes("slow")) sentimentCategory = "WAIT_TIME";
  else if (text.includes("staff") || text.includes("employee") || text.includes("rude"))
    sentimentCategory = "STAFF";
  else if (text.includes("price") || text.includes("expensive") || text.includes("overpriced"))
    sentimentCategory = "PRICE";
  else if (text.includes("dirty") || text.includes("clean"))
    sentimentCategory = "CLEANLINESS";
  else if (text.includes("service")) sentimentCategory = "SERVICE";
  else if (text.includes("food") || text.includes("quality") || text.includes("work"))
    sentimentCategory = "QUALITY";
  else if (text.includes("call") || text.includes("message") || text.includes("response"))
    sentimentCategory = "COMMUNICATION";

  return {
    sentiment,
    sentimentCategory,
    sentimentConfidence: 0.62,
    sentimentSummary:
      args.customerMessage?.trim() ||
      (sentiment === "POSITIVE"
        ? "Positive rating with no detailed complaint."
        : sentiment === "NEGATIVE"
          ? "Negative rating with limited detail."
          : "Mixed rating that may need review."),
  };
}

export const analyzeFeedbackSentiment = internalAction({
  args: {
    feedbackId: v.id("feedback"),
  },
  handler: async (ctx, { feedbackId }) => {
    const replyContext = await ctx.runQuery(internal.reviews.getFeedbackReplyContext, {
      feedbackId,
    });

    if (!replyContext?.feedback) {
      return { ok: false };
    }

    const feedback = replyContext.feedback;
    const apiKey = process.env.OPENAI_API_KEY;
    const fallback = fallbackSentiment({
      rating: feedback.rating,
      customerMessage: feedback.customerMessage,
    });

    let analysis = fallback;

    if (apiKey && feedback.customerMessage?.trim()) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: getAiModelForWorkspace(replyContext.restaurant),
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Classify customer feedback into JSON with keys sentiment, sentimentCategory, sentimentConfidence, sentimentSummary. Sentiment must be POSITIVE, NEUTRAL, or NEGATIVE. sentimentCategory must be one of SERVICE, STAFF, WAIT_TIME, PRICE, QUALITY, CLEANLINESS, COMMUNICATION, OTHER. sentimentConfidence must be a number between 0 and 1. sentimentSummary must be one short sentence.",
            },
            {
              role: "user",
              content: `Rating: ${feedback.rating}/5. Customer message: ${feedback.customerMessage}`,
            },
          ],
          max_tokens: 180,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const raw = data.choices?.[0]?.message?.content;
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as {
              sentiment?: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
              sentimentCategory?:
                | "SERVICE"
                | "STAFF"
                | "WAIT_TIME"
                | "PRICE"
                | "QUALITY"
                | "CLEANLINESS"
                | "COMMUNICATION"
                | "OTHER";
              sentimentConfidence?: number;
              sentimentSummary?: string;
            };

            analysis = {
              sentiment: parsed.sentiment ?? fallback.sentiment,
              sentimentCategory: parsed.sentimentCategory ?? fallback.sentimentCategory,
              sentimentConfidence:
                typeof parsed.sentimentConfidence === "number"
                  ? parsed.sentimentConfidence
                  : fallback.sentimentConfidence,
              sentimentSummary:
                parsed.sentimentSummary?.trim() || fallback.sentimentSummary,
            };
          } catch {
            analysis = fallback;
          }
        }
      }
    }

    await ctx.runMutation(internal.smsMutations.updateFeedbackAnalysis, {
      feedbackId,
      sentiment: analysis.sentiment,
      sentimentCategory: analysis.sentimentCategory,
      sentimentConfidence: analysis.sentimentConfidence,
      sentimentSummary: analysis.sentimentSummary,
    });

    return { ok: true, ...analysis };
  },
});
