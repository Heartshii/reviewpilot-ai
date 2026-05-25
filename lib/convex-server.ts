import "server-only";

import { auth } from "@clerk/nextjs/server";
import { cookies, headers } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getRequiredEnvValue } from "@/lib/env";
import {
  decodeE2ESession,
  E2E_SESSION_COOKIE,
  isE2ETestModeAllowed,
} from "@/lib/e2e-session";

export function getConvexServerClient() {
  return new ConvexHttpClient(getRequiredEnvValue("NEXT_PUBLIC_CONVEX_URL"));
}

export async function getAuthedRestaurantContext() {
  const { userId } = await auth();
  const headerStore = await headers();
  const hostHeader = headerStore.get("host") ?? "";
  const hostname = hostHeader.split(":")[0] ?? "";
  const cookieStore = await cookies();
  const e2eSession = isE2ETestModeAllowed(hostname)
    ? decodeE2ESession(cookieStore.get(E2E_SESSION_COOKIE)?.value)
    : null;
  const activeClerkId = userId ?? e2eSession?.clerkId;
  if (!activeClerkId) {
    return null;
  }

  const convex = getConvexServerClient();
  const user = await convex.query(api.users.getCurrentUserByClerkId, {
    clerkId: activeClerkId,
  });

  if (!user?.restaurantId) {
    return null;
  }

  const restaurant = await convex.query(api.queries.getRestaurant, {
    restaurantId: user.restaurantId,
  });

  return { convex, user, restaurant };
}
