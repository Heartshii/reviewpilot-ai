import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";

function readAllowedAdminEmails() {
  return (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress;

  if (!email) {
    return NextResponse.json(
      { error: "No primary email found for this user" },
      { status: 400 }
    );
  }

  const allowedEmails = readAllowedAdminEmails();
  if (!allowedEmails.includes(email.trim().toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await client.users.updateUser(userId, {
    publicMetadata: {
      ...(user.publicMetadata ?? {}),
      role: "SUPER_ADMIN",
    },
  });

  const convex = getConvexServerClient();
  await convex.mutation(api.users.promoteCurrentUserToSuperAdmin, {
    clerkId: userId,
    email,
  });

  return NextResponse.json({ ok: true });
}
