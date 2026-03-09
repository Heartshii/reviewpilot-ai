"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function useRestaurantId(): Id<"restaurants"> | null {
  const { userId } = useAuth();
  const user = useQuery(api.users.getCurrentUserByClerkId, userId ? { clerkId: userId } : "skip");
  return (user?.restaurantId ?? null) as Id<"restaurants"> | null;
}
