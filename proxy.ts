import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { ReviewPilotRole } from "@/types/roles";

const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isKioskRoute = createRouteMatcher(["/kiosk/(.*)"]);
const isPublicRoute = createRouteMatcher([
  "/",
  "/privacy",
  "/terms",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

function readAllowedAdminEmails() {
  return (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function claimToString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function readRoleFromClaims(rawClaims: Record<string, unknown> | undefined) {
  const metadataRole =
    rawClaims?.metadata &&
    typeof rawClaims.metadata === "object" &&
    rawClaims.metadata !== null
      ? claimToString((rawClaims.metadata as Record<string, unknown>).role)
      : undefined;

  const publicMetadataRole =
    rawClaims?.public_metadata &&
    typeof rawClaims.public_metadata === "object" &&
    rawClaims.public_metadata !== null
      ? claimToString(
          (rawClaims.public_metadata as Record<string, unknown>).role
        )
      : undefined;

  return (metadataRole ?? publicMetadataRole) as ReviewPilotRole | undefined;
}

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Allow public routes without authentication
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Kiosk is always public
  if (isKioskRoute(req)) {
    return NextResponse.next();
  }

  // Dashboard: requires authentication.
  // We intentionally do not hard-block by Clerk role metadata here because
  // new users may not have synced metadata yet, and the app itself can guide
  // signed-in users into setup if they do not have a restaurant workspace.
  if (isDashboardRoute(req)) {
    const authResult = await auth();
    const { userId, redirectToSignIn } = authResult;
    if (!userId) {
      return redirectToSignIn({ returnBackUrl: pathname });
    }
    return NextResponse.next();
  }

  // Admin: requires SUPER_ADMIN
  if (isAdminRoute(req)) {
    const authResult = await auth();
    const { userId, sessionClaims, redirectToSignIn } = authResult;
    if (!userId) {
      return redirectToSignIn({ returnBackUrl: pathname });
    }

    const allowedAdminEmails = readAllowedAdminEmails();
    const rawClaims = sessionClaims as Record<string, unknown> | undefined;
    const role = readRoleFromClaims(rawClaims);
    const claimEmail =
      claimToString(rawClaims?.email) ??
      claimToString(rawClaims?.email_address) ??
      claimToString(rawClaims?.primary_email_address);
    const isAllowedAdminEmail =
      !!claimEmail &&
      allowedAdminEmails.includes(claimEmail.trim().toLowerCase());

    if (role !== "SUPER_ADMIN" && !isAllowedAdminEmail) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
