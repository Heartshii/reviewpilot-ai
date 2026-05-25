import { NextRequest, NextResponse } from "next/server";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";
import { getRequiredEnvValue } from "@/lib/env";
import { isValidTwilioSignature } from "@/lib/twilio-signature";

export const runtime = "nodejs";

function mapStatus(status?: string) {
  switch ((status ?? "").toLowerCase()) {
    case "initiated":
      return "INITIATED" as const;
    case "ringing":
      return "RINGING" as const;
    case "in-progress":
      return "IN_PROGRESS" as const;
    case "answered":
      return "ANSWERED" as const;
    case "completed":
      return "COMPLETED" as const;
    case "busy":
      return "BUSY" as const;
    case "no-answer":
      return "NO_ANSWER" as const;
    case "canceled":
      return "CANCELED" as const;
    default:
      return "FAILED" as const;
  }
}

export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const callId = request.nextUrl.searchParams.get("callId");
  if (!callId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const convex = getConvexServerClient();
  await convex.mutation(api.voice.updateVoiceRecoveryCall, {
    callId: callId as Id<"voiceRecoveryCalls">,
    callSid: payload.CallSid || undefined,
    status: mapStatus(payload.CallStatus),
    callDurationSeconds: payload.CallDuration
      ? Number(payload.CallDuration)
      : undefined,
    failureReason:
      payload.CallStatus && ["busy", "failed", "no-answer", "canceled"].includes(payload.CallStatus.toLowerCase())
        ? `Twilio status: ${payload.CallStatus}`
        : undefined,
  });

  return NextResponse.json({ ok: true });
}
