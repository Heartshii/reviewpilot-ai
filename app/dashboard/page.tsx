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
import type { Id } from "@/convex/_generated/dataModel";
import { useIsClient } from "@/hooks/useIsClient";
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
      className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/20 hover:bg-white/[0.04] ${
        href ? "cursor-pointer" : ""
      }`}
    >
      <div
        className="pointer-events-none absolute transition-opacity duration-300"
        style={{
          left: glow.x - 80,
          top: glow.y - 80,
          width: 160,
          height: 160,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)",
          opacity: glow.opacity,
        }}
      />
      <div className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-emerald-500/40 transition-transform duration-500 group-hover:scale-x-100" />
      {children}
    </div>
  );

  if (!href) return inner;
  return <Link href={href}>{inner}</Link>;
}

export default function DashboardPage() {
  const restaurantId = useRestaurantId();
  const stats = useQuery(
    api.queries.getDashboardStats,
    restaurantId ? { restaurantId } : "skip"
  );
  const activity = useQuery(
    api.queries.getRecentActivity,
    restaurantId ? { restaurantId } : "skip"
  );
  const customers = useQuery(
    api.queries.getCustomers,
    restaurantId ? { restaurantId } : "skip"
  );
  const restaurant = useQuery(
    api.queries.getRestaurant,
    restaurantId ? { restaurantId } : "skip"
  );
  const insightsSnapshot = useQuery(
    api.queries.getAiInsightsSnapshot,
    restaurantId ? { restaurantId } : "skip"
  );
  type ActivityRow = NonNullable<typeof activity>[number];
  type CustomerRow = NonNullable<typeof customers>[number];
  const [drawerId, setDrawerId] = useState<Id<"customers"> | null>(null);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const isClient = useIsClient();
  const smsHistory = useQuery(
    api.queries.getCustomerSmsHistory,
    restaurantId && drawerId ? { restaurantId, customerId: drawerId } : "skip"
  );
  const receiptHistory = useQuery(
    api.queries.getCustomerReceiptHistory,
    restaurantId && drawerId ? { restaurantId, customerId: drawerId } : "skip"
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

  const insights = [];

  if (insightsSnapshot.totalCustomers === 0) {
    insights.push({
      icon: "\uD83D\uDE80",
      text: `No ${labels.customerLabelPlural} have checked in yet. Start with the kiosk or QR flow so ReviewPilot has real data to optimize.`,
      tone: "border-sky-500/20 bg-sky-500/10 text-sky-100",
    });
  }

  if (insightsSnapshot.pendingApprovals > 0) {
    insights.push({
      icon: "\u26A0",
      text: `${insightsSnapshot.pendingApprovals} recovery message${insightsSnapshot.pendingApprovals === 1 ? " is" : "s are"} waiting for approval. Clearing them quickly improves save-rate with unhappy ${labels.customerLabelPlural}.`,
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    });
  }

  if (insightsSnapshot.averageCurrentWeekRating > 0) {
    insights.push(
      insightsSnapshot.averageCurrentWeekRating < 4
        ? {
            icon: "\uD83D\uDCC9",
            text: `Average rating dipped to ${insightsSnapshot.averageCurrentWeekRating.toFixed(1)} this week. Review recent feedback before more low experiences stack up.`,
            tone: "border-amber-500/20 bg-amber-500/10 text-amber-200",
          }
        : {
            icon: "\u2726",
            text: `Strong week at ${insightsSnapshot.averageCurrentWeekRating.toFixed(1)}\u2605. This is a good time to push more happy ${labels.customerLabelPlural} toward public reviews.`,
            tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
          }
    );
  }

  if (insightsSnapshot.currentWeekNewCustomers > 0) {
    insights.push({
      icon: "\u2191",
      text: `${insightsSnapshot.currentWeekNewCustomers} new ${labels.customerLabelPlural} joined this week. Consider a welcome or return-offer campaign while they still remember the visit.`,
      tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    });
  }

  if (insightsSnapshot.inactiveCount > 0) {
    insights.push({
      icon: "\u23F3",
      text: `${insightsSnapshot.inactiveCount} ${labels.customerLabelPlural} are inactive right now. Re-engagement SMS can bring back people who already know the business.`,
      tone: "border-violet-500/20 bg-violet-500/10 text-violet-200",
    });
  }

  if (insightsSnapshot.loyalCount > 0) {
    insights.push({
      icon: "\u2B50",
      text: `${insightsSnapshot.loyalCount} loyal ${labels.customerLabelPlural} have 5+ ${labels.visitLabelPlural}. They are strong candidates for VIP deals, referral asks, or review pushes.`,
      tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    });
  }

  if (insightsSnapshot.atRiskCount > 0) {
    insights.push({
      icon: "\uD83D\uDEA8",
      text: `${insightsSnapshot.atRiskCount} ${labels.customerLabelPlural} are currently marked at risk. Fast follow-up matters most here.`,
      tone: "border-red-500/20 bg-red-500/10 text-red-200",
    });
  }

  if (insightsSnapshot.smsSentThisMonth > 0) {
    insights.push({
      icon: "\uD83D\uDCF2",
      text:
        estimatedReviewRate > 0
          ? `${insightsSnapshot.smsSentThisMonth} SMS sent this month with about ${estimatedReviewRate}% reaching the Google review step.`
          : `${insightsSnapshot.smsSentThisMonth} SMS sent this month. Your follow-up funnel is active, but public review clicks still need momentum.`,
      tone: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    });
  }

  if (insightsSnapshot.smsUsagePercent >= 80) {
    insights.push({
      icon: "\u26A1",
      text: `You have used about ${insightsSnapshot.smsUsagePercent}% of this month's SMS allowance. Watch usage so campaigns do not stall late in the cycle.`,
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    });
  }

  if (insightsSnapshot.averageSpendPerTrackedCustomer > 0) {
    insights.push({
      icon: "\uD83D\uDCB8",
      text: `Average tracked spend is $${insightsSnapshot.averageSpendPerTrackedCustomer.toFixed(2)} per ${labels.customerLabel}. That helps position loyalty and return offers around real value.`,
      tone: "border-white/10 bg-white/[0.04] text-white/70",
    });
  }

  if (insightsSnapshot.averageVisits >= 2) {
    insights.push({
      icon: "\uD83D\uDD01",
      text: `Average repeat frequency is ${insightsSnapshot.averageVisits.toFixed(1)} ${labels.visitLabelPlural} per ${labels.customerLabel}. Repeat behavior is forming, so retention messaging has leverage.`,
      tone: "border-white/10 bg-white/[0.04] text-white/70",
    });
  }

  insights.push({
    icon: "\uD83D\uDCA1",
    text: `Tip: Respond to negative feedback within 24 hours to recover the ${labels.customerLabel} before they disengage.`,
    tone: "border-white/10 bg-white/[0.04] text-white/70",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-white/30">
          Your {labels.businessLabel} performance at a glance
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
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                {"\u2726"}
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">AI Insights</p>
                <p className="text-xs text-white/30">
                  Trend-aware guidance derived from ratings, spending, retention,
                  and message activity
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/28">
                  Rating momentum
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {insightsSnapshot.averageCurrentWeekRating > 0
                    ? `${insightsSnapshot.averageCurrentWeekRating.toFixed(1)}★`
                    : "-"}
                </p>
                <p
                  className={`mt-1 text-xs ${
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
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/28">
                  Retention pressure
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {insightsSnapshot.inactiveCount}
                </p>
                <p className="mt-1 text-xs text-white/38">
                  inactive {labels.customerLabelPlural}
                </p>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/28">
                  Funnel health
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {insightsSnapshot.reviewConversionRate}%
                </p>
                <p className="mt-1 text-xs text-white/38">
                  review-step reach this month
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                    Weekly trend
                  </p>
                  <p className="mt-2 text-sm text-white/55">
                    New {labels.customerLabelPlural} and feedback volume over the
                    last 6 weeks
                  </p>
                  <div className="mt-4 h-56">
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

                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                    Rating signal
                  </p>
                  <p className="mt-2 text-sm text-white/55">
                    Weekly average rating over the last 6 weeks
                  </p>
                  <div className="mt-4 h-56">
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

              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                  Recommended action
                </p>
                <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {insightsSnapshot.recommendationTitle}
                    </p>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-white/55">
                      {insightsSnapshot.recommendationBody}
                    </p>
                  </div>
                  <Link
                    href={
                      insightsSnapshot.recommendedSegment === "ATRISK"
                        ? "/dashboard/reviews"
                        : "/dashboard/sms"
                    }
                    className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#34d399,#4cc9f0)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(76,201,240,0.18)]"
                  >
                    {insightsSnapshot.recommendedSegment === "ATRISK"
                      ? "Open recovery queue"
                      : "Open SMS Center"}
                  </Link>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                    Loyalty base
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    {insightsSnapshot.loyalCount}
                  </p>
                  <p className="mt-1 text-sm text-white/42">
                    loyal {labels.customerLabelPlural} ready for review or VIP asks
                  </p>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                    At-risk count
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    {insightsSnapshot.atRiskCount}
                  </p>
                  <p className="mt-1 text-sm text-white/42">
                    {labels.customerLabelPlural} needing recovery attention
                  </p>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                    Lifecycle sends
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    {insightsSnapshot.reengagementSentThisMonth +
                      insightsSnapshot.birthdaySentThisMonth}
                  </p>
                  <p className="mt-1 text-sm text-white/42">
                    birthday + re-engagement SMS sent this month
                  </p>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                    Tracked spend
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    ${insightsSnapshot.trackedSpend.toFixed(0)}
                  </p>
                  <p className="mt-1 text-sm text-white/42">
                    recorded customer spend in this workspace
                  </p>
                </div>
              </div>

              <div className="space-y-3 border-l-2 border-emerald-500/30 pl-4">
                {insights.slice(0, 8).map((insight) => (
                  <div
                    key={insight.text}
                    className={`rounded-2xl border px-4 py-3 text-sm ${insight.tone}`}
                  >
                    <span className="mr-2">{insight.icon}</span>
                    {insight.text}
                  </div>
                ))}
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
