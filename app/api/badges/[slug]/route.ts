import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const convex = getConvexServerClient();
  const badge = await convex.query(api.leaderboard.getPublicBadgeBySlug, { slug });

  if (!badge) {
    return new NextResponse("Badge unavailable", { status: 404 });
  }

  const name = escapeXml(badge.name);
  const label = escapeXml(badge.badgeLabel);
  const score = escapeXml(`${badge.avgRating} rating`);
  const volume = escapeXml(`${badge.feedbackCount} reviews`);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="640" height="180" viewBox="0 0 640 180" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${name} reputation badge">
  <defs>
    <linearGradient id="bg" x1="36" y1="28" x2="604" y2="152" gradientUnits="userSpaceOnUse">
      <stop stop-color="#08111D"/>
      <stop offset="1" stop-color="#0C1624"/>
    </linearGradient>
    <linearGradient id="accent" x1="92" y1="34" x2="194" y2="146" gradientUnits="userSpaceOnUse">
      <stop stop-color="#34D399"/>
      <stop offset="1" stop-color="#38BDF8"/>
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="620" height="160" rx="28" fill="url(#bg)" stroke="rgba(255,255,255,0.14)"/>
  <circle cx="94" cy="90" r="44" fill="url(#accent)"/>
  <text x="94" y="96" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#07111D">RP</text>
  <text x="156" y="58" font-family="Arial, sans-serif" font-size="12" letter-spacing="2.8" fill="rgba(255,255,255,0.48)">PUBLIC REPUTATION BADGE</text>
  <text x="156" y="92" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#FFFFFF">${name}</text>
  <text x="156" y="120" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.72)">${label}</text>
  <rect x="456" y="42" width="142" height="40" rx="20" fill="rgba(52,211,153,0.12)" stroke="rgba(52,211,153,0.24)"/>
  <text x="527" y="66" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#C8F9E0">${score}</text>
  <rect x="456" y="96" width="142" height="40" rx="20" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)"/>
  <text x="527" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#FFFFFF">${volume}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=900",
    },
  });
}
