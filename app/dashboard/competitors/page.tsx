"use client";

import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useE2ESession } from "@/hooks/useE2ESession";
import { useLocationScope } from "@/hooks/useLocationScope";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { getBusinessLabels } from "@/lib/business-copy";
import { WorkspaceHero } from "@/components/ui/workspace-page";

type SearchResult = {
  placeId: string;
  name: string;
  formattedAddress?: string;
  googleMapsUri?: string;
  rating?: number;
  reviewCount?: number;
  primaryType?: string;
};

function toneForDelta(delta?: number) {
  if (typeof delta !== "number" || delta === 0) return "text-white/45";
  return delta > 0 ? "text-emerald-300" : "text-red-300";
}

function formatDelta(delta?: number, fractionDigits = 0) {
  if (typeof delta !== "number" || delta === 0) return "No change";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(fractionDigits)}`;
}

export default function CompetitorsPage() {
  const restaurantId = useRestaurantId();
  const { selectedLocationId, selectedLocation } = useLocationScope();
  const { user } = useUser();
  const { session: e2eSession } = useE2ESession();
  const actorClerkId = user?.id ?? e2eSession?.clerkId ?? "";
  const locationId = selectedLocationId === "ALL" ? undefined : selectedLocationId;

  const restaurant = useQuery(
    api.queries.getRestaurant,
    restaurantId ? { restaurantId } : "skip"
  );
  const watchlist = useQuery(
    api.competitors.getCompetitorWatchlist,
    restaurantId ? { restaurantId, locationId } : "skip"
  );
  const searchCompetitors = useAction(api.competitors.searchCompetitors);
  const refreshCompetitor = useAction(api.competitors.refreshCompetitor);
  const addCompetitor = useMutation(api.competitors.addCompetitor);
  const removeCompetitor = useMutation(api.competitors.removeCompetitor);

  type WatchlistItem = NonNullable<typeof watchlist>["items"][number];

  const labels = getBusinessLabels(restaurant?.businessType);
  const watchedPlaceIds = useMemo(
    () => new Set((watchlist?.items ?? []).map((item: WatchlistItem) => item.placeId)),
    [watchlist]
  );
  const suggestedQuery = useMemo(() => {
    const typeHint = restaurant?.businessSubtype?.trim() || labels.businessLabelPlural;
    return `${typeHint} near ${selectedLocation?.name ?? "my business"}`;
  }, [labels.businessLabelPlural, restaurant?.businessSubtype, selectedLocation?.name]);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingPlaceId, setAddingPlaceId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  if (!restaurantId) return null;

  const runSearch = async () => {
    if (!actorClerkId) return;
    setSearching(true);
    setError(null);

    try {
      const found = await searchCompetitors({
        actorClerkId,
        restaurantId,
        query: query.trim() || suggestedQuery,
      });
      setResults(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to search competitors.");
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (result: SearchResult) => {
    if (!actorClerkId) return;
    setAddingPlaceId(result.placeId);
    setError(null);

    try {
      const competitorId = await addCompetitor({
        actorClerkId,
        restaurantId,
        locationId,
        placeId: result.placeId,
        name: result.name,
        formattedAddress: result.formattedAddress,
        googleMapsUri: result.googleMapsUri,
        primaryType: result.primaryType,
        rating: result.rating,
        reviewCount: result.reviewCount,
      });

      await refreshCompetitor({ actorClerkId, restaurantId, competitorId });
      setResults((current) => current.filter((item) => item.placeId !== result.placeId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add competitor.");
    } finally {
      setAddingPlaceId(null);
    }
  };

  const summary = watchlist?.summary;
  const items = watchlist?.items ?? [];

  return (
    <div className="space-y-6">
      <WorkspaceHero
        eyebrow="Competitor watch"
        title={`Track nearby ${labels.businessLabelPlural} and spot public reputation shifts early`}
        description="Build a market watchlist around the businesses your buyers also see. ReviewPilot keeps the focus on rating changes, review momentum, and visible public proof rather than generic search noise."
        scope={`Scope: ${selectedLocation?.name ?? "All locations"}`}
        actions={
          <button
            type="button"
            onClick={runSearch}
            disabled={searching}
            className="rounded-[1.25rem] bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
          >
            {searching ? "Searching..." : "Find competitors"}
          </button>
        }
      />

      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-white/28">
              Discover competitors
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              Build a watchlist that refreshes every week
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/45">
              Search by area or niche, add the businesses you want to track, and
              ReviewPilot will keep a running snapshot of rating momentum, review
              count growth, and recent public review language.
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs text-white/42">
            Weekly sync uses Google Places data when{" "}
            <span className="text-white/70">GOOGLE_PLACES_API_KEY</span> is configured.
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={suggestedQuery}
            className="flex-1 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-white/24"
          />
          <button
            type="button"
            onClick={runSearch}
            disabled={searching}
            className="rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
          >
            {searching ? "Searching..." : "Find competitors"}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {results.map((result) => {
              const alreadyWatched = watchedPlaceIds.has(result.placeId);
              return (
                <div
                  key={result.placeId}
                  className="rounded-2xl border border-white/7 bg-white/[0.03] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-medium text-white">{result.name}</p>
                      <p className="mt-1 text-sm text-white/42">
                        {result.primaryType || "Local business"}
                      </p>
                      {result.formattedAddress && (
                        <p className="mt-2 text-sm leading-6 text-white/36">
                          {result.formattedAddress}
                        </p>
                      )}
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-right">
                      <p className="text-lg font-semibold text-white">
                        {typeof result.rating === "number"
                          ? result.rating.toFixed(1)
                          : "—"}
                      </p>
                      <p className="text-xs text-white/34">
                        {typeof result.reviewCount === "number"
                          ? `${result.reviewCount} reviews`
                          : "No review count"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={alreadyWatched || addingPlaceId === result.placeId}
                      onClick={() => void handleAdd(result)}
                      className="rounded-xl border border-emerald-500/20 bg-emerald-500/12 px-4 py-2 text-sm font-medium text-emerald-300 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {alreadyWatched
                        ? "Already on watchlist"
                        : addingPlaceId === result.placeId
                          ? "Adding..."
                          : "Add to watchlist"}
                    </button>
                    {result.googleMapsUri && (
                      <a
                        href={result.googleMapsUri}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60"
                      >
                        Open map listing
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-white/28">Tracked</p>
          <p className="mt-3 text-4xl font-light text-white">
            {summary?.trackedCount ?? 0}
          </p>
          <p className="mt-2 text-sm text-white/38">Competitors on this watchlist</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-white/28">
            Avg competitor rating
          </p>
          <p className="mt-3 text-4xl font-light text-white">
            {summary && summary.averageCompetitorRating > 0
              ? summary.averageCompetitorRating.toFixed(1)
              : "—"}
          </p>
          <p className="mt-2 text-sm text-white/38">Across your current watchlist</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-white/28">
            Total competitor reviews
          </p>
          <p className="mt-3 text-4xl font-light text-white">
            {summary?.totalCompetitorReviews ?? 0}
          </p>
          <p className="mt-2 text-sm text-white/38">Visible public proof in the market</p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-white">Watchlist snapshots</h2>
        <p className="mt-2 text-sm leading-7 text-white/45">
          Compare rating shifts, review velocity, and recent public feedback from
          the businesses your buyers also see.
        </p>

        {items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center text-sm text-white/38">
            No competitors are tracked yet. Search above and add a few businesses
            to start your weekly market watch.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {items.map((item: WatchlistItem) => (
              <div
                key={item._id}
                className="rounded-2xl border border-white/7 bg-white/[0.03] p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-lg font-medium text-white">{item.name}</p>
                      <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-white/45">
                        {item.primaryType || "Local business"}
                      </span>
                    </div>
                    {item.formattedAddress && (
                      <p className="mt-2 text-sm leading-6 text-white/38">
                        {item.formattedAddress}
                      </p>
                    )}
                    {item.reviewSummary && (
                      <p className="mt-3 text-sm leading-7 text-white/52">
                        {item.reviewSummary}
                      </p>
                    )}
                    {item.latestReviewSnippet && (
                      <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm leading-6 text-white/56">
                        “{item.latestReviewSnippet}”
                      </div>
                    )}
                    {item.highlights.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.highlights.map((highlight: string, index: number) => (
                          <span
                            key={`${item._id}-${index}`}
                            className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-white/40"
                          >
                            {highlight.length > 64
                              ? `${highlight.slice(0, 61)}...`
                              : highlight}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[360px]">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-white/28">
                        Rating
                      </p>
                      <p className="mt-2 text-2xl font-light text-white">
                        {typeof item.latestRating === "number"
                          ? item.latestRating.toFixed(1)
                          : "—"}
                      </p>
                      <p className={`mt-2 text-xs ${toneForDelta(item.ratingDelta)}`}>
                        {formatDelta(item.ratingDelta, 1)} vs last snapshot
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-white/28">
                        Reviews
                      </p>
                      <p className="mt-2 text-2xl font-light text-white">
                        {item.latestReviewCount ?? "—"}
                      </p>
                      <p
                        className={`mt-2 text-xs ${toneForDelta(item.reviewCountDelta)}`}
                      >
                        {formatDelta(item.reviewCountDelta)} vs last snapshot
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-white/28">
                        Last sync
                      </p>
                      <p className="mt-2 text-sm text-white/76">
                        {item.lastSyncedAt
                          ? new Date(item.lastSyncedAt).toLocaleDateString("en-US")
                          : "Not synced"}
                      </p>
                      <p className="mt-2 text-xs text-white/34">
                        Weekly auto-refresh
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!actorClerkId) return;
                      setRefreshingId(item._id);
                      setError(null);
                      try {
                        await refreshCompetitor({
                          actorClerkId,
                          restaurantId,
                          competitorId: item._id,
                        });
                      } catch (err) {
                        setError(
                          err instanceof Error
                            ? err.message
                            : "Unable to refresh competitor."
                        );
                      } finally {
                        setRefreshingId(null);
                      }
                    }}
                    disabled={refreshingId === item._id}
                    className="rounded-xl border border-emerald-500/20 bg-emerald-500/12 px-4 py-2 text-sm font-medium text-emerald-300 disabled:opacity-60"
                  >
                    {refreshingId === item._id ? "Refreshing..." : "Refresh now"}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!actorClerkId) return;
                      setRemovingId(item._id);
                      setError(null);
                      try {
                        await removeCompetitor({
                          actorClerkId,
                          restaurantId,
                          competitorId: item._id,
                        });
                      } catch (err) {
                        setError(
                          err instanceof Error
                            ? err.message
                            : "Unable to remove competitor."
                        );
                      } finally {
                        setRemovingId(null);
                      }
                    }}
                    disabled={removingId === item._id}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/55 disabled:opacity-60"
                  >
                    {removingId === item._id ? "Removing..." : "Remove"}
                  </button>
                  {item.googleMapsUri && (
                    <a
                      href={item.googleMapsUri}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/55"
                    >
                      Open listing
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
