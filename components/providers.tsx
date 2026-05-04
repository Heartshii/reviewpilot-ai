"use client";

import { useEnsureUser } from "@/hooks/useEnsureUser";
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
    <ConvexProvider client={convex}>
      <AuthBootstrap />
      {children}
    </ConvexProvider>
  );
}
