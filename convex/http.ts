import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getRequiredEnvValue } from "../lib/env";
import {
  TWILIO_INBOUND_DEDUP_WINDOW_MS,
  normalizeInboundPhoneNumber,
  stripTwilioChannelPrefix,
} from "../lib/validation";

const http = httpRouter();

function emptyTwilioResponse(status = 200) {
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    {
      status,
      headers: {
        "Content-Type": "text/xml",
        "Cache-Control": "no-cache",
      },
    }
  );
}

async function signTwilioPayload(url: string, payload: Record<string, string>) {
  const sortedEntries = Object.entries(payload).sort(([left], [right]) =>
    left.localeCompare(right)
  );
  const message = `${url}${sortedEntries
    .map(([key, value]) => `${key}${value}`)
    .join("")}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getRequiredEnvValue("TWILIO_AUTH_TOKEN")),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function isValidTwilioSignature(args: {
  requestUrl: string;
  signature: string;
  payload: Record<string, string>;
}) {
  const expectedSignature = await signTwilioPayload(
    args.requestUrl,
    args.payload
  );
  return expectedSignature === args.signature;
}

http.route({
  path: "/twilio/incoming",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const contentType = request.headers.get("content-type") ?? "";
      let from = "";
      let body = "";
      let to = "";
      let payload: Record<string, string> = {};

      if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await request.formData();
        from = (formData.get("From") as string) ?? "";
        body = ((formData.get("Body") as string) ?? "").trim();
        to = (formData.get("To") as string) ?? "";
        payload = Object.fromEntries(
          Array.from(formData.entries()).map(([key, value]) => [key, String(value)])
        );

        const signature = request.headers.get("x-twilio-signature");
        if (!signature) {
          return emptyTwilioResponse(403);
        }

        const isValid = await isValidTwilioSignature({
          requestUrl: request.url,
          signature,
          payload,
        });

        if (!isValid) {
          return emptyTwilioResponse(403);
        }
      } else {
        const json = (await request.json()) as Record<string, string>;
        from = json.From ?? "";
        body = (json.Body ?? "").trim();
        to = json.To ?? "";
        payload = json;
      }

      if (from && to) {
        try {
          from = normalizeInboundPhoneNumber(from);
          to = stripTwilioChannelPrefix(to);
        } catch {
          from = "";
        }

        if (!from) {
          return emptyTwilioResponse();
        }

        const routingTarget = await ctx.runQuery(
          internal.restaurants.findRestaurantByTwilioNumber,
          { twilioNumber: to }
        );

        if (routingTarget) {
          const { restaurant, location } = routingTarget;
          const dedupe = await ctx.runMutation(
            internal.security.consumeRequestGuard,
            {
              scope: "TWILIO_INBOUND",
              key: `${restaurant._id}:${from}:${body.toUpperCase()}`,
              windowMs: TWILIO_INBOUND_DEDUP_WINDOW_MS,
              maxHits: 1,
            }
          );

          if (!dedupe.allowed) {
            return emptyTwilioResponse();
          }

          const rating = parseInt(body, 10);
          if (!Number.isNaN(rating) && rating >= 1 && rating <= 5) {
            await ctx.runAction(internal.sms.handleRatingReply, {
              customerPhone: from,
              rating,
              restaurantId: restaurant._id,
              locationId: location?._id,
            });
          } else if (body.toUpperCase() === "STOP") {
            await ctx.runMutation(internal.smsMutations.handleOptOut, {
              customerPhone: from,
              restaurantId: restaurant._id,
            });
          } else if (body.length > 0) {
            await ctx.runAction(internal.sms.handleCustomerReplyMessage, {
              customerPhone: from,
              message: body,
              restaurantId: restaurant._id,
              locationId: location?._id,
            });
          }
        }
      }
    } catch (err) {
      console.error("Webhook error:", err);
    }

    return emptyTwilioResponse();
  }),
});

export default http;
