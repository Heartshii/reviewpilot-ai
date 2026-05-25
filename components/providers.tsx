"use client";

import { useEnsureUser } from "@/hooks/useEnsureUser";
import { E2ESessionProvider } from "@/hooks/useE2ESession";
import type { E2ESession } from "@/lib/e2e-session";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);

function AuthBootstrap() {
  useEnsureUser();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ProvidersWithSession initialE2ESession={null}>{children}</ProvidersWithSession>
  );
}

export function ProvidersWithSession({
  children,
  initialE2ESession,
}: {
  children: React.ReactNode;
  initialE2ESession: E2ESession | null;
}) {
  return (
    <ConvexProvider client={convex}>
      <E2ESessionProvider value={initialE2ESession}>
        <AuthBootstrap />
        {children}
      </E2ESessionProvider>
    </ConvexProvider>
  );
}
