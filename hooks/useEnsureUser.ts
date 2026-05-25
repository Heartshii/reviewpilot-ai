"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { useE2ESession } from "@/hooks/useE2ESession";

export function useEnsureUser() {
  const { user, isLoaded } = useUser();
  const { session, isLoaded: isE2ELoaded } = useE2ESession();
  const ensureUser = useMutation(api.users.ensureUser);
  const activeClerkId = user?.id ?? (isE2ELoaded ? session?.clerkId : null);
  const activeEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    (isE2ELoaded ? session?.email : undefined) ??
    "";
  const identityReady = (isLoaded && !!user) || (isE2ELoaded && !!session);

  // Get existing user from Convex
  const convexUser = useQuery(
    api.users.getCurrentUserByClerkId,
    activeClerkId ? { clerkId: activeClerkId } : "skip"
  );

  useEffect(() => {
    if (!identityReady || !activeClerkId) return;

    // Keep this as a client-side fallback for local/dev environments.
    // Production should create the Convex user through the Clerk webhook.
    if (convexUser === null) {
      void ensureUser({
        clerkId: activeClerkId,
        email: activeEmail,
        role: "OWNER",
      });
    }
  }, [activeClerkId, activeEmail, convexUser, ensureUser, identityReady]);

  return {
    convexUser,
    isLoading: !identityReady || convexUser === undefined,
    clerkUser: user,
  };
}
