"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";

export function useEnsureUser() {
  const { user, isLoaded } = useUser();
  const ensureUser = useMutation(api.users.ensureUser);

  // Get existing user from Convex
  const convexUser = useQuery(
    api.users.getCurrentUserByClerkId,
    isLoaded && user ? { clerkId: user.id } : "skip"
  );

  useEffect(() => {
    if (!isLoaded || !user) return;

    // Only create if doesn't exist yet
    if (convexUser === null) {
      ensureUser({
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress ?? "",
        role: "OWNER", // default role, admin can change later
      });
    }
  }, [isLoaded, user, convexUser, ensureUser]);

  return {
    convexUser,
    isLoading: !isLoaded || convexUser === undefined,
    clerkUser: user,
  };
}