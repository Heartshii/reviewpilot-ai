import type { IntegrationProvider, PosProvider, ReservationProvider } from "@/lib/integrations";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type JsonObject = { [key: string]: JsonValue };

function asObject(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function readPath(source: unknown, paths: string[][]) {
  for (const path of paths) {
    let current: unknown = source;
    let failed = false;
    for (const key of path) {
      const obj = asObject(current);
      if (!obj || !(key in obj)) {
        failed = true;
        break;
      }
      current = obj[key];
    }
    if (!failed && current != null && current !== "") {
      return current;
    }
  }

  return undefined;
}

function readString(source: unknown, paths: string[][]) {
  const value = readPath(source, paths);
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function readNumber(source: unknown, paths: string[][]) {
  const value = readPath(source, paths);
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function readTimestamp(source: unknown, paths: string[][]) {
  const raw = readPath(source, paths);
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw > 1_000_000_000_000 ? raw : raw * 1000;
  }
  if (typeof raw === "string" && raw.trim()) {
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) {
      return numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
    }
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function dollarsFromMinorUnits(value: number | undefined) {
  if (value == null) {
    return undefined;
  }
  return Math.max(0, value / 100);
}

export function buildPayloadPreview(payload: unknown) {
  try {
    return JSON.stringify(payload).slice(0, 400);
  } catch {
    return undefined;
  }
}

export function normalizePosWebhookPayload(
  provider: PosProvider,
  payload: unknown
) {
  const externalId =
    readString(payload, [
      ["event_id"],
      ["eventId"],
      ["data", "id"],
      ["data", "object", "order", "id"],
      ["order", "id"],
      ["payload", "id"],
    ]) ?? `${provider.toLowerCase()}-${Date.now()}`;

  const eventType =
    readString(payload, [["type"], ["event_type"], ["eventType"]]) ??
    "order.closed";

  const customerName =
    readString(payload, [
      ["data", "object", "customer", "given_name"],
      ["data", "object", "order", "customer_name"],
      ["order", "customer", "name"],
      ["customer", "name"],
      ["guest", "name"],
    ]) ?? "Imported customer";

  const customerPhone = readString(payload, [
    ["data", "object", "customer", "phone_number"],
    ["data", "object", "order", "phone"],
    ["order", "customer", "phone"],
    ["customer", "phone"],
    ["guest", "phone"],
    ["phone"],
  ]);

  const customerEmail = readString(payload, [
    ["data", "object", "customer", "email_address"],
    ["order", "customer", "email"],
    ["customer", "email"],
    ["guest", "email"],
    ["email"],
  ]);

  const billMinorUnits = readNumber(payload, [
    ["data", "object", "order", "total_money", "amount"],
    ["data", "object", "payment", "amount_money", "amount"],
    ["order", "total_money", "amount"],
    ["order", "amount"],
    ["check", "total"],
    ["payment", "amount"],
  ]);

  const billAmount =
    provider === "TOAST"
      ? dollarsFromMinorUnits(billMinorUnits)
      : billMinorUnits != null && billMinorUnits > 10_000
        ? dollarsFromMinorUnits(billMinorUnits)
        : billMinorUnits;

  const occurredAt =
    readTimestamp(payload, [
      ["data", "object", "order", "closed_at"],
      ["data", "object", "payment", "created_at"],
      ["order", "closedAt"],
      ["closedAt"],
      ["createdAt"],
    ]) ?? Date.now();

  if (!customerPhone) {
    throw new Error("Webhook payload did not include a customer phone number.");
  }

  return {
    externalId,
    eventType,
    customerName,
    customerPhone,
    customerEmail,
    billAmount,
    occurredAt,
    payloadPreview: buildPayloadPreview(payload),
  };
}

function normalizeReservationStatus(value: string | undefined) {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) {
    return "COMPLETED" as const;
  }
  if (
    normalized.includes("CANCEL") ||
    normalized.includes("NO_SHOW") ||
    normalized.includes("DECLINED")
  ) {
    return "CANCELED" as const;
  }
  if (
    normalized.includes("BOOK") ||
    normalized.includes("CONFIRM") ||
    normalized.includes("HOLD")
  ) {
    return "BOOKED" as const;
  }
  if (
    normalized.includes("SEAT") ||
    normalized.includes("ARRIVED") ||
    normalized.includes("IN_PROGRESS")
  ) {
    return "SEATED" as const;
  }
  return "COMPLETED" as const;
}

export function normalizeReservationWebhookPayload(
  provider: ReservationProvider,
  payload: unknown
) {
  const externalId =
    readString(payload, [
      ["reservation", "id"],
      ["booking", "id"],
      ["event_id"],
      ["id"],
    ]) ?? `${provider.toLowerCase()}-${Date.now()}`;

  const eventType =
    readString(payload, [["type"], ["event_type"], ["eventType"]]) ??
    "reservation.completed";

  const customerName =
    readString(payload, [
      ["reservation", "guest_name"],
      ["reservation", "name"],
      ["guest", "name"],
      ["customer", "name"],
      ["name"],
    ]) ?? "Imported guest";

  const customerPhone = readString(payload, [
    ["reservation", "guest_phone"],
    ["reservation", "phone"],
    ["guest", "phone"],
    ["customer", "phone"],
    ["phone"],
  ]);

  const customerEmail = readString(payload, [
    ["reservation", "guest_email"],
    ["reservation", "email"],
    ["guest", "email"],
    ["customer", "email"],
    ["email"],
  ]);

  const partySize = readNumber(payload, [
    ["reservation", "party_size"],
    ["reservation", "covers"],
    ["partySize"],
    ["covers"],
  ]);

  const status = normalizeReservationStatus(
    readString(payload, [
      ["reservation", "status"],
      ["status"],
      ["booking", "status"],
    ])
  );

  const scheduledStartAt = readTimestamp(payload, [
    ["reservation", "start_time"],
    ["reservation", "reservation_time"],
    ["startTime"],
    ["scheduledAt"],
    ["booking", "start_time"],
  ]);

  const completedAt = readTimestamp(payload, [
    ["reservation", "completed_at"],
    ["reservation", "ended_at"],
    ["completedAt"],
    ["endedAt"],
  ]);

  if (!customerPhone) {
    throw new Error("Reservation payload did not include a guest phone number.");
  }

  return {
    externalId,
    eventType,
    reservationStatus: status,
    customerName,
    customerPhone,
    customerEmail,
    partySize,
    scheduledStartAt,
    completedAt,
    payloadPreview: buildPayloadPreview(payload),
  };
}

export function extractSharedSecret(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim();
  }

  return (
    request.headers.get("x-reviewpilot-secret") ??
    request.headers.get("x-webhook-secret") ??
    undefined
  );
}

export function providerFromPath(
  value: string
): IntegrationProvider | null {
  const normalized = value.trim().toUpperCase();
  if (
    normalized === "SQUARE" ||
    normalized === "TOAST" ||
    normalized === "CLOVER" ||
    normalized === "OPENTABLE" ||
    normalized === "RESY"
  ) {
    return normalized;
  }
  return null;
}
