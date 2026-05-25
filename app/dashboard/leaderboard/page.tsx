"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useE2ESession } from "@/hooks/useE2ESession";
import { useEnsureUser } from "@/hooks/useEnsureUser";
import { useIsClient } from "@/hooks/useIsClient";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { canAccessSettings } from "@/lib/permissions";
import {
  WorkspaceHero,
  WorkspaceHeroStat,
  WorkspaceSectionHeader,
} from "@/components/ui/workspace-page";

function snippetUrl(path: string) {
  if (typeof window === "undefined") {
    return path;
  }
  return `${window.location.origin}${path}`;
}

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

function LeaderboardSettingsForm({
  restaurantId,
  restaurant,
  settings,
  activeClerkId,
}: {
  restaurantId: Id<"restaurants">;
  restaurant: Doc<"restaurants">;
  settings: {
    leaderboardOptIn?: boolean;
    leaderboardBadgeLabel?: string;
  };
  activeClerkId: string;
}) {
  const leaderboard = useQuery(
    api.leaderboard.getPublicLeaderboard,
    {}
  ) as PublicLeaderboardRow[] | undefined;
  const saveSettings = useMutation(api.dashboardMutations.updateRestaurantSettings);
  const [optIn, setOptIn] = useState(settings.leaderboardOptIn ?? false);
  const [badgeLabel, setBadgeLabel] = useState(settings.leaderboardBadgeLabel ?? "");
  const [saved, setSaved] = useState(false);
  const formKey = ("_id" in settings ? settings._id : restaurantId) as string;

  const leaderboardRow =
    leaderboard?.find(
      (item: PublicLeaderboardRow) => item.restaurantId === restaurant._id
    ) ?? null;
  const previewBadgeLabel =
    leaderboardRow?.badgeLabel ||
    badgeLabel.trim() ||
    "ReviewPilot Member";

  const badgeUrl = snippetUrl(`/api/badges/${restaurant.slug}`);
  const publicLeaderboardUrl = snippetUrl("/leaderboard");
  const embedSnippet = `<img src="${badgeUrl}" alt="${restaurant.name} reputation badge" />`;

  return (
    <div key={formKey} className="space-y-6">
      <WorkspaceHero
        eyebrow="Public proof"
        title="Convert strong reputation performance into something clients can show off"
        description="The leaderboard and badge system turns private feedback strength into public proof. Owners can opt in, customize their label, and embed a clean reputation badge on their own site."
        actions={
          <>
            <Link
              href="/leaderboard"
              className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/72"
            >
              View public leaderboard
            </Link>
            <a
              href="#badge-embed"
              className="rounded-[1.25rem] bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-4 py-3 text-sm font-semibold text-slate-950"
            >
              Copy badge assets
            </a>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <WorkspaceHeroStat
          eyebrow="Ranking"
          label="Current public standing"
          value={leaderboardRow ? `#${leaderboardRow.rank}` : "--"}
          note="Higher rank comes from strong recent ratings and enough proof volume."
          icon="leaderboard"
        />
        <WorkspaceHeroStat
          eyebrow="Rating"
          label="Average private satisfaction score"
          value={leaderboardRow ? leaderboardRow.avgRating.toFixed(1) : "--"}
          note="This is what gives the public badge substance instead of fluff."
          icon="spark"
        />
        <WorkspaceHeroStat
          eyebrow="Momentum"
          label="Recent movement versus earlier performance"
          value={
            leaderboardRow
              ? `${leaderboardRow.momentum > 0 ? "+" : ""}${leaderboardRow.momentum.toFixed(1)}`
              : "--"
          }
          note="Positive movement helps a business look active, not stale."
          icon="trendUp"
        />
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          {
            title: "What the leaderboard is",
            body: "A public proof page for opted-in businesses with strong recent private-feedback performance and enough volume to look credible.",
          },
          {
            title: "What affects rank",
            body: "Recent rating average, total feedback count, momentum, and consistency all influence how high a workspace appears.",
          },
          {
            title: "Why it helps",
            body: "It gives owners a badge, a sharable proof page, and one more reason to stay active in ReviewPilot instead of treating it like a hidden tool.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-5"
          >
            <p className="text-sm font-medium text-white">{item.title}</p>
            <p className="mt-3 text-sm leading-7 text-white/58">{item.body}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6">
          <p className="text-sm font-medium text-white">Leaderboard participation</p>
          <div className="mt-5 space-y-4">
            <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-white/72">
              <input
                type="checkbox"
                checked={optIn}
                onChange={(event) => setOptIn(event.target.checked)}
                className="mt-1 h-4 w-4 accent-emerald-500"
              />
              <span>
                Publish this workspace on the public leaderboard and allow a public
                reputation badge to be served for the business website.
              </span>
            </label>

            <div>
              <label className="block text-sm text-white/50">Custom badge label</label>
              <input
                type="text"
                value={badgeLabel}
                onChange={(event) => setBadgeLabel(event.target.value)}
                placeholder="Customer Favorite"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-white placeholder:text-white/25"
              />
              <p className="mt-2 text-xs text-white/32">
                Leave blank to let ReviewPilot assign a score-based label.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={async () => {
                  await saveSettings({
                    actorClerkId: activeClerkId,
                    restaurantId,
                    leaderboardOptIn: optIn,
                    leaderboardBadgeLabel: badgeLabel.trim() || undefined,
                  });
                  setSaved(true);
                  window.setTimeout(() => setSaved(false), 2000);
                }}
                className="rounded-[1.3rem] bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-6 py-3 text-sm font-semibold text-slate-950"
              >
                Save leaderboard settings
              </button>
              <Link
                href="/leaderboard"
                className="rounded-[1.3rem] border border-white/10 bg-white/[0.03] px-6 py-3 text-sm text-white/70"
              >
                View public leaderboard
              </Link>
            </div>
            {saved ? (
              <p className="text-sm text-emerald-200">Leaderboard settings saved.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Current standing</p>
              <p className="mt-1 text-sm text-white/44">
                Preview how this workspace appears when public proof is enabled.
              </p>
            </div>
            <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-200">
              {leaderboardRow ? `Rank #${leaderboardRow.rank}` : "Not ranked yet"}
            </div>
          </div>

          <div className="mt-5 rounded-[1.75rem] border border-white/8 bg-[#09131f]/85 p-5 shadow-[0_24px_80px_rgba(7,17,29,0.35)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                  Public badge
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {restaurant.name}
                </h2>
                <p className="mt-2 text-sm text-white/50">
                  {previewBadgeLabel}
                </p>
              </div>
              {leaderboard === undefined ? (
                <div className="flex h-20 w-[240px] items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03] text-sm text-white/40">
                  Loading badge...
                </div>
              ) : (
                <Image
                  src={badgeUrl}
                  alt={`${restaurant.name} reputation badge`}
                  width={240}
                  height={68}
                  unoptimized
                  className="h-20 w-auto rounded-2xl border border-white/8 bg-white"
                />
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/28">Rank</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {leaderboardRow?.rank ?? "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/28">Rating</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-200">
                  {leaderboardRow?.avgRating ?? "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/28">Reviews</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {leaderboardRow?.feedbackCount ?? "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/28">Momentum</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-200">
                  {leaderboardRow ? `${leaderboardRow.momentum > 0 ? "+" : ""}${leaderboardRow.momentum.toFixed(1)}` : "--"}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section id="badge-embed" className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6">
        <WorkspaceSectionHeader
          eyebrow="Badge distribution"
          title="Copy the public asset URLs and embed the badge anywhere the business needs proof"
          description="Use the badge on landing pages, proposal decks, agency deliverables, or local business websites."
        />
        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-sm font-medium text-white">Badge source URL</p>
            <div className="mt-3 rounded-2xl border border-white/8 bg-[#09131f]/85 px-4 py-4 text-sm text-white/70">
              {badgeUrl}
            </div>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(badgeUrl)}
              className="mt-3 rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70"
            >
              Copy badge URL
            </button>
          </div>

          <div>
            <p className="text-sm font-medium text-white">Embed snippet</p>
            <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/8 bg-[#09131f]/85 px-4 py-4 text-sm text-white/70">
              <code>{embedSnippet}</code>
            </pre>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(embedSnippet)}
              className="mt-3 rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70"
            >
              Copy embed snippet
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-white/58">
          Public leaderboard URL: {publicLeaderboardUrl}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-white/58">
            Opt-in is required before the workspace can appear publicly.
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-white/58">
            Badge labels can be custom, or ReviewPilot can assign them from live performance.
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-white/58">
            The same badge image can be embedded on a site, landing page, or agency deliverable.
          </div>
        </div>
      </section>
    </div>
  );
}

export default function LeaderboardSettingsPage() {
  const restaurantId = useRestaurantId();
  const { user } = useUser();
  const { session: e2eSession } = useE2ESession();
  const { convexUser, isLoading: userLoading } = useEnsureUser();
  const isClient = useIsClient();
  const restaurant = useQuery(
    api.queries.getRestaurant,
    restaurantId ? { restaurantId } : "skip"
  );
  const settings = useQuery(
    api.queries.getRestaurantSettings,
    restaurantId ? { restaurantId } : "skip"
  );
  const activeClerkId = user?.id ?? e2eSession?.clerkId ?? "";

  if (
    !restaurantId ||
    restaurant === undefined ||
    settings === undefined ||
    userLoading
  ) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (!isClient) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-500">Loading leaderboard settings...</p>
      </div>
    );
  }

  if (!canAccessSettings(convexUser?.role)) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-amber-100">
        <p className="text-sm font-semibold">Leaderboard settings are restricted</p>
        <p className="mt-2 text-sm leading-7 opacity-90">
          Managers and owners can control public recognition, badge labels, and
          leaderboard participation.
        </p>
      </div>
    );
  }

  return (
    <LeaderboardSettingsForm
      restaurantId={restaurantId}
      restaurant={restaurant}
      settings={settings}
      activeClerkId={activeClerkId}
    />
  );
}
