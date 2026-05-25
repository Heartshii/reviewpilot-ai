import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";
import { getRequiredEnvValue } from "@/lib/env";
import { isValidTwilioSignature } from "@/lib/twilio-signature";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ callId: string }> }
) {
  const formData = await request.formData();
  const payload = Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [key, String(value)])
  );
  const signature = request.headers.get("x-twilio-signature");

  const valid = isValidTwilioSignature({
    requestUrl: request.url,
    authToken: getRequiredEnvValue("TWILIO_AUTH_TOKEN"),
    signature,
    payload,
  });

  if (!valid) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { callId } = await context.params;
  const convex = getConvexServerClient();
  const twimlContext = await convex.query(api.voice.getVoiceRecoveryTwiMLContext, {
    callId: callId as Id<"voiceRecoveryCalls">,
  });

  if (!twimlContext?.call) {
    return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const businessName = twimlContext.restaurant?.name ?? "the business";
  const voice = new twilio.twiml.VoiceResponse();
  voice.say(
    {
      voice: "Polly.Joanna",
      language: "en-US",
    },
    twimlContext.call.script
  );
  voice.pause({ length: 1 });
  voice.say(
    {
      voice: "Polly.Joanna",
      language: "en-US",
    },
    `If you would like help, please reply to the follow-up text message from ${businessName} or contact the business directly. Goodbye.`
  );
  voice.hangup();

  return new NextResponse(voice.toString(), {
    headers: {
      "Content-Type": "text/xml",
      "Cache-Control": "no-cache",
    },
  });
}
