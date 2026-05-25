import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";
import {
  E2E_SESSION_COOKIE,
  encodeE2ESession,
  isE2ETestModeAllowed,
} from "@/lib/e2e-session";
import type { BusinessType } from "@/lib/business-copy";

export const runtime = "nodejs";

type BootstrapMode = "withoutWorkspace" | "withWorkspace";

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!isE2ETestModeAllowed(url.hostname)) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    mode?: BootstrapMode;
    businessName?: string;
    businessType?: BusinessType;
  };

  const mode = body.mode ?? "withoutWorkspace";
  const uniqueSuffix = Date.now().toString(36);
  const clerkId = `e2e_${uniqueSuffix}`;
  const email = `e2e-${uniqueSuffix}@reviewpilot.local`;
  const businessName = body.businessName ?? `E2E Service ${uniqueSuffix}`;
  const businessType = body.businessType ?? "GENERAL_SERVICE";
  const convex = getConvexServerClient();

  await convex.mutation(api.users.ensureUser, {
    clerkId,
    email,
    role: "OWNER",
  });

  let slug: string | null = null;

  if (mode === "withWorkspace") {
    const onboarding = await convex.mutation(api.users.completeOwnerOnboarding, {
      clerkId,
      email,
      restaurantName: businessName,
      restaurantSlug: `e2e-${uniqueSuffix}`,
      businessType,
    });
    slug = onboarding.slug;
  }

  const response = NextResponse.json({
    ok: true,
    clerkId,
    email,
    slug,
    mode,
  });

  response.cookies.set(E2E_SESSION_COOKIE, encodeE2ESession({ clerkId, email }), {
    httpOnly: false,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 30,
  });

  return response;
}
