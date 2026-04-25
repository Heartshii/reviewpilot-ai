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

  // Dashboard: requires OWNER or STAFF
  if (isDashboardRoute(req)) {
    const authResult = await auth();
    const { userId, sessionClaims, redirectToSignIn } = authResult;
    if (!userId) {
      return redirectToSignIn({ returnBackUrl: pathname });
    }
    const role = sessionClaims?.metadata?.role as ReviewPilotRole | undefined;
    // Allow authenticated users if role metadata hasn't been synced to Clerk yet.
    if (role && role !== "OWNER" && role !== "STAFF") {
      return NextResponse.redirect(new URL("/", req.url));
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
    const role = sessionClaims?.metadata?.role as ReviewPilotRole | undefined;
    if (role !== "SUPER_ADMIN") {
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
