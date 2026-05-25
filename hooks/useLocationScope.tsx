"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel";

type LocationScopeId = "ALL" | Id<"locations">;

type LocationScopeContextValue = {
  locations: Array<Doc<"locations">>;
  selectedLocationId: LocationScopeId;
  selectedLocation: Doc<"locations"> | null;
  setSelectedLocationId: (value: LocationScopeId) => void;
};

const LocationScopeContext = createContext<LocationScopeContextValue | null>(
  null
);

export function LocationScopeProvider({
  restaurantId,
  locations,
  children,
}: {
  restaurantId: Id<"restaurants">;
  locations: Array<Doc<"locations">>;
  children: React.ReactNode;
}) {
  const storageKey = `reviewpilot-location-scope:${restaurantId}`;
  const [storedLocationId, setStoredLocationId] = useState<LocationScopeId>(() => {
    if (typeof window === "undefined") {
      return "ALL";
    }
    const stored = window.localStorage.getItem(storageKey);
    return stored && stored !== "ALL"
      ? (stored as Id<"locations">)
      : "ALL";
  });

  const selectedLocationId: LocationScopeId =
    storedLocationId === "ALL" ||
    locations.some((location) => location._id === storedLocationId)
      ? storedLocationId
      : "ALL";

  useEffect(() => {
    window.localStorage.setItem(storageKey, selectedLocationId);
  }, [selectedLocationId, storageKey]);

  const selectedLocation =
    selectedLocationId === "ALL"
      ? null
      : locations.find((location) => location._id === selectedLocationId) ?? null;

  const value = useMemo(
    () => ({
      locations,
      selectedLocationId,
      selectedLocation,
      setSelectedLocationId: setStoredLocationId,
    }),
    [locations, selectedLocation, selectedLocationId]
  );

  return (
    <LocationScopeContext.Provider value={value}>
      {children}
    </LocationScopeContext.Provider>
  );
}

export function useLocationScope() {
  const context = useContext(LocationScopeContext);
  if (!context) {
    throw new Error("useLocationScope must be used inside LocationScopeProvider");
  }
  return context;
}
