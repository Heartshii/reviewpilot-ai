import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex-server";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim().toLowerCase();

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const convex = getConvexServerClient();
  const data = await convex.query(api.reviews.getPublicTestimonialWidgetBySlug, {
    slug,
  });

  if (!data || data.items.length === 0) {
    return NextResponse.json({ error: "Widget unavailable" }, { status: 404 });
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=900",
    },
  });
}
