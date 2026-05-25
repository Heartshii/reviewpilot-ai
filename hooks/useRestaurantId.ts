"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useE2ESession } from "@/hooks/useE2ESession";

const SUPPORT_WORKSPACE_KEY = "reviewpilot-support-workspace";

export function useRestaurantId(): Id<"restaurants"> | null {
  const { userId } = useAuth();
  const { user: clerkUser } = useUser();
  const { session, isLoaded } = useE2ESession();
  const searchParams = useSearchParams();
  const activeClerkId = userId ?? (isLoaded ? session?.clerkId : null);
  const convexUser = useQuery(
    api.users.getCurrentUserByClerkId,
    activeClerkId ? { clerkId: activeClerkId } : "skip"
  );
  const storedSupportWorkspaceId =
    typeof window !== "undefined"
      ? (window.sessionStorage.getItem(
          SUPPORT_WORKSPACE_KEY
        ) as Id<"restaurants"> | null)
      : null;
  const clerkRole =
    typeof clerkUser?.publicMetadata?.role === "string"
      ? clerkUser.publicMetadata.role
      : undefined;
  const isSupportOperator = clerkRole === "SUPER_ADMIN";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const paramWorkspaceId = searchParams.get("supportRestaurantId");
    if (paramWorkspaceId) {
      window.sessionStorage.setItem(SUPPORT_WORKSPACE_KEY, paramWorkspaceId);
    } else if (convexUser?.role !== "SUPER_ADMIN" && !isSupportOperator) {
      window.sessionStorage.removeItem(SUPPORT_WORKSPACE_KEY);
    }
  }, [convexUser?.role, isSupportOperator, searchParams]);

  if (convexUser?.role === "SUPER_ADMIN" || isSupportOperator) {
    const paramWorkspaceId = searchParams.get("supportRestaurantId");
    return (
      (paramWorkspaceId as Id<"restaurants"> | null) ??
      storedSupportWorkspaceId ??
      null
    );
  }

  return (convexUser?.restaurantId ?? null) as Id<"restaurants"> | null;
}
