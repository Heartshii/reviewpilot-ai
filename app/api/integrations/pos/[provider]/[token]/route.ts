import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getRequiredEnvValue } from "@/lib/env";
import {
  extractSharedSecret,
  normalizePosWebhookPayload,
  providerFromPath,
} from "@/lib/integration-webhooks";
import { isPosProvider } from "@/lib/integrations";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string; token: string }> }
) {
  const { provider: providerParam, token } = await context.params;
  const provider = providerFromPath(providerParam);
  if (!provider || !isPosProvider(provider)) {
    return NextResponse.json({ error: "Unknown POS provider." }, { status: 404 });
  }

  const convex = new ConvexHttpClient(getRequiredEnvValue("NEXT_PUBLIC_CONVEX_URL"));
  const sharedSecret = extractSharedSecret(request);
  if (!sharedSecret) {
    return NextResponse.json({ error: "Missing webhook secret." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "Expected JSON payload." }, { status: 400 });
  }

  try {
    const normalized = normalizePosWebhookPayload(provider, payload);
    const result = await convex.mutation(api.integrations.ingestPosWebhook, {
      provider,
      token,
      sharedSecret,
      ...normalized,
    });

    return NextResponse.json({ ok: true, result }, { status: 202 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook import failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
