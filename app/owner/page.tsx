"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useAction, useMutation, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useE2ESession } from "@/hooks/useE2ESession";
import { useEnsureUser } from "@/hooks/useEnsureUser";
import { useRestaurantId } from "@/hooks/useRestaurantId";

type OwnerMobileSnapshot = {
  restaurantName: string;
  smsUsed: number;
  smsLimit: number;
  pendingApprovals: Array<{
    _id: Id<"smsLogs">;
    customerName: string;
    customerPhone: string;
    content: string;
    sentAt: number;
    status: string;
  }>;
  claimAlerts: Array<{
    _id: Id<"loyaltyClaims">;
    customerName: string;
    rewardTitle: string;
    pointsCostSnapshot: number;
    claimCode?: string;
    status: string;
  }>;
  recentActivity: Array<{
    _id: Id<"smsLogs">;
    customerName: string;
    smsType: string;
    content: string;
    sentAt: number;
  }>;
  stats: {
    newCustomersThisWeek: number;
    atRiskCount: number;
    pendingApprovalCount: number;
    claimedRewardCount: number;
  };
};

function formatTimestamp(value: number) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "emerald" | "amber" | "violet";
}) {
  const toneClass =
    tone === "amber"
      ? "text-amber-200"
      : tone === "violet"
        ? "text-violet-200"
        : "text-emerald-200";

  return (
    <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.04] p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/28">{label}</p>
      <p className={`mt-3 text-3xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

export default function OwnerHubPage() {
  const restaurantId = useRestaurantId();
  const { user } = useUser();
  const { session: e2eSession } = useE2ESession();
  const { convexUser, isLoading } = useEnsureUser();
  const snapshot = useQuery(
    api.mobile.getOwnerMobileSnapshot,
    restaurantId ? { restaurantId } : "skip"
  ) as OwnerMobileSnapshot | undefined;
  const approveSms = useAction(api.sms.approveSms);
  const dismissSms = useMutation(api.dashboardMutations.dismissSms);
  const markRedeemed = useMutation(api.loyalty.markLoyaltyClaimRedeemed);
  const activeClerkId = user?.id ?? e2eSession?.clerkId ?? null;

  const smsUsageRatio =
    snapshot && snapshot.smsLimit > 0
      ? Math.min(100, Math.round((snapshot.smsUsed / snapshot.smsLimit) * 100))
      : 0;

  if (!restaurantId || isLoading || convexUser === undefined || snapshot === undefined) {
    return (
      <main className="min-h-screen bg-transparent px-4 py-10 text-white">
        <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center rounded-[2rem] border border-white/8 bg-[#08111d]/75 text-white/60 backdrop-blur-xl">
          Loading owner hub...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent px-4 py-6 text-white">
      <div className="mx-auto max-w-md space-y-5">
        <section className="rounded-[2rem] border border-white/8 bg-[#08111d]/78 p-5 shadow-[0_30px_80px_rgba(4,10,24,0.32)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/26">
                Owner Hub
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-white">
                {snapshot.restaurantName}
              </h1>
              <p className="mt-2 text-sm leading-7 text-white/55">
                Quick approvals, recovery visibility, reward claims, and usage
                health in one mobile-first workspace.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="rounded-full border border-white/10 bg-white/4 px-3 py-2 text-xs font-medium text-white/68"
            >
              Open full dashboard
            </Link>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                  SMS usage
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {snapshot.smsUsed} of {snapshot.smsLimit}
                </p>
              </div>
              <p className="text-sm text-white/46">{smsUsageRatio}% used</p>
            </div>
            <div className="mt-4 h-2 rounded-full bg-white/8">
              <div
                className="h-2 rounded-full bg-[linear-gradient(135deg,#34d399,#38bdf8)]"
                style={{ width: `${smsUsageRatio}%` }}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <StatCard
              label="Pending approvals"
              value={snapshot.stats.pendingApprovalCount}
              tone="amber"
            />
            <StatCard
              label="At-risk this week"
              value={snapshot.stats.atRiskCount}
              tone="amber"
            />
            <StatCard
              label="New customers"
              value={snapshot.stats.newCustomersThisWeek}
            />
            <StatCard
              label="Claimed rewards"
              value={snapshot.stats.claimedRewardCount}
              tone="violet"
            />
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/8 bg-[#08111d]/78 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/28">
                Recovery queue
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Approve customer follow-up
              </h2>
            </div>
            <Link
              href="/dashboard/reviews"
              className="text-xs font-medium text-emerald-200"
            >
              Open reviews
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {snapshot.pendingApprovals.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 px-4 py-6 text-sm text-white/42">
                No approvals are waiting right now.
              </div>
            ) : (
              snapshot.pendingApprovals.map((item) => (
                <article
                  key={item._id}
                  className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {item.customerName}
                      </p>
                      <p className="mt-1 text-xs text-white/34">
                        {item.customerPhone || "Customer"} · {formatTimestamp(item.sentAt)}
                      </p>
                    </div>
                    <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-amber-200">
                      Pending
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-white/58">{item.content}</p>
                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        activeClerkId
                          ? void approveSms({
                              smsLogId: item._id as Id<"smsLogs">,
                              approvedByUserId: activeClerkId,
                            })
                          : undefined
                      }
                      className="flex-1 rounded-[1.15rem] border border-emerald-300/20 bg-emerald-300/12 px-4 py-3 text-sm font-medium text-emerald-200"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void dismissSms({
                          smsLogId: item._id as Id<"smsLogs">,
                          restaurantId,
                        })
                      }
                      className="flex-1 rounded-[1.15rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60"
                    >
                      Dismiss
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/8 bg-[#08111d]/78 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/28">
                Loyalty claims
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Rewards waiting at the counter
              </h2>
            </div>
            <Link
              href="/dashboard/loyalty"
              className="text-xs font-medium text-violet-200"
            >
              Open loyalty
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {snapshot.claimAlerts.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 px-4 py-6 text-sm text-white/42">
                No reward claims are waiting.
              </div>
            ) : (
              snapshot.claimAlerts.map((claim) => (
                <article
                  key={claim._id}
                  className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {claim.customerName}
                      </p>
                      <p className="mt-1 text-xs text-white/34">
                        {claim.rewardTitle} · {claim.pointsCostSnapshot} pts
                      </p>
                    </div>
                    <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-violet-200">
                      {claim.status}
                    </span>
                  </div>
                  {claim.claimCode ? (
                    <p className="mt-3 text-sm text-white/62">
                      Claim code: <span className="font-semibold">{claim.claimCode}</span>
                    </p>
                  ) : null}
                  {claim.status === "CLAIMED" ? (
                    <button
                      type="button"
                      onClick={() =>
                        activeClerkId
                          ? void markRedeemed({
                              actorClerkId: activeClerkId,
                              restaurantId,
                              claimId: claim._id as Id<"loyaltyClaims">,
                            })
                          : undefined
                      }
                      className="mt-4 w-full rounded-[1.15rem] border border-violet-300/20 bg-violet-300/12 px-4 py-3 text-sm font-medium text-violet-100"
                    >
                      Mark redeemed
                    </button>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/8 bg-[#08111d]/78 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/28">
                Recent activity
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Customer movement and messages
              </h2>
            </div>
            <Link
              href="/dashboard/customers"
              className="text-xs font-medium text-sky-200"
            >
              Open customers
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {snapshot.recentActivity.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 px-4 py-6 text-sm text-white/42">
                Recent messaging will appear here as traffic comes in.
              </div>
            ) : (
              snapshot.recentActivity.map((item) => (
                <article
                  key={item._id}
                  className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {item.customerName}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/30">
                        {item.smsType.replaceAll("_", " ")}
                      </p>
                    </div>
                    <p className="text-xs text-white/30">{formatTimestamp(item.sentAt)}</p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-white/55">{item.content}</p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/8 bg-[#08111d]/78 p-5 backdrop-blur-xl">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/28">
            Quick links
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { href: "/dashboard/reviews", label: "Reviews" },
              { href: "/dashboard/loyalty", label: "Loyalty" },
              { href: "/dashboard/billing", label: "Billing" },
              { href: "/dashboard/settings", label: "Settings" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[1.3rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-center text-sm font-medium text-white/72"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
