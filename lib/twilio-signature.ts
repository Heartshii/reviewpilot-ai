import { createHmac } from "node:crypto";

export function signTwilioPayload(args: {
  requestUrl: string;
  authToken: string;
  payload: Record<string, string>;
}) {
  const sortedEntries = Object.entries(args.payload).sort(([left], [right]) =>
    left.localeCompare(right)
  );
  const message = `${args.requestUrl}${sortedEntries
    .map(([key, value]) => `${key}${value}`)
    .join("")}`;

  return createHmac("sha1", args.authToken)
    .update(message, "utf8")
    .digest("base64");
}

export function isValidTwilioSignature(args: {
  requestUrl: string;
  authToken: string;
  signature: string | null;
  payload: Record<string, string>;
}) {
  if (!args.signature) {
    return false;
  }

  const expectedSignature = signTwilioPayload({
    requestUrl: args.requestUrl,
    authToken: args.authToken,
    payload: args.payload,
  });

  return expectedSignature === args.signature;
}
