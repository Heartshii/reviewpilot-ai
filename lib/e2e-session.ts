export const E2E_SESSION_COOKIE = "reviewpilot_e2e_session";

export type E2ESession = {
  clerkId: string;
  email: string;
};

function toBase64Url(value: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64url");
  }

  const utf8 = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of utf8) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64url").toString("utf8");
  }

  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const normalized = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function isLocalHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

export function isE2ETestModeAllowed(hostname?: string) {
  return !!hostname && process.env.NODE_ENV !== "production" && isLocalHostname(hostname);
}

export function encodeE2ESession(session: E2ESession) {
  return toBase64Url(JSON.stringify(session));
}

export function decodeE2ESession(rawValue: string | undefined | null) {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(rawValue)) as Partial<E2ESession>;

    if (
      typeof parsed.clerkId !== "string" ||
      typeof parsed.email !== "string" ||
      !parsed.clerkId ||
      !parsed.email
    ) {
      return null;
    }

    return {
      clerkId: parsed.clerkId,
      email: parsed.email,
    } satisfies E2ESession;
  } catch {
    return null;
  }
}

export function readE2ESessionFromCookieString(cookieString: string) {
  const rawValue = cookieString
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${E2E_SESSION_COOKIE}=`))
    ?.slice(E2E_SESSION_COOKIE.length + 1);

  return decodeE2ESession(rawValue);
}
