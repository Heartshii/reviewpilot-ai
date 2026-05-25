import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";
import { getSuperAdminEmails } from "@/lib/env";

type ClerkEmailAddress = {
  id: string;
  email_address: string;
};

type ClerkUserPayload = {
  id: string;
  primary_email_address_id?: string | null;
  email_addresses?: ClerkEmailAddress[];
};

function getPrimaryEmail(payload: ClerkUserPayload) {
  const emailAddresses = payload.email_addresses ?? [];
  return (
    emailAddresses.find(
      (address) => address.id === payload.primary_email_address_id
    )?.email_address ?? emailAddresses[0]?.email_address
  );
}

export async function POST(request: NextRequest) {
  try {
    const event = await verifyWebhook(request);

    if (event.type !== "user.created" && event.type !== "user.updated") {
      return NextResponse.json({ ok: true });
    }

    const payload = event.data as ClerkUserPayload;
    const email = getPrimaryEmail(payload);

    if (!payload.id || !email) {
      return NextResponse.json({ ok: true });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const role = getSuperAdminEmails().includes(normalizedEmail)
      ? "SUPER_ADMIN"
      : "OWNER";

    const convex = getConvexServerClient();
    await convex.mutation(api.users.syncUserFromClerkWebhook, {
      clerkId: payload.id,
      email: normalizedEmail,
      role,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Clerk webhook verification failed", error);
    return NextResponse.json(
      { error: "Webhook verification failed" },
      { status: 400 }
    );
  }
}
