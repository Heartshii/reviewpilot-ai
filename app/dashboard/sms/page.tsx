"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useIsClient } from "@/hooks/useIsClient";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { hasFeatureForTier } from "@/lib/billing-plans";

const typeColors: Record<string, string> = {
  GOOGLE_REVIEW: "bg-emerald-500/20 text-emerald-400",
  APOLOGY: "bg-amber-500/20 text-amber-400",
  WELCOME: "bg-blue-500/20 text-blue-400",
  BIRTHDAY: "bg-pink-500/20 text-pink-400",
  REENGAGEMENT: "bg-violet-500/20 text-violet-400",
  DEAL: "bg-zinc-500/20 text-zinc-400",
};

const statusColors: Record<string, string> = {
  SENT: "bg-emerald-500/20 text-emerald-400",
  PENDING_APPROVAL: "bg-amber-500/20 text-amber-400",
  FAILED: "bg-red-500/20 text-red-400",
};

function formatSmsTimestamp(ts: number, mounted: boolean) {
  const date = new Date(ts);
  if (!mounted) {
    return date.toLocaleDateString("en-US");
  }
  return `${date.toLocaleDateString("en-US")} ${date.toLocaleTimeString("en-US")}`;
}

export default function SmsPage() {
  const restaurantId = useRestaurantId();
  const searchParams = useSearchParams();
  const { userId } = useAuth();
  const isClient = useIsClient();

  const tabParam = searchParams.get("tab");
  const initialTab: "approval" | "send" | "history" =
    tabParam === "approval" || tabParam === "send" || tabParam === "history"
      ? tabParam
      : "approval";

  const [tab, setTab] = useState<"approval" | "send" | "history">(initialTab);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customerSearch, setCustomerSearch] = useState("");
  const [message, setMessage] = useState("");
  const [dealPrompt, setDealPrompt] = useState("");
  const [showDealPrompt, setShowDealPrompt] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [sendResult, setSendResult] = useState<{
    sentCount: number;
    failedCount: number;
  } | null>(null);
  const [editId, setEditId] = useState<Id<"smsLogs"> | null>(null);
  const [editContent, setEditContent] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(
    searchParams.get("type") ?? ""
  );
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get("status") ?? ""
  );

  const pending = useQuery(
    api.queries.getPendingApprovals,
    restaurantId ? { restaurantId } : "skip"
  );
  const restaurant = useQuery(
    api.queries.getRestaurant,
    restaurantId ? { restaurantId } : "skip"
  );
  const history = useQuery(
    api.queries.getSmsHistory,
    restaurantId ? { restaurantId } : "skip"
  );
  const allCustomers = useQuery(
    api.queries.getCustomers,
    restaurantId ? { restaurantId } : "skip"
  );
  type PendingRow = NonNullable<typeof pending>[number];
  type HistoryRow = NonNullable<typeof history>[number];
  type CustomerRow = NonNullable<typeof allCustomers>[number];

  const approveSms = useAction(api.sms.approveSms);
  const dismissSms = useMutation(api.dashboardMutations.dismissSms);
  const updateSmsContent = useMutation(api.dashboardMutations.updateSmsContent);
  const sendToSpecific = useAction(api.sms.sendToSpecificCustomers);
  const generateDeal = useAction(api.sms.generateDealMessage);

  const filteredCustomers = useMemo(() => {
    if (!allCustomers) return [];
    const q = customerSearch.toLowerCase();
    return allCustomers.filter(
      (customer: CustomerRow) =>
        customer.optedInSms &&
        (customer.name.toLowerCase().includes(q) || customer.phone.includes(q))
    );
  }, [allCustomers, customerSearch]);

  const filteredHistory = (history ?? []).filter((entry: HistoryRow) => {
    if (typeFilter && entry.smsType !== typeFilter) return false;
    if (statusFilter && entry.status !== statusFilter) return false;
    return true;
  });

  const charLimit = 160;
  const allSelected =
    filteredCustomers.length > 0 &&
    filteredCustomers.every((customer: CustomerRow) => selectedIds.has(customer._id));

  const stats = {
    totalSent: (history ?? []).filter((entry: HistoryRow) => entry.status === "SENT")
      .length,
    pending: (pending ?? []).length,
    failedMessages: (history ?? []).filter(
      (entry: HistoryRow) => entry.status === "FAILED"
    ).length,
    smsUsed: restaurant?.smsUsed ?? 0,
    smsLimit: restaurant?.smsLimit ?? 5000,
  };
  const canUseCampaigns = restaurant
    ? hasFeatureForTier(restaurant.tier, "campaigns")
    : false;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredCustomers.forEach((customer: CustomerRow) => next.delete(customer._id));
        return next;
      });
      return;
    }

    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredCustomers.forEach((customer: CustomerRow) => next.add(customer._id));
      return next;
    });
  };

  const toggleCustomer = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApprove = async (smsLogId: Id<"smsLogs">) => {
    if (!userId) return;
    await approveSms({ smsLogId, approvedByUserId: userId });
  };

  const handleDismiss = async (smsLogId: Id<"smsLogs">) => {
    if (!restaurantId) return;
    await dismissSms({ smsLogId, restaurantId });
  };

  const handleEditAndSend = async (smsLogId: Id<"smsLogs">) => {
    if (!restaurantId || !userId) return;
    await updateSmsContent({ smsLogId, restaurantId, content: editContent });
    await approveSms({ smsLogId, approvedByUserId: userId });
    setEditId(null);
    setEditContent("");
  };

  const handleGenerateDeal = async () => {
    if (!restaurant?.name || !restaurantId) return;
    const generated = await generateDeal({
      restaurantId,
      restaurantName: restaurant.name,
      dealDescription: dealPrompt,
    });
    setMessage(generated);
    setDealPrompt("");
    setShowDealPrompt(false);
  };

  const handleSend = async () => {
    if (!restaurantId || selectedIds.size === 0 || !message.trim()) return;
    const result = await sendToSpecific({
      restaurantId,
      customerIds: Array.from(selectedIds) as Id<"customers">[],
      message,
    });
    setSendResult(result);
    setConfirmSend(false);
    setSelectedIds(new Set());
    setMessage("");
  };

  if (!restaurantId) return null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-white/28">
          Communication
        </p>
        <h1 className="mt-2 text-3xl font-light tracking-tight text-white">
          SMS Center
        </h1>
        <p className="mt-1 text-sm text-white/42">
          Manage approvals, campaigns, and customer messaging from one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => {
            setTab("history");
            setStatusFilter("");
            setTypeFilter("");
          }}
          className="dashboard-surface rounded-2xl px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-300/20"
        >
          <p className="text-xs uppercase tracking-[0.16em] text-white/28">SMS Used</p>
          <p className="mt-2 text-2xl font-semibold text-white">{stats.smsUsed}</p>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-emerald-500/60 transition-all"
              style={{
                width: `${Math.min(100, (stats.smsUsed / stats.smsLimit) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-1 text-xs text-white/40">{stats.smsLimit} total</p>
        </button>

        <button
          type="button"
          onClick={() => setTab("approval")}
          className="dashboard-surface rounded-2xl px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-amber-300/20"
        >
          <p className="text-xs uppercase tracking-[0.16em] text-white/28">
            Pending Approval
          </p>
          <p className="mt-2 text-2xl font-semibold text-amber-400">
            {stats.pending}
          </p>
          <p className="mt-3 text-xs text-white/40">Messages waiting</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setTab("history");
            setStatusFilter("SENT");
            setTypeFilter("");
          }}
          className="dashboard-surface rounded-2xl px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-300/20"
        >
          <p className="text-xs uppercase tracking-[0.16em] text-white/28">
            Sent This Month
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-400">
            {stats.totalSent}
          </p>
          <p className="mt-3 text-xs text-white/40">Delivered</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setTab("history");
            setStatusFilter("FAILED");
            setTypeFilter("");
          }}
          className="dashboard-surface rounded-2xl px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-red-300/20"
        >
          <p className="text-xs uppercase tracking-[0.16em] text-white/28">Failed</p>
          <p className="mt-2 text-2xl font-semibold text-red-400">
            {stats.failedMessages}
          </p>
          <p className="mt-3 text-xs text-white/40">Review needed</p>
        </button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-1">
        {(["approval", "send", "history"] as const).map((currentTab) => (
          <button
            key={currentTab}
            type="button"
            onClick={() => setTab(currentTab)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              tab === currentTab
                ? "bg-emerald-500/20 text-emerald-300"
                : "text-white/60 hover:text-white/80"
            }`}
          >
            {currentTab === "approval" && (
              <>
                Needs Approval
                {stats.pending > 0 && (
                  <span className="ml-2 rounded-full bg-amber-500/30 px-2 py-0.5 text-xs text-amber-200">
                    {stats.pending}
                  </span>
                )}
              </>
            )}
            {currentTab === "send" && "Send Message"}
            {currentTab === "history" && "History"}
          </button>
        ))}
      </div>

      {tab === "approval" && (
        <div className="space-y-4">
          {pending && pending.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/[0.02] py-16">
              <span className="text-5xl">✅</span>
              <p className="mt-4 text-lg text-white/60">
                All clear! No pending approvals
              </p>
              <p className="mt-1 text-sm text-white/40">
                Your messaging workflow is on top of things.
              </p>
            </div>
          )}

          {pending?.map((log: PendingRow) => {
            const isReviewRequest = log.smsType === "GOOGLE_REVIEW";
            const badgeClass = isReviewRequest
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-red-500/20 text-red-300";
            const badgeText = isReviewRequest
              ? "Review request pending"
              : "Recovery needed";
            const ratingClass = log.rating >= 4 ? "text-emerald-300" : "text-red-400";
            const editPlaceholder = isReviewRequest
              ? "Edit your review request..."
              : "Edit your recovery message...";

            return (
              <div
                key={log._id}
                className="dashboard-surface rounded-2xl border border-white/8 p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{log.customerName}</p>
                    <p className="mt-1 text-sm text-white/40">
                      Rating:{" "}
                      <span className={`font-medium ${ratingClass}`}>
                        {log.rating}/5
                      </span>
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs ${badgeClass}`}>
                    {badgeText}
                  </span>
                </div>

                {editId === log._id ? (
                  <div className="mt-5 space-y-3">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      placeholder={editPlaceholder}
                      className="w-full rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/12 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditAndSend(log._id)}
                        className="rounded-xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-4 py-2 text-sm font-medium text-slate-950 transition-transform hover:scale-105"
                      >
                        ✅ Save & Send
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(null);
                          setEditContent("");
                        }}
                        className="rounded-xl border border-white/8 bg-white/4 px-4 py-2 text-sm text-white hover:bg-white/6"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-4 text-sm leading-6 text-white/72">{log.content}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(log._id)}
                        className="rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30"
                      >
                        ✅ Approve & Send
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(log._id);
                          setEditContent(log.content);
                        }}
                        className="rounded-xl border border-white/8 bg-white/4 px-4 py-2 text-sm text-white hover:bg-white/6"
                      >
                        ✏️ Edit & Send
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDismiss(log._id)}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/20"
                      >
                        ✕ Dismiss
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "send" && (
        <div className="space-y-6">
          {!canUseCampaigns && (
            <div className="dashboard-surface rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <p className="text-sm font-semibold text-amber-200">
                Campaign Builder is available on Pro and Agency.
              </p>
              <p className="mt-2 text-sm leading-7 text-white/55">
                Upgrade your plan to send AI-generated deals and manual
                campaigns from this workspace.
              </p>
            </div>
          )}
          {sendResult && (
            <div className="dashboard-surface rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="font-medium text-emerald-300">
                ✅ Successfully sent {sendResult.sentCount} messages
                {sendResult.failedCount > 0 && (
                  <span className="ml-2 text-red-300">
                    ({sendResult.failedCount} failed)
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={() => setSendResult(null)}
                className="mt-2 text-xs text-white/40 hover:text-white/60"
              >
                Dismiss
              </button>
            </div>
          )}

          <div
            className={`dashboard-surface rounded-2xl border border-white/8 p-5 ${
              canUseCampaigns ? "" : "opacity-60"
            }`}
          >
            <h3 className="mb-4 text-sm font-medium text-white">
              Step 1: Select recipients
            </h3>

            <input
              type="search"
              placeholder="Search by name or phone..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="mb-4 w-full rounded-xl border border-white/8 bg-white/4 px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/12 focus:outline-none"
            />

            <div className="overflow-hidden rounded-xl border border-white/8">
              <div className="flex items-center gap-3 border-b border-white/8 bg-white/[0.02] px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 accent-blue-500"
                />
                <span className="text-sm font-medium text-white">
                  {allSelected ? "Deselect all" : "Select all"}
                  <span className="ml-2 text-white/40">
                    ({filteredCustomers.length})
                  </span>
                </span>
                {selectedIds.size > 0 && (
                  <span className="ml-auto rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                    {selectedIds.size} selected
                  </span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {allCustomers === undefined && (
                  <p className="px-4 py-8 text-center text-sm text-white/40">
                    Loading...
                  </p>
                )}
                {filteredCustomers.length === 0 && allCustomers !== undefined && (
                  <p className="px-4 py-8 text-center text-sm text-white/40">
                    No customers found.
                  </p>
                )}
                {filteredCustomers.map((customer: CustomerRow) => (
                  <div
                    key={customer._id}
                    onClick={() => toggleCustomer(customer._id)}
                    className={`flex cursor-pointer items-center gap-3 border-b border-white/4 px-4 py-3 transition-colors last:border-0 hover:bg-white/[0.04] ${
                      selectedIds.has(customer._id) ? "bg-emerald-500/10" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(customer._id)}
                      onChange={() => toggleCustomer(customer._id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 accent-emerald-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {customer.name}
                      </p>
                      <p className="text-xs text-white/40">{customer.phone}</p>
                    </div>
                    <div className="flex gap-1.5">
                      {customer.isLoyal && (
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
                          Loyal
                        </span>
                      )}
                      {customer.isInactive && (
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                          Inactive
                        </span>
                      )}
                      {customer.isUnhappy && (
                        <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-300">
                          Unhappy
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className={`dashboard-surface rounded-2xl border border-white/8 p-5 ${
              canUseCampaigns ? "" : "opacity-60"
            }`}
          >
            <h3 className="mb-4 text-sm font-medium text-white">
              Step 2: Compose message
            </h3>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your message here... (use [name] for customer name)"
              rows={4}
              maxLength={charLimit}
              disabled={!canUseCampaigns}
              className="w-full rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/12 focus:outline-none"
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-white/40">
                {message.length} / {charLimit} characters
              </p>
              <button
                type="button"
                onClick={() => setShowDealPrompt((value) => !value)}
                disabled={!canUseCampaigns}
                className="rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/6"
              >
                ✨ Draft with AI
              </button>
            </div>
            {showDealPrompt && (
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Describe your deal (e.g. 20% off lunch this week)"
                  value={dealPrompt}
                  onChange={(e) => setDealPrompt(e.target.value)}
                  disabled={!canUseCampaigns}
                  className="flex-1 rounded-xl border border-white/8 bg-white/4 px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/12 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleGenerateDeal}
                  disabled={!canUseCampaigns}
                  className="rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/30"
                >
                  Generate
                </button>
              </div>
            )}
          </div>

          <div className="dashboard-surface rounded-2xl border border-white/8 p-5">
            <h3 className="mb-4 text-sm font-medium text-white">
              Step 3: Preview & Send
            </h3>
            <p className="text-white/60">
              Ready to send to{" "}
              <span className="font-semibold text-white">{selectedIds.size}</span>{" "}
              customer{selectedIds.size !== 1 ? "s" : ""}
            </p>

            {confirmSend ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="text-sm text-amber-300">
                    ⚠️ Confirm: Send {selectedIds.size} SMS message
                    {selectedIds.size !== 1 ? "s" : ""}?
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSend}
                    className="rounded-xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-4 py-2 text-sm font-medium text-slate-950 transition-transform hover:scale-105"
                  >
                    Yes, Send Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmSend(false)}
                    className="rounded-xl border border-white/8 bg-white/4 px-4 py-2 text-sm text-white hover:bg-white/6"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmSend(true)}
                disabled={!canUseCampaigns || selectedIds.size === 0 || !message.trim()}
                className="mt-4 rounded-xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-6 py-2 font-medium text-slate-950 transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-50"
              >
                Send Now
              </button>
            )}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-4">
          <div className="dashboard-surface rounded-2xl border border-white/8 p-5">
            <div className="flex flex-wrap gap-3">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-sm text-white focus:border-white/12 focus:outline-none"
              >
                <option value="">All types</option>
                {[
                  "WELCOME",
                  "GOOGLE_REVIEW",
                  "APOLOGY",
                  "DEAL",
                  "BIRTHDAY",
                  "REENGAGEMENT",
                ].map((type) => (
                  <option key={type} value={type}>
                    {type.replace("_", " ")}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-sm text-white focus:border-white/12 focus:outline-none"
              >
                <option value="">All statuses</option>
                <option value="SENT">Sent</option>
                <option value="PENDING_APPROVAL">Pending</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/8">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px]">
                <thead>
                  <tr className="border-b border-white/8 bg-white/[0.02]">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-white/40">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-white/40">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-white/40">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-white/40">
                      Message
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.16em] text-white/40">
                      Sent
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-12 text-center text-sm text-white/40"
                      >
                        No messages yet.
                      </td>
                    </tr>
                  )}
                  {filteredHistory.map((entry: HistoryRow) => (
                    <tr
                      key={entry._id}
                      className="border-b border-white/4 transition-colors last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-white">
                        {entry.customerName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${typeColors[entry.smsType] ?? ""}`}
                        >
                          {entry.smsType.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[entry.status] ?? ""}`}
                        >
                          {entry.status === "PENDING_APPROVAL"
                            ? "Pending"
                            : entry.status}
                        </span>
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <p className="truncate text-sm text-white/60">
                          {entry.content}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-white/40">
                        {formatSmsTimestamp(entry.sentAt, isClient)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
