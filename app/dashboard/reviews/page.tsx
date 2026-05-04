"use client";

import { useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useRestaurantId } from "@/hooks/useRestaurantId";

const filters = ["All", "Positive", "Negative", "Pending"] as const;

function sentimentFromRating(rating: number) {
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
  const { userId } = useAuth();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");

  const pending = useQuery(
    api.queries.getPendingApprovals,
    restaurantId ? { restaurantId } : "skip"
  );
  const history = useQuery(
    api.queries.getSmsHistory,
    restaurantId ? { restaurantId } : "skip"
  );
  type PendingRow = NonNullable<typeof pending>[number];
  type HistoryRow = NonNullable<typeof history>[number];
  const approveSms = useAction(api.sms.approveSms);
  const dismissSms = useMutation(api.dashboardMutations.dismissSms);

  const feedbackCards = useMemo(() => {
    const pendingItems =
      pending?.map((item: PendingRow) => ({
        id: item._id,
        customerName: item.customerName,
        rating: item.rating || 2,
        content: item.content,
        status: item.status,
      })) ?? [];

    const historyItems =
      history
        ?.filter((item: HistoryRow) => item.smsType === "APOLOGY")
        .map((item: HistoryRow) => ({
          id: item._id,
          customerName: item.customerName,
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
    const sentiment = sentimentFromRating(card.rating).label;
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

  if (!restaurantId) return null;

  if (pending === undefined || history === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-white">
          Reviews & Feedback
        </h1>
        <p className="mt-2 text-sm text-white/35">
          All customer feedback with AI-generated responses
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
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
        <div className="grid gap-5">
          {filtered.map((card) => {
            const sentiment = sentimentFromRating(card.rating);
            const statusTone =
              card.status === "PENDING_APPROVAL"
                ? "bg-amber-500/20 text-amber-300"
                : card.status === "FAILED"
                  ? "bg-red-500/20 text-red-300"
                  : "bg-emerald-500/20 text-emerald-400";

            return (
              <div
                key={card.id}
                className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/20 hover:bg-white/[0.04]"
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

                <div className="mt-5 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="text-sm leading-7 text-white/65">{card.content}</p>
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
    </div>
  );
}
