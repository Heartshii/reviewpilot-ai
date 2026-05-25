export const POS_PROVIDERS = ["SQUARE", "TOAST", "CLOVER"] as const;
export const RESERVATION_PROVIDERS = ["OPENTABLE", "RESY"] as const;

export type PosProvider = (typeof POS_PROVIDERS)[number];
export type ReservationProvider = (typeof RESERVATION_PROVIDERS)[number];
export type IntegrationProvider = PosProvider | ReservationProvider;
export type IntegrationCategory = "POS" | "RESERVATIONS";

export const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  SQUARE: "Square",
  TOAST: "Toast",
  CLOVER: "Clover",
  OPENTABLE: "OpenTable",
  RESY: "Resy",
};

export const INTEGRATION_CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  POS: "POS receipts",
  RESERVATIONS: "Reservations",
};

export const PROVIDER_DESCRIPTIONS: Record<IntegrationProvider, string> = {
  SQUARE: "Pull closed tickets into ReviewPilot so spend, points, and follow-up SMS stay current.",
  TOAST: "Capture guest spend from your Toast service flow and remove manual receipt entry.",
  CLOVER: "Sync purchase totals from Clover and turn real spend into loyalty points automatically.",
  OPENTABLE:
    "Trigger post-visit review follow-up from completed reservations without waiting for kiosk check-ins.",
  RESY: "Use reservation completions to automatically start the review funnel after the visit window closes.",
};

export const DEFAULT_POS_IMPORT_DELAY_MINUTES = 60;
export const DEFAULT_RESERVATION_DELAY_MINUTES = 120;

export function getCategoryForProvider(
  provider: IntegrationProvider
): IntegrationCategory {
  return POS_PROVIDERS.includes(provider as PosProvider)
    ? "POS"
    : "RESERVATIONS";
}

export function isPosProvider(provider: string): provider is PosProvider {
  return POS_PROVIDERS.includes(provider as PosProvider);
}

export function isReservationProvider(
  provider: string
): provider is ReservationProvider {
  return RESERVATION_PROVIDERS.includes(provider as ReservationProvider);
}

export function makeIntegrationToken(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function formatIntegrationPath(args: {
  provider: IntegrationProvider;
  token: string;
}) {
  const category = getCategoryForProvider(args.provider);
  const section = category === "POS" ? "pos" : "reservations";
  return `/api/integrations/${section}/${args.provider.toLowerCase()}/${args.token}`;
}

export function clampCurrencyAmount(value: number | undefined) {
  if (!Number.isFinite(value ?? NaN)) {
    return 0;
  }
  return Math.max(0, Math.min(100_000, Number(value ?? 0)));
}
