"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/convex/_generated/api";
import { CustomerDrawer } from "@/components/CustomerDrawer";
import { IconBadge } from "@/components/ui/premium-icon";
import type { Id } from "@/convex/_generated/dataModel";
import { useIsClient } from "@/hooks/useIsClient";
import { useLocationScope } from "@/hooks/useLocationScope";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { getBusinessLabels, titleCaseLabel } from "@/lib/business-copy";
import { hasFeatureForTier } from "@/lib/billing-plans";

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  return (
    <span className="flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index}>
          {index < full ? "\u2605" : index === full && hasHalf ? "\u00BD" : "\u2606"}
        </span>
      ))}
    </span>
  );
}

function formatTimeAgo(ts: number) {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(ts).toLocaleDateString("en-US");
}

function formatActivityTime(ts: number, mounted: boolean) {
  if (!mounted) {
    return new Date(ts).toLocaleDateString("en-US");
  }
  return formatTimeAgo(ts);
}

const typeColors: Record<string, string> = {
  GOOGLE_REVIEW: "bg-emerald-500/20 text-emerald-400",
  APOLOGY: "bg-amber-500/20 text-amber-400",
  WELCOME: "bg-blue-500/20 text-blue-400",
  BIRTHDAY: "bg-pink-500/20 text-pink-400",
  REENGAGEMENT: "bg-violet-500/20 text-violet-400",
  DEAL: "bg-zinc-500/20 text-zinc-400",
};

function GlowCard({
  children,
  href,
}: {
  children: React.ReactNode;
  href?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [glow, setGlow] = useState({ x: 0, y: 0, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setGlow({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      opacity: 1,
    });
  };

  const inner = (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setGlow((prev) => ({ ...prev, opacity: 0 }))}
      className={`group relative overflow-hidden rounded-[28px] border border-white/8 bg-[#0b1420]/92 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.26)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/14 hover:bg-[#0d1725]/96 hover:shadow-[0_30px_90px_rgba(8,145,178,0.12)] ${
        href ? "cursor-pointer" : ""
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(circle_at_bottom,rgba(52,211,153,0.08),transparent_72%)] opacity-70" />
      <div
        className="pointer-events-none absolute transition-opacity duration-300"
        style={{
          left: glow.x - 110,
          top: glow.y - 110,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(76,201,240,0.14) 0%, rgba(16,185,129,0.12) 34%, transparent 72%)",
          opacity: glow.opacity * 0.9,
        }}
      />
      <div className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-[linear-gradient(90deg,rgba(52,211,153,0.75),rgba(56,189,248,0.72))] transition-transform duration-500 group-hover:scale-x-100" />
      {children}
    </div>
  );

  if (!href) return inner;
  return <Link href={href}>{inner}</Link>;
}

export default function DashboardPage() {
  const restaurantId = useRestaurantId();
  const { selectedLocationId, selectedLocation } = useLocationScope();
  const locationId =
    selectedLocationId === "ALL" ? undefined : selectedLocationId;
  const stats = useQuery(
    api.queries.getDashboardStats,
    restaurantId ? { restaurantId, locationId } : "skip"
  );
  const activity = useQuery(
    api.queries.getRecentActivity,
    restaurantId ? { restaurantId, locationId } : "skip"
  );
  const customers = useQuery(
    api.queries.getCustomers,
    restaurantId ? { restaurantId, locationId } : "skip"
  );
  const restaurant = useQuery(
    api.queries.getRestaurant,
    restaurantId ? { restaurantId } : "skip"
  );
  const insightsSnapshot = useQuery(
    api.queries.getAiInsightsSnapshot,
    restaurantId ? { restaurantId, locationId } : "skip"
  );
  type ActivityRow = NonNullable<typeof activity>[number];
  type CustomerRow = NonNullable<typeof customers>[number];
  const [drawerId, setDrawerId] = useState<Id<"customers"> | null>(null);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const isClient = useIsClient();
  const smsHistory = useQuery(
    api.queries.getCustomerSmsHistory,
    restaurantId && drawerId
      ? { restaurantId, customerId: drawerId, locationId }
      : "skip"
  );
  const receiptHistory = useQuery(
    api.queries.getCustomerReceiptHistory,
    restaurantId && drawerId
      ? { restaurantId, customerId: drawerId, locationId }
      : "skip"
  );

  if (!restaurantId) return null;

  if (
    stats === undefined ||
    activity === undefined ||
    insightsSnapshot === undefined
  ) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-emerald-500/60" />
          <p className="text-xs text-white/20">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const labels = getBusinessLabels(restaurant?.businessType);
  const canSeeAiInsights = restaurant
    ? hasFeatureForTier(restaurant.tier, "aiInsights")
    : false;
  const estimatedReviewRate = insightsSnapshot.reviewConversionRate;

  const insights: Array<{
    icon:
      | "rocket"
      | "alert"
      | "trendDown"
      | "spark"
      | "trendUp"
      | "clock"
      | "reviews"
      | "message"
      | "flash"
      | "spend"
      | "repeat";
    text: string;
    tone: string;
    href: string;
    actionLabel: string;
  }> = [];

  if (insightsSnapshot.totalCustomers === 0) {
    insights.push({
      icon: "rocket",
      text: `No ${labels.customerLabelPlural} have checked in yet. Start with the kiosk or QR flow so ReviewPilot has real data to optimize.`,
      tone:
        "border-sky-400/16 bg-[linear-gradient(180deg,rgba(8,17,29,0.96),rgba(10,23,39,0.88))] text-sky-100",
      href: "/dashboard/settings",
      actionLabel: "Open kiosk setup",
    });
  }

  if (insightsSnapshot.pendingApprovals > 0) {
    insights.push({
      icon: "alert",
      text: `${insightsSnapshot.pendingApprovals} recovery message${insightsSnapshot.pendingApprovals === 1 ? " is" : "s are"} waiting for approval. Clearing them quickly improves save-rate with unhappy ${labels.customerLabelPlural}.`,
      tone:
        "border-amber-400/16 bg-[linear-gradient(180deg,rgba(8,17,29,0.96),rgba(24,18,10,0.88))] text-amber-100",
      href: "/dashboard/reviews",
      actionLabel: "Open approval queue",
    });
  }

  if (insightsSnapshot.averageCurrentWeekRating > 0) {
    insights.push(
      insightsSnapshot.averageCurrentWeekRating < 4
        ? {
            icon: "trendDown",
            text: `Average rating dipped to ${insightsSnapshot.averageCurrentWeekRating.toFixed(1)} this week. Review recent feedback before more low experiences stack up.`,
            tone:
              "border-amber-400/16 bg-[linear-gradient(180deg,rgba(8,17,29,0.96),rgba(24,18,10,0.88))] text-amber-100",
            href: "/dashboard/reviews",
            actionLabel: "Inspect recent feedback",
          }
        : {
            icon: "spark",
            text: `Strong week at ${insightsSnapshot.averageCurrentWeekRating.toFixed(1)}\u2605. This is a good time to push more happy ${labels.customerLabelPlural} toward public reviews.`,
            tone:
              "border-emerald-400/16 bg-[linear-gradient(180deg,rgba(8,17,29,0.96),rgba(10,28,23,0.88))] text-emerald-100",
            href: "/dashboard/sms",
            actionLabel: "Launch a review push",
          }
    );
  }

  if (insightsSnapshot.currentWeekNewCustomers > 0) {
    insights.push({
      icon: "trendUp",
      text: `${insightsSnapshot.currentWeekNewCustomers} new ${labels.customerLabelPlural} joined this week. Consider a welcome or return-offer campaign while they still remember the visit.`,
      tone:
        "border-emerald-400/16 bg-[linear-gradient(180deg,rgba(8,17,29,0.96),rgba(10,28,23,0.88))] text-emerald-100",
      href: "/dashboard/sms",
      actionLabel: "Open campaign builder",
    });
  }

  if (insightsSnapshot.inactiveCount > 0) {
    insights.push({
      icon: "clock",
      text: `${insightsSnapshot.inactiveCount} ${labels.customerLabelPlural} are inactive right now. Re-engagement SMS can bring back people who already know the business.`,
      tone:
        "border-violet-400/16 bg-[linear-gradient(180deg,rgba(8,17,29,0.96),rgba(20,14,33,0.88))] text-violet-100",
      href: "/dashboard/sms",
      actionLabel: "Build a comeback campaign",
    });
  }

  if (insightsSnapshot.loyalCount > 0) {
    insights.push({
      icon: "reviews",
      text: `${insightsSnapshot.loyalCount} loyal ${labels.customerLabelPlural} have 5+ ${labels.visitLabelPlural}. They are strong candidates for VIP deals, referral asks, or review pushes.`,
      tone:
        "border-emerald-400/16 bg-[linear-gradient(180deg,rgba(8,17,29,0.96),rgba(10,28,23,0.88))] text-emerald-100",
      href: "/dashboard/loyalty",
      actionLabel: "Open loyalty workspace",
    });
  }

  if (insightsSnapshot.atRiskCount > 0) {
    insights.push({
      icon: "alert",
      text: `${insightsSnapshot.atRiskCount} ${labels.customerLabelPlural} are currently marked at risk. Fast follow-up matters most here.`,
      tone:
        "border-red-400/16 bg-[linear-gradient(180deg,rgba(8,17,29,0.96),rgba(35,13,17,0.88))] text-red-100",
      href: "/dashboard/reviews",
      actionLabel: "Recover at-risk customers",
    });
  }

  if (insightsSnapshot.smsSentThisMonth > 0) {
    insights.push({
      icon: "message",
      text:
        estimatedReviewRate > 0
          ? `${insightsSnapshot.smsSentThisMonth} SMS sent this month with about ${estimatedReviewRate}% reaching the Google review step.`
          : `${insightsSnapshot.smsSentThisMonth} SMS sent this month. Your follow-up funnel is active, but public review clicks still need momentum.`,
      tone:
        "border-sky-400/16 bg-[linear-gradient(180deg,rgba(8,17,29,0.96),rgba(11,21,36,0.88))] text-sky-100",
      href: "/dashboard/sms",
      actionLabel: "Review message performance",
    });
  }

  if (insightsSnapshot.smsUsagePercent >= 80) {
    insights.push({
      icon: "flash",
      text: `You have used about ${insightsSnapshot.smsUsagePercent}% of this month's SMS allowance. Watch usage so campaigns do not stall late in the cycle.`,
      tone:
        "border-amber-400/16 bg-[linear-gradient(180deg,rgba(8,17,29,0.96),rgba(24,18,10,0.88))] text-amber-100",
      href: "/dashboard/billing",
      actionLabel: "Review plan usage",
    });
  }

  if (insightsSnapshot.averageSpendPerTrackedCustomer > 0) {
    insights.push({
      icon: "spend",
      text: `Average tracked spend is $${insightsSnapshot.averageSpendPerTrackedCustomer.toFixed(2)} per ${labels.customerLabel}. That helps position loyalty and return offers around real value.`,
      tone:
        "border-white/10 bg-[linear-gradient(180deg,rgba(8,17,29,0.96),rgba(10,17,27,0.88))] text-white/78",
      href: "/dashboard/loyalty",
      actionLabel: "Create a spend-based reward",
    });
  }

  if (insightsSnapshot.averageVisits >= 2) {
    insights.push({
      icon: "repeat",
      text: `Average repeat frequency is ${insightsSnapshot.averageVisits.toFixed(1)} ${labels.visitLabelPlural} per ${labels.customerLabel}. Repeat behavior is forming, so retention messaging has leverage.`,
      tone:
        "border-white/10 bg-[linear-gradient(180deg,rgba(8,17,29,0.96),rgba(10,17,27,0.88))] text-white/78",
      href: "/dashboard/customers",
      actionLabel: "Review repeat customers",
    });
  }

  insights.push({
    icon: "spark",
    text: `Tip: Respond to negative feedback within 24 hours to recover the ${labels.customerLabel} before they disengage.`,
    tone:
      "border-white/10 bg-[linear-gradient(180deg,rgba(8,17,29,0.96),rgba(10,17,27,0.88))] text-white/78",
    href: "/dashboard/reviews",
    actionLabel: "Open recovery workflow",
  });

  const fallbackInsights = [
    {
      icon: "leaderboard" as const,
      text: `Promoter mix is one of the fastest ways to spot which ${labels.customerLabelPlural} are ready for public proof and review asks.`,
      tone:
        "border-white/10 bg-[linear-gradient(180deg,rgba(8,17,29,0.96),rgba(10,20,31,0.88))] text-white/78",
      href: "/dashboard/leaderboard",
      actionLabel: "Open public proof",
    },
    {
      icon: "shield" as const,
      text: `Use the recovery queue as a daily guardrail so low ratings never sit unaddressed for more than one shift.`,
      tone:
        "border-white/10 bg-[linear-gradient(180deg,rgba(8,17,29,0.96),rgba(10,20,31,0.88))] text-white/78",
      href: "/dashboard/reviews",
      actionLabel: "Review daily recovery",
    },
  ];
  const featuredInsight = insights[0];
  const secondaryInsights = [...insights.slice(1), ...fallbackInsights].slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-white/30">
          Your {labels.businessLabel} performance at a glance
        </p>
        <p className="mt-2 text-xs text-white/24">
          Scope: {selectedLocation?.name ?? "All locations"}
        </p>
      </div>

      {stats.pendingApprovals > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-amber-200">
              <span className="font-semibold">{stats.pendingApprovals}</span>{" "}
              {stats.pendingApprovals === 1
                ? "message is waiting for approval"
                : "messages are waiting for approval"}
            </span>
            <Link
              href="/dashboard/reviews"
              className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-200"
            >
              Review now
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GlowCard href="/dashboard/customers">
          <p className="text-xs font-medium uppercase tracking-widest text-white/30">
            Total {titleCaseLabel(labels.customerLabelPlural)}
          </p>
          <p className="mt-3 text-4xl font-light tabular-nums text-white">
            {stats.totalCustomers}
          </p>
          {stats.customersChangeThisWeek > 0 && (
            <p className="mt-2 text-xs text-emerald-400">
              +{stats.customersChangeThisWeek} this week
            </p>
          )}
        </GlowCard>

        <GlowCard href="/dashboard/sms">
          <p className="text-xs font-medium uppercase tracking-widest text-white/30">
            SMS This Month
          </p>
          <p className="mt-3 text-4xl font-light tabular-nums text-white">
            {stats.smsSentThisMonth}
            <span className="ml-1 text-lg text-white/20">
              / {stats.smsLimit}
            </span>
          </p>
        </GlowCard>

        <GlowCard href="/dashboard/reviews">
          <p className="text-xs font-medium uppercase tracking-widest text-white/30">
            Avg Rating
          </p>
          <div className="mt-3">
            {stats.avgRatingThisWeek > 0 ? (
              <>
                <p className="text-4xl font-light tabular-nums text-white">
                  {stats.avgRatingThisWeek.toFixed(1)}
                </p>
                <div className="mt-2">
                  <Stars rating={stats.avgRatingThisWeek} />
                </div>
              </>
            ) : (
              <p className="text-4xl font-light text-white/20">-</p>
            )}
          </div>
          <p className="mt-1 text-xs text-white/20">This week</p>
        </GlowCard>

        <GlowCard href="/dashboard/reviews">
          <p className="text-xs font-medium uppercase tracking-widest text-white/30">
            Google Links
          </p>
          <p className="mt-3 text-4xl font-light tabular-nums text-emerald-400">
            {stats.googleLinksClicked}
          </p>
          <p className="mt-2 text-xs text-white/20">
            Estimated reviews generated
          </p>
        </GlowCard>
      </div>

      {canSeeAiInsights ? (
        <GlowCard>
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                {"\u2726"}
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">AI Insights</p>
                <p className="text-xs text-white/30">
                  Decision support derived from ratings, retention, spend, and message activity
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Link
                href="/dashboard/reviews"
                className="rounded-[24px] border border-white/8 bg-[#0a131f]/94 p-4 transition-colors hover:border-emerald-400/14 hover:bg-[#0d1725]/96"
              >
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/28">
                  Rating momentum
                </p>
                <p className="mt-3 font-display text-[1.8rem] font-semibold tracking-[-0.05em] text-white">
                  {stats.avgRatingThisWeek > 0
                    ? stats.avgRatingThisWeek.toFixed(1)
                    : "--"}
                </p>
                <p
                  className={`mt-2 text-xs ${
                    insightsSnapshot.ratingDelta > 0
                      ? "text-emerald-300"
                      : insightsSnapshot.ratingDelta < 0
                        ? "text-amber-200"
                        : "text-white/35"
                  }`}
                >
                  {insightsSnapshot.averagePreviousWeekRating > 0
                    ? `${insightsSnapshot.ratingDelta >= 0 ? "+" : ""}${insightsSnapshot.ratingDelta.toFixed(1)} vs last week`
                    : "No prior-week benchmark yet"}
                </p>
              </Link>

              <Link
                href="/dashboard/sms"
                className="rounded-[24px] border border-white/8 bg-[#0a131f]/94 p-4 transition-colors hover:border-emerald-400/14 hover:bg-[#0d1725]/96"
              >
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/28">
                  Retention pressure
                </p>
                <p className="mt-3 font-display text-[1.8rem] font-semibold tracking-[-0.05em] text-white">
                  {insightsSnapshot.inactiveCount}
                </p>
                <p className="mt-2 text-xs text-white/38">
                  inactive {labels.customerLabelPlural}
                </p>
              </Link>

              <Link
                href="/dashboard/sms"
                className="rounded-[24px] border border-white/8 bg-[#0a131f]/94 p-4 transition-colors hover:border-emerald-400/14 hover:bg-[#0d1725]/96"
              >
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/28">
                  Funnel health
                </p>
                <p className="mt-3 font-display text-[1.8rem] font-semibold tracking-[-0.05em] text-white">
                  {insightsSnapshot.reviewConversionRate}%
                </p>
                <p className="mt-2 text-xs text-white/38">
                  review-step reach this month
                </p>
              </Link>

              <Link
                href={
                  insightsSnapshot.recommendedSegment === "ATRISK"
                    ? "/dashboard/reviews"
                    : "/dashboard/sms"
                }
                className="rounded-[24px] border border-white/8 bg-[#0a131f]/94 p-4 transition-colors hover:border-emerald-400/14 hover:bg-[#0d1725]/96"
              >
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/28">
                  Recommended next move
                </p>
                <p className="mt-3 text-base font-semibold text-white">
                  {insightsSnapshot.recommendationTitle}
                </p>
                <p className="mt-2 text-xs text-emerald-300">
                  {insightsSnapshot.recommendedSegment === "ATRISK"
                    ? "Open recovery queue"
                    : "Open SMS Center"}
                </p>
              </Link>
            </div>

            {featuredInsight && (
              <Link
                href={featuredInsight.href}
                className="group block rounded-[32px] border border-white/8 bg-[#0a131f]/96 p-6 shadow-[0_28px_80px_rgba(2,6,23,0.26)] transition-colors hover:border-emerald-300/14"
              >
                <div className="flex items-start gap-4">
                  <IconBadge
                    name={featuredInsight.icon}
                    className="h-14 w-14 shrink-0 border-white/10 bg-white/[0.04] text-white/82"
                    iconClassName="h-6 w-6"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-white/42">
                        Priority signal
                      </p>
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/58">
                        AI guided
                      </span>
                    </div>
                    <p className="mt-4 max-w-4xl font-display text-[1.35rem] font-semibold leading-[1.24] tracking-[-0.04em] text-white sm:text-[1.55rem]">
                      {featuredInsight.text}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">
                    Why this matters
                  </p>
                  <p className="mt-3 text-sm leading-7 text-white/56">
                    This is the strongest next move in the workspace based on live ratings, repeat behavior, current outreach volume, and the current recovery load.
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    {
                      label: "Inactive customers",
                      value: insightsSnapshot.inactiveCount,
                      note: "ready for comeback messaging",
                    },
                    {
                      label: "Loyal customers",
                      value: insightsSnapshot.loyalCount,
                      note: "strong audience for VIP or review asks",
                    },
                    {
                      label: "At-risk customers",
                      value: insightsSnapshot.atRiskCount,
                      note: "need recovery attention first",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-4 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4"
                    >
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">
                          {item.label}
                        </p>
                        <p className="mt-1 text-xs text-white/40">{item.note}</p>
                      </div>
                      <p className="font-display text-[1.55rem] font-semibold tracking-[-0.05em] text-white">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">
                    Suggested next action
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-white/78">
                    {featuredInsight.actionLabel}
                    <span className="text-emerald-300">-&gt;</span>
                  </div>
                </div>
              </Link>
            )}

            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {secondaryInsights.map((insight) => (
                <Link
                  key={insight.text}
                  href={insight.href}
                  className="group rounded-[26px] border border-white/8 bg-[#0a131f]/94 px-4 py-4 text-sm shadow-[0_20px_50px_rgba(2,6,23,0.18)] transition-colors hover:border-emerald-400/14 hover:bg-[#0d1725]/96"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <IconBadge
                        name={insight.icon}
                        className="h-11 w-11 shrink-0 border-white/10 bg-black/12 text-white/78"
                        iconClassName="h-[18px] w-[18px]"
                      />
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                          Suggested move
                        </p>
                        <p className="mt-2 leading-7 text-white/88">
                          {insight.text}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-white/30 transition-transform group-hover:translate-x-0.5">
                      -&gt;
                    </span>
                  </div>
                  <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-300">
                    {insight.actionLabel}
                  </p>
                </Link>
              ))}
            </div>

            <div className="space-y-4">
              <div className="rounded-[28px] border border-white/8 bg-[#0a131f]/94 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.22)]">
                <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                  Weekly trend
                </p>
                <p className="mt-2 text-sm text-white/55">
                  New {labels.customerLabelPlural} and feedback volume over the last 6 weeks
                </p>
                <div className="mt-5 h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={insightsSnapshot.weeklyTrend}>
                      <CartesianGrid
                        stroke="rgba(255,255,255,0.06)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.03)" }}
                        contentStyle={{
                          background: "#09111d",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "16px",
                          color: "#e5eef9",
                        }}
                      />
                      <Bar
                        dataKey="newCustomers"
                        fill="rgba(52,211,153,0.82)"
                        radius={[8, 8, 0, 0]}
                        name="New customers"
                      />
                      <Bar
                        dataKey="feedback"
                        fill="rgba(56,189,248,0.72)"
                        radius={[8, 8, 0, 0]}
                        name="Feedback"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/8 bg-[#0a131f]/94 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.22)]">
                <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                  Rating signal
                </p>
                <p className="mt-2 text-sm text-white/55">
                  Weekly average rating over the last 6 weeks
                </p>
                <div className="mt-5 h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={insightsSnapshot.weeklyTrend}>
                      <CartesianGrid
                        stroke="rgba(255,255,255,0.06)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 5]}
                        width={24}
                        tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ stroke: "rgba(255,255,255,0.08)" }}
                        contentStyle={{
                          background: "#09111d",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "16px",
                          color: "#e5eef9",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="rating"
                        stroke="#34d399"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#34d399" }}
                        activeDot={{ r: 5 }}
                        name="Average rating"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[28px] border border-white/8 bg-[#0a131f]/94 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.22)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                      CSAT score
                    </p>
                    <p className="mt-2 text-sm text-white/55">
                      Percent of customers rating the experience 4 star or 5 star
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-semibold text-white">
                      {insightsSnapshot.currentWeekCsat}%
                    </p>
                    <p
                      className={`mt-1 text-xs ${
                        insightsSnapshot.csatDelta > 0
                          ? "text-emerald-300"
                          : insightsSnapshot.csatDelta < 0
                            ? "text-amber-200"
                            : "text-white/35"
                      }`}
                    >
                      {insightsSnapshot.previousWeekCsat > 0
                        ? `${insightsSnapshot.csatDelta >= 0 ? "+" : ""}${insightsSnapshot.csatDelta}% vs last week`
                        : "No prior-week benchmark yet"}
                    </p>
                  </div>
                </div>
                <div className="mt-5 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={insightsSnapshot.weeklyTrend}>
                      <CartesianGrid
                        stroke="rgba(255,255,255,0.06)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        width={26}
                        tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ stroke: "rgba(255,255,255,0.08)" }}
                        contentStyle={{
                          background: "#09111d",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "16px",
                          color: "#e5eef9",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="csat"
                        stroke="#4cc9f0"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#4cc9f0" }}
                        activeDot={{ r: 5 }}
                        name="CSAT %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/8 bg-[#0a131f]/94 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.22)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                      NPS-style signal
                    </p>
                    <p className="mt-2 text-sm text-white/55">
                      5 star counts as promoter, 4 star passive, 1 to 3 star detractor
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-semibold text-white">
                      {insightsSnapshot.currentWeekNps}
                    </p>
                    <p
                      className={`mt-1 text-xs ${
                        insightsSnapshot.npsDelta > 0
                          ? "text-emerald-300"
                          : insightsSnapshot.npsDelta < 0
                            ? "text-amber-200"
                            : "text-white/35"
                      }`}
                    >
                      {insightsSnapshot.previousWeekNps !== 0 ||
                      insightsSnapshot.currentWeekNps !== 0
                        ? `${insightsSnapshot.npsDelta >= 0 ? "+" : ""}${insightsSnapshot.npsDelta} vs last week`
                        : "No prior-week benchmark yet"}
                    </p>
                  </div>
                </div>
                <div className="mt-5 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={insightsSnapshot.weeklyTrend}>
                      <CartesianGrid
                        stroke="rgba(255,255,255,0.06)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[-100, 100]}
                        width={28}
                        tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ stroke: "rgba(255,255,255,0.08)" }}
                        contentStyle={{
                          background: "#09111d",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "16px",
                          color: "#e5eef9",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="nps"
                        stroke="#34d399"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#34d399" }}
                        activeDot={{ r: 5 }}
                        name="NPS-style"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[24px] border border-white/8 bg-[#0a131f]/94 p-4">
                <div className="flex items-center gap-3">
                  <IconBadge
                    name="loyalty"
                    className="h-10 w-10 border-white/10 bg-white/[0.03] text-white/72"
                    iconClassName="h-[17px] w-[17px]"
                  />
                  <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                    Loyalty base
                  </p>
                </div>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {insightsSnapshot.loyalCount}
                </p>
                <p className="mt-1 text-sm text-white/42">
                  loyal {labels.customerLabelPlural} ready for review or VIP asks
                </p>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-[#0a131f]/94 p-4">
                <div className="flex items-center gap-3">
                  <IconBadge
                    name="alert"
                    className="h-10 w-10 border-white/10 bg-white/[0.03] text-white/72"
                    iconClassName="h-[17px] w-[17px]"
                  />
                  <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                    At-risk count
                  </p>
                </div>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {insightsSnapshot.atRiskCount}
                </p>
                <p className="mt-1 text-sm text-white/42">
                  {labels.customerLabelPlural} needing recovery attention
                </p>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-[#0a131f]/94 p-4">
                <div className="flex items-center gap-3">
                  <IconBadge
                    name="message"
                    className="h-10 w-10 border-white/10 bg-white/[0.03] text-white/72"
                    iconClassName="h-[17px] w-[17px]"
                  />
                  <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                    Lifecycle sends
                  </p>
                </div>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {insightsSnapshot.reengagementSentThisMonth +
                    insightsSnapshot.birthdaySentThisMonth}
                </p>
                <p className="mt-1 text-sm text-white/42">
                  birthday + re-engagement SMS sent this month
                </p>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-[#0a131f]/94 p-4">
                <div className="flex items-center gap-3">
                  <IconBadge
                    name="spend"
                    className="h-10 w-10 border-white/10 bg-white/[0.03] text-white/72"
                    iconClassName="h-[17px] w-[17px]"
                  />
                  <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                    Tracked spend
                  </p>
                </div>
                <p className="mt-2 text-3xl font-semibold text-white">
                  ${insightsSnapshot.trackedSpend.toFixed(0)}
                </p>
                <p className="mt-1 text-sm text-white/42">
                  recorded customer spend in this workspace
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/8 bg-[#0a131f]/94 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.22)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                    Promoter mix
                  </p>
                  <p className="mt-1 text-sm text-white/42">
                    Based on the last 30 days of private feedback.
                  </p>
                </div>
                <Link
                  href="/dashboard/reviews"
                  className="text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-300"
                >
                  Open feedback
                </Link>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-white/48">
                    <span>Promoters</span>
                    <span>{insightsSnapshot.promoters30d}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-white/6">
                    <div
                      className="h-2 rounded-full bg-emerald-400"
                      style={{
                        width: `${
                          insightsSnapshot.promoters30d +
                            insightsSnapshot.passives30d +
                            insightsSnapshot.detractors30d >
                          0
                            ? (insightsSnapshot.promoters30d /
                                (insightsSnapshot.promoters30d +
                                  insightsSnapshot.passives30d +
                                  insightsSnapshot.detractors30d)) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-white/48">
                    <span>Passives</span>
                    <span>{insightsSnapshot.passives30d}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-white/6">
                    <div
                      className="h-2 rounded-full bg-sky-400"
                      style={{
                        width: `${
                          insightsSnapshot.promoters30d +
                            insightsSnapshot.passives30d +
                            insightsSnapshot.detractors30d >
                          0
                            ? (insightsSnapshot.passives30d /
                                (insightsSnapshot.promoters30d +
                                  insightsSnapshot.passives30d +
                                  insightsSnapshot.detractors30d)) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-white/48">
                    <span>Detractors</span>
                    <span>{insightsSnapshot.detractors30d}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-white/6">
                    <div
                      className="h-2 rounded-full bg-amber-400"
                      style={{
                        width: `${
                          insightsSnapshot.promoters30d +
                            insightsSnapshot.passives30d +
                            insightsSnapshot.detractors30d >
                          0
                            ? (insightsSnapshot.detractors30d /
                                (insightsSnapshot.promoters30d +
                                  insightsSnapshot.passives30d +
                                  insightsSnapshot.detractors30d)) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </GlowCard>
      ) : (
        <GlowCard href="/dashboard/billing">
          <p className="text-sm font-medium text-white/80">AI Insights</p>
          <p className="mt-2 text-sm leading-7 text-white/48">
            AI Insights is included on the Agency plan. Upgrade to unlock
            live risk flags, trend signals, and smarter owner guidance.
          </p>
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">
            Upgrade in Billing
          </p>
        </GlowCard>
      )}

      <GlowCard>
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowAllActivity((current) => !current)}
            className="text-left text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            Recent Activity
            {activity.length > 6 && (
              <span className="ml-2 text-white/35">
                {showAllActivity
                  ? `(showing all ${activity.length})`
                  : `(showing 6 of ${activity.length})`}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowAllActivity((current) => !current)}
            className="text-xs text-emerald-500/50 transition-colors hover:text-emerald-400"
          >
            {activity.length > 6
              ? showAllActivity
                ? "Show less"
                : "Show all"
              : "Latest"}
          </button>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {activity.length === 0 ? (
            <div className="py-8 text-center text-sm text-white/20">
              No activity yet
            </div>
          ) : (
            (showAllActivity ? activity : activity.slice(0, 6)).map(
              (item: ActivityRow) => {
                const isFailed = item.status === "FAILED";
                const rowContent = (
                  <>
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${isFailed ? "bg-red-400/70" : "bg-white/20"}`}
                      />
                      <span className="text-sm font-medium text-white/80">
                        {item.customerName}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs ${
                          typeColors[item.smsType] ?? "bg-zinc-600/20"
                        }`}
                      >
                        {item.smsType.replace("_", " ")}
                      </span>
                      {isFailed && (
                        <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs text-red-300">
                          Failed
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-white/20">
                      {formatActivityTime(item.sentAt, isClient)}
                    </span>
                  </>
                );

                if (isFailed) {
                  return (
                    <Link
                      key={item._id}
                      href="/dashboard/sms?tab=history&status=FAILED"
                      className="flex items-center justify-between py-3 transition-colors hover:bg-white/[0.02]"
                    >
                      {rowContent}
                    </Link>
                  );
                }

                return (
                  <div
                    key={item._id}
                    className="flex items-center justify-between py-3 transition-colors hover:bg-white/[0.02]"
                  >
                    {rowContent}
                  </div>
                );
              }
            )
          )}
        </div>
      </GlowCard>

      <GlowCard>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-white/70">
            Recent {titleCaseLabel(labels.customerLabelPlural)}
          </p>
          <Link
            href="/dashboard/customers"
            className="text-xs text-emerald-500/50 hover:text-emerald-400"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {customers && customers.length === 0 ? (
            <div className="py-8 text-center text-sm text-white/20">
              No {labels.customerLabelPlural} yet
            </div>
          ) : (
            (customers ?? [])
              .sort(
                (a: CustomerRow, b: CustomerRow) =>
                  (b.lastVisitAt ?? 0) - (a.lastVisitAt ?? 0)
              )
              .slice(0, 8)
              .map((customer: CustomerRow) => (
                <button
                  key={customer._id}
                  type="button"
                  onClick={() => setDrawerId(customer._id)}
                  className="flex w-full items-center justify-between py-3 text-left transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                    <span className="text-sm font-medium text-white/80">
                      {customer.name}
                    </span>
                    <span className="text-xs text-white/30">
                      {customer.visitCount} {labels.visitLabelPlural}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-emerald-400">
                      {customer.points} pts
                    </p>
                    <p className="text-xs text-white/20">
                      {customer.lastVisitAt
                        ? formatActivityTime(customer.lastVisitAt, isClient)
                        : "Never"}
                    </p>
                  </div>
                </button>
              ))
          )}
        </div>
      </GlowCard>

      {drawerId && customers && (
        <CustomerDrawer
          customer={
            customers.find((customer: CustomerRow) => customer._id === drawerId)!
          }
          smsHistory={smsHistory ?? []}
          receiptHistory={receiptHistory ?? []}
          restaurantId={restaurantId}
          onClose={() => setDrawerId(null)}
          isLoadingSms={smsHistory === undefined}
          isLoadingReceipts={receiptHistory === undefined}
        />
      )}
    </div>
  );
}
