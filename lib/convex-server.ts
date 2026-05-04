import "server-only";

import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export function getConvexServerClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL");
  }

  return new ConvexHttpClient(convexUrl);
}

export async function getAuthedRestaurantContext() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const convex = getConvexServerClient();
  const user = await convex.query(api.users.getCurrentUserByClerkId, {
    clerkId: userId,
  });

  if (!user?.restaurantId) {
    return null;
  }

  const restaurant = await convex.query(api.queries.getRestaurant, {
    restaurantId: user.restaurantId,
  });

  return { convex, user, restaurant };
}
