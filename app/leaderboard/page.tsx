"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { BUSINESS_TYPE_OPTIONS } from "@/lib/business-copy";

type PublicLeaderboardRow = {
  restaurantId: Id<"restaurants">;
  rank: number;
  name: string;
  slug: string;
  businessType: string;
  avgRating: number;
  feedbackCount: number;
  recentAvgRating: number;
  momentum: number;
  locationCount: number;
  badgeLabel: string;
};

function businessTypeLabel(value: string) {
  return (
    BUSINESS_TYPE_OPTIONS.find((option) => option.value === value)?.label ??
    "Business"
  );
}

export default function PublicLeaderboardPage() {
  const leaderboard = useQuery(
    api.leaderboard.getPublicLeaderboard,
    {}
  ) as PublicLeaderboardRow[] | undefined;

  return (
    <main className="min-h-screen bg-transparent px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[2rem] border border-white/8 bg-[#08111d]/76 p-6 shadow-[0_32px_90px_rgba(4,10,24,0.32)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
                Public leaderboard
              </p>
              <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">
                Reputation leaders across local businesses
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-8 text-white/58 sm:text-base">
                ReviewPilot highlights businesses that consistently capture strong
                customer experiences, private recovery discipline, and healthy
                rating momentum.
              </p>
            </div>
            <Link
              href="/sign-up"
              className="rounded-[1.3rem] bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-5 py-3 text-sm font-semibold text-slate-950"
            >
              Start free trial
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">Ranked businesses</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {leaderboard?.length ?? "--"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">Min public threshold</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-200">5+</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">Updated</p>
              <p className="mt-2 text-3xl font-semibold text-white">Live</p>
            </div>
          </div>
        </div>

        <section className="mt-6 space-y-4">
          {leaderboard === undefined ? (
            <div className="rounded-[2rem] border border-white/8 bg-[#08111d]/76 px-6 py-16 text-center text-white/45 backdrop-blur-xl">
              Loading leaderboard...
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="rounded-[2rem] border border-white/8 bg-[#08111d]/76 px-6 py-16 text-center text-white/45 backdrop-blur-xl">
              No public leaderboard participants yet.
            </div>
          ) : (
            leaderboard.map((item) => (
              <article
                key={item.slug}
                className="rounded-[2rem] border border-white/8 bg-[#08111d]/76 p-6 backdrop-blur-xl"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-lg font-semibold text-emerald-200">
                      #{item.rank}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-semibold text-white">{item.name}</h2>
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/42">
                          {businessTypeLabel(item.businessType)}
                        </span>
                        <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs text-sky-100">
                          {item.badgeLabel}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-white/55">
                        {item.locationCount} location{item.locationCount === 1 ? "" : "s"} ·
                        {` `}{item.feedbackCount} verified feedback entries ·
                        {` `}{item.momentum >= 0 ? "+" : ""}{item.momentum} recent momentum
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/28">Rating</p>
                      <p className="mt-2 text-2xl font-semibold text-emerald-200">
                        {item.avgRating}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/28">Recent</p>
                      <p className="mt-2 text-2xl font-semibold text-white">
                        {item.recentAvgRating}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/28">Momentum</p>
                      <p
                        className={`mt-2 text-2xl font-semibold ${
                          item.momentum >= 0 ? "text-emerald-200" : "text-amber-200"
                        }`}
                      >
                        {item.momentum >= 0 ? "+" : ""}
                        {item.momentum}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
