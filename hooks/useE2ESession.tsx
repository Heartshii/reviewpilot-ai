"use client";

import { createContext, useContext } from "react";
import type { E2ESession } from "@/lib/e2e-session";

const E2ESessionContext = createContext<E2ESession | null>(null);

export function E2ESessionProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: E2ESession | null;
}) {
  return (
    <E2ESessionContext.Provider value={value}>
      {children}
    </E2ESessionContext.Provider>
  );
}

export function useE2ESession() {
  const session = useContext(E2ESessionContext);
  return {
    session,
    isLoaded: true,
  };
}
