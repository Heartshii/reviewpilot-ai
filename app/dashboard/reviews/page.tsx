"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useLocationScope } from "@/hooks/useLocationScope";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import {
  WorkspaceHero,
  WorkspaceHeroStat,
  WorkspaceSectionHeader,
} from "@/components/ui/workspace-page";
import { IconBadge } from "@/components/ui/premium-icon";

const filters = ["All", "Positive", "Negative", "Pending"] as const;

function sentimentFromRating(
  rating: number,
  stored?: "POSITIVE" | "NEUTRAL" | "NEGATIVE"
) {
  if (stored === "POSITIVE") {
    return { label: "Positive", tone: "bg-emerald-500/20 text-emerald-400" };
  }
  if (stored === "NEUTRAL") {
    return { label: "Neutral", tone: "bg-zinc-500/20 text-zinc-300" };
  }
  if (stored === "NEGATIVE") {
    return { label: "Negative", tone: "bg-red-500/20 text-red-300" };
  }
  if (rating >= 4) {
    return { label: "Positive", tone: "bg-emerald-500/20 text-emerald-400" };
  }
  if (rating === 3) {
    return { label: "Neutral", tone: "bg-zinc-500/20 text-zinc-300" };
  }
  return { label: "Negative", tone: "bg-red-500/20 text-red-300" };
}

export default function ReviewsPage() {
  const restaurantId = useRestaurantId();
  const { selectedLocationId, selectedLocation } = useLocationScope();
  const locationId =
    selectedLocationId === "ALL" ? undefined : selectedLocationId;
  const { userId } = useAuth();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [editingId, setEditingId] = useState<Id<"feedback"> | null>(null);
  const [editingSuggestion, setEditingSuggestion] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = useQuery(
    api.queries.getPendingApprovals,
    restaurantId ? { restaurantId, locationId } : "skip"
  );
  const history = useQuery(
    api.queries.getSmsHistory,
    restaurantId ? { restaurantId, locationId } : "skip"
  );
  const restaurant = useQuery(
    api.queries.getRestaurant,
    restaurantId ? { restaurantId } : "skip"
  );
  const publicReplyCandidates = useQuery(
    api.reviews.getReviewReplyCandidates,
    restaurantId ? { restaurantId, locationId } : "skip"
  );
  const voiceCandidates = useQuery(
    api.voice.getVoiceRecoveryCandidates,
    restaurantId ? { restaurantId, locationId } : "skip"
  );
  const recentVoiceCalls = useQuery(
    api.voice.getVoiceRecoveryCalls,
    restaurantId ? { restaurantId, locationId } : "skip"
  );

  type PendingRow = NonNullable<typeof pending>[number];
  type HistoryRow = NonNullable<typeof history>[number];
  type ReplyCandidateRow = NonNullable<typeof publicReplyCandidates>[number];
  type VoiceCandidateRow = NonNullable<typeof voiceCandidates>[number];
  type VoiceCallRow = NonNullable<typeof recentVoiceCalls>[number];

  const approveSms = useAction(api.sms.approveSms);
  const dismissSms = useMutation(api.dashboardMutations.dismissSms);
  const generatePublicReply = useAction(api.reviews.generatePublicReplySuggestion);
  const savePublicReply = useMutation(api.reviews.overwritePublicReplySuggestion);
  const queueVoiceRecoveryCall = useAction(api.voiceActions.queueVoiceRecoveryCall);

  const feedbackCards = useMemo(() => {
    const pendingItems =
      pending?.map((item: PendingRow) => ({
        id: item._id,
        customerName: item.customerName || item.phone || "Unknown customer",
        phone: item.phone,
        rating: item.rating || 2,
        content: item.content,
        status: item.status,
        sentiment: item.sentiment,
        sentimentCategory: item.sentimentCategory,
        sentimentSummary: item.sentimentSummary,
        customerMessage: item.customerMessage,
      })) ?? [];

    const historyItems =
      history
        ?.filter((item: HistoryRow) => item.smsType === "APOLOGY")
        .map((item: HistoryRow) => ({
          id: item._id,
          customerName:
            item.customerName ||
            (item as HistoryRow & { customerPhone?: string }).customerPhone ||
            "Unknown customer",
          phone: (item as HistoryRow & { customerPhone?: string }).customerPhone ?? "",
          rating: 2,
          content: item.content,
          status: item.status,
        })) ?? [];

    const merged = [...pendingItems, ...historyItems];
    return merged.filter(
      (item, index, arr) =>
        arr.findIndex((other) => other.id === item.id) === index
    );
  }, [history, pending]);

  const filtered = feedbackCards.filter((card) => {
    const sentiment = sentimentFromRating(card.rating, card.sentiment).label;
    if (filter === "Positive") return sentiment === "Positive";
    if (filter === "Negative") return sentiment === "Negative";
    if (filter === "Pending") return card.status === "PENDING_APPROVAL";
    return true;
  });

  const handleApprove = async (smsLogId: Id<"smsLogs">) => {
    if (!userId) return;
    await approveSms({ smsLogId, approvedByUserId: userId });
  };

  const handleDismiss = async (smsLogId: Id<"smsLogs">) => {
    if (!restaurantId) return;
    await dismissSms({ smsLogId, restaurantId });
  };

  const handleGenerateReply = async (feedbackId: Id<"feedback">) => {
    if (!restaurantId || !userId) return;
    setBusyId(feedbackId);
    try {
      await generatePublicReply({
        actorClerkId: userId,
        restaurantId,
        feedbackId,
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveReply = async (feedbackId: Id<"feedback">) => {
    if (!restaurantId || !userId || !editingSuggestion.trim()) return;
    setBusyId(feedbackId);
    try {
      await savePublicReply({
        actorClerkId: userId,
        restaurantId,
        feedbackId,
        suggestion: editingSuggestion.trim(),
      });
      setEditingId(null);
      setEditingSuggestion("");
    } finally {
      setBusyId(null);
    }
  };

  const handleQueueVoiceCall = async (feedbackId: Id<"feedback">) => {
    if (!restaurantId || !userId) return;
    setBusyId(feedbackId);
    try {
      await queueVoiceRecoveryCall({
        actorClerkId: userId,
        restaurantId,
        feedbackId,
      });
    } finally {
      setBusyId(null);
    }
  };

  if (!restaurantId) return null;

  if (
    pending === undefined ||
    history === undefined ||
    publicReplyCandidates === undefined ||
    voiceCandidates === undefined ||
    recentVoiceCalls === undefined ||
    restaurant === undefined
  ) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <WorkspaceHero
        eyebrow="Reviews and feedback"
        title="Manage private recovery and public review response from one queue"
        description="This workspace helps owners move quickly when a customer had a rough experience, while still creating polished reply suggestions for strong public review moments."
        scope={`Scope: ${selectedLocation?.name ?? "All locations"}`}
        actions={
          <>
            <Link
              href="/dashboard/settings"
              className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/72"
            >
              Review destinations
            </Link>
            <Link
              href="/dashboard/sms?tab=approval"
              className="rounded-[1.25rem] bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-4 py-3 text-sm font-semibold text-slate-950"
            >
              Open approval queue
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <WorkspaceHeroStat
          eyebrow="Recovery"
          label="Messages waiting on approval"
          value={`${pending.length}`}
          note="Low-rating recovery stays private until the owner approves."
          icon="shield"
        />
        <WorkspaceHeroStat
          eyebrow="Public replies"
          label="Positive review candidates"
          value={`${publicReplyCandidates.length}`}
          note="AI-ready reply suggestions for strong customer moments."
          icon="spark"
        />
        <WorkspaceHeroStat
          eyebrow="Voice recovery"
          label="High-value call opportunities"
          value={`${voiceCandidates.length}`}
          note="Use voice follow-up when the customer relationship is worth saving fast."
          icon="live"
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-white/30">
            Google review destination
          </p>
          <p className="mt-3 text-sm leading-7 text-white/58">
            {selectedLocation?.googleBusinessUrl ??
              restaurant.googleBusinessUrl ??
              "No Google review URL is configured yet for this scope."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {selectedLocation?.googleBusinessUrl || restaurant.googleBusinessUrl ? (
              <a
                href={selectedLocation?.googleBusinessUrl ?? restaurant.googleBusinessUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200"
              >
                Open Google review page
              </a>
            ) : (
              <Link
                href="/dashboard/settings"
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200"
              >
                Add review URL in settings
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-sky-500/15 bg-sky-500/[0.06] p-5 backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-sky-200/80">
            Google sync status
          </p>
          <h2 className="mt-3 text-xl font-semibold text-white">
            Direct Google review sync is not connected yet
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/65">
            ReviewPilot can already guide happy customers to Google and draft
            owner-ready public replies, but it is not yet pulling live Google
            reviews into this page or posting approved replies back to Google.
            That next step requires a Google Business Profile OAuth integration
            for each workspace.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              "Connect a verified Google Business Profile",
              "Sync new Google reviews into this queue",
              "Approve AI replies and post back to Google",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4 text-sm text-white/62"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <WorkspaceSectionHeader
          eyebrow="Public reply workflow"
          title="Generate polished responses for recent positive review candidates"
          description="Keep reply quality consistent without forcing the owner to write every public response from scratch."
          action={
            <div className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200">
              {publicReplyCandidates.length} candidates
            </div>
          }
        />

        {publicReplyCandidates.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-6 py-14 text-center text-white/45">
            No public review candidates yet. Positive ratings will appear here.
          </div>
        ) : (
          <div className="grid gap-5">
            {publicReplyCandidates.map((card: ReplyCandidateRow) => {
              const sentiment = sentimentFromRating(card.rating, card.sentiment);
              const isEditing = editingId === card._id;
              return (
                <div
                  key={card._id}
                  className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-300 hover:border-sky-500/20 hover:bg-white/[0.04]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {card.customerName}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <div className="text-amber-400">
                          {Array.from({ length: 5 }, (_, index) => (
                            <span key={index}>
                              {index < card.rating ? "\u2605" : "\u2606"}
                            </span>
                          ))}
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs ${sentiment.tone}`}>
                          {sentiment.label}
                        </span>
                        <span className="rounded-full bg-white/6 px-3 py-1 text-xs text-white/60">
                          {card.visitCount} visits
                        </span>
                        {card.sentimentCategory && (
                          <span className="rounded-full bg-white/6 px-3 py-1 text-xs text-white/60">
                            {card.sentimentCategory.replace("_", " ")}
                          </span>
                        )}
                        {card.phone ? (
                          <span className="rounded-full bg-white/6 px-3 py-1 text-xs text-white/60">
                            {card.phone}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-xs text-white/32">
                      {new Date(card.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    {card.customerMessage && (
                      <>
                        <p className="mb-2 text-xs uppercase tracking-[0.16em] text-white/30">
                          Customer note
                        </p>
                        <p className="mb-4 text-sm leading-7 text-white/55">
                          {card.customerMessage}
                        </p>
                      </>
                    )}
                    {card.sentimentSummary && (
                      <p className="mb-4 text-xs text-white/38">
                        {card.sentimentSummary}
                      </p>
                    )}
                    <p className="mb-2 text-xs uppercase tracking-[0.16em] text-white/30">
                      Suggested public reply
                    </p>
                    {isEditing ? (
                      <textarea
                        value={editingSuggestion}
                        onChange={(e) => setEditingSuggestion(e.target.value)}
                        rows={4}
                        className="w-full rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white outline-none"
                      />
                    ) : (
                      <p className="text-sm leading-7 text-white/65">
                        {card.publicReplySuggestion ??
                          "No suggestion generated yet. Use AI draft to create one."}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleGenerateReply(card._id)}
                      className="rounded-xl border border-sky-500/20 bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-200"
                    >
                      {busyId === card._id ? "Generating..." : card.publicReplySuggestion ? "Regenerate AI reply" : "Generate AI reply"}
                    </button>

                    {card.publicReplySuggestion && !isEditing && (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard.writeText(card.publicReplySuggestion ?? "");
                          }}
                          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60"
                        >
                          Copy reply
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(card._id);
                            setEditingSuggestion(card.publicReplySuggestion ?? "");
                          }}
                          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60"
                        >
                          Edit
                        </button>
                      </>
                    )}

                    {isEditing && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveReply(card._id)}
                          className="rounded-xl border border-emerald-500/20 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300"
                        >
                          {busyId === card._id ? "Saving..." : "Save reply"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditingSuggestion("");
                          }}
                          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/50"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-white">AI voice recovery</h2>
            <p className="mt-1 text-sm text-white/40">
              Queue an automated recovery call for higher-value unhappy customers who are worth immediate follow-up.
            </p>
          </div>
          <div className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
            {voiceCandidates.filter((item: VoiceCandidateRow) => item.eligible).length} eligible
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            {voiceCandidates.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-6 py-14 text-center text-white/45">
                No negative feedback candidates are ready for voice recovery yet.
              </div>
            ) : (
              voiceCandidates.map((card: VoiceCandidateRow) => (
                <div
                  key={card.feedbackId}
                  className="rounded-2xl border border-white/5 bg-white/[0.02] p-5"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-white">{card.customerName}</p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-300">
                          {card.rating}/5 rating
                        </span>
                        <span className="rounded-full bg-white/6 px-3 py-1 text-xs text-white/60">
                          ${card.totalSpent.toFixed(2)} tracked spend
                        </span>
                        <span className="rounded-full bg-white/6 px-3 py-1 text-xs text-white/60">
                          {card.visitCount} visits
                        </span>
                        {card.sentimentCategory ? (
                          <span className="rounded-full bg-white/6 px-3 py-1 text-xs text-white/60">
                            {card.sentimentCategory.replace("_", " ")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-xs text-white/30">
                      {new Date(card.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {(card.customerMessage || card.sentimentSummary) && (
                    <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-7 text-white/60">
                      {card.customerMessage || card.sentimentSummary}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        card.eligible
                          ? "bg-violet-500/20 text-violet-200"
                          : "bg-zinc-500/20 text-zinc-300"
                      }`}
                    >
                      {card.eligible ? "High-value candidate" : "Below voice threshold"}
                    </span>
                    {card.latestCallStatus ? (
                      <span className="rounded-full bg-white/6 px-3 py-1 text-xs text-white/60">
                        Latest call: {card.latestCallStatus.toLowerCase().replaceAll("_", " ")}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleQueueVoiceCall(card.feedbackId)}
                      disabled={!card.eligible || busyId === card.feedbackId}
                      className={`rounded-xl px-4 py-2 text-sm font-medium ${
                        card.eligible
                          ? "border border-violet-500/20 bg-violet-500/15 text-violet-200"
                          : "cursor-not-allowed border border-white/8 text-white/35"
                      }`}
                    >
                      {busyId === card.feedbackId ? "Queueing call..." : "Queue AI voice call"}
                    </button>
                    {card.customerPhone ? (
                      <span className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/55">
                        {card.customerPhone}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-medium text-white">Recent recovery calls</h3>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/40">
                {recentVoiceCalls.length} tracked
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {recentVoiceCalls.length === 0 ? (
                <p className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-white/42">
                  No recovery calls have been queued yet.
                </p>
              ) : (
                recentVoiceCalls.map((call: VoiceCallRow) => (
                  <div
                    key={call._id}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{call.customerName}</p>
                        <p className="mt-1 text-xs text-white/38">
                          {call.rating}/5 rating • ${call.totalSpent.toFixed(2)} spend
                        </p>
                      </div>
                      <span className="rounded-full bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-white/55">
                        {call.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-white/42">
                      {call.aiSummary ?? "AI recovery call"}
                    </p>
                    <p className="mt-2 text-xs text-white/30">
                      {new Date(call.createdAt).toLocaleString()}
                      {typeof call.callDurationSeconds === "number"
                        ? ` • ${call.callDurationSeconds}s`
                        : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(7,17,29,0.35)]">
        <WorkspaceSectionHeader
          eyebrow="Recovery queue"
          title="Private recovery messages and latest sends"
          description="Low ratings stay private so your team can review the drafted response, see the customer context, and keep recovery messaging under control before anything goes public."
        />

        <div className="mt-6 flex flex-wrap gap-3">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-xl px-4 py-2 text-sm ${
                filter === item
                  ? "border border-emerald-500/20 bg-emerald-500/20 text-emerald-400"
                  : "border border-white/10 text-white/50"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-6 py-14 text-center text-white/45">
            No feedback yet {"\u2014"} start collecting reviews via your kiosk
          </div>
        ) : (
          <div className="mt-6 grid gap-5">
            {filtered.map((card) => {
              const sentiment = sentimentFromRating(card.rating, card.sentiment);
              const statusTone =
                card.status === "PENDING_APPROVAL"
                  ? "bg-amber-500/20 text-amber-300"
                  : card.status === "FAILED"
                    ? "bg-red-500/20 text-red-300"
                    : "bg-emerald-500/20 text-emerald-400";

              return (
                <div
                  key={card.id}
                  className="group relative overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(8,17,29,0.98),rgba(10,18,29,0.9))] p-6 shadow-[0_22px_60px_rgba(2,6,23,0.22)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/18"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.42),transparent)] opacity-80" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[radial-gradient(circle_at_bottom,rgba(52,211,153,0.1),transparent_72%)] opacity-90" />
                  <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-4">
                        <IconBadge
                          name={card.status === "PENDING_APPROVAL" ? "alert" : "message"}
                          className="h-11 w-11 shrink-0 border-white/10 bg-white/[0.04] text-white/72"
                          iconClassName="h-[18px] w-[18px]"
                        />
                        <div className="min-w-0">
                          <p className="font-display text-[1.2rem] font-semibold tracking-[-0.03em] text-white">
                            {card.customerName}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            {card.phone ? (
                              <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/62">
                                {card.phone}
                              </span>
                            ) : null}
                            <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/62">
                              {card.status === "PENDING_APPROVAL"
                                ? "Draft awaiting owner approval"
                                : card.status === "FAILED"
                                  ? "Delivery failed"
                                  : "Last sent recovery message"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <div className="text-amber-400">
                          {Array.from({ length: 5 }, (_, index) => (
                            <span key={index}>
                              {index < card.rating ? "\u2605" : "\u2606"}
                            </span>
                          ))}
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs ${sentiment.tone}`}>
                          {sentiment.label}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs ${statusTone}`}>
                          {card.status === "PENDING_APPROVAL"
                            ? "Pending Approval"
                            : card.status === "FAILED"
                              ? "Failed"
                              : "Sent"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="relative mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <div className="rounded-[1.5rem] border border-white/8 bg-black/10 p-4">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/32">
                        Customer context
                      </p>
                      {card.customerMessage ? (
                        <p className="mt-3 text-sm leading-7 text-white/68">
                          {card.customerMessage}
                        </p>
                      ) : (
                        <p className="mt-3 text-sm leading-7 text-white/42">
                          No extra customer follow-up was captured after the rating.
                        </p>
                      )}
                      {card.sentimentSummary && (
                        <p className="mt-3 text-xs leading-6 text-white/38">
                          {card.sentimentSummary}
                        </p>
                      )}
                    </div>

                    <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/32">
                        Recovery message
                      </p>
                      <p className="mt-3 text-sm leading-7 text-white/76">{card.content}</p>
                    </div>
                  </div>

                  {card.status === "PENDING_APPROVAL" && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleApprove(card.id as Id<"smsLogs">)}
                        className="rounded-xl border border-emerald-500/20 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400"
                      >
                        Approve & Send
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDismiss(card.id as Id<"smsLogs">)}
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/50"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
