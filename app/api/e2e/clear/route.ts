import { NextResponse } from "next/server";
import {
  E2E_SESSION_COOKIE,
  isE2ETestModeAllowed,
} from "@/lib/e2e-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!isE2ETestModeAllowed(url.hostname)) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(E2E_SESSION_COOKIE);
  return response;
}
