"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useRestaurantId } from "@/hooks/useRestaurantId";

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

export default function SmsPage() {
  const restaurantId = useRestaurantId();
  const { userId } = useAuth();
  const [tab, setTab] = useState<"approval" | "send" | "history">("approval");

  // Customer selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customerSearch, setCustomerSearch] = useState("");

  // Message compose state
  const [message, setMessage] = useState("");
  const [dealPrompt, setDealPrompt] = useState("");
  const [showDealPrompt, setShowDealPrompt] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [sendResult, setSendResult] = useState<{ sentCount: number; failedCount: number } | null>(null);

  // Approval tab state
  const [editId, setEditId] = useState<Id<"smsLogs"> | null>(null);
  const [editContent, setEditContent] = useState("");

  // History tab state
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

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

  const approveSms = useAction(api.sms.approveSms);
  const dismissSms = useMutation(api.dashboardMutations.dismissSms);
  const updateSmsContent = useMutation(api.dashboardMutations.updateSmsContent);
  const sendToSpecific = useAction(api.sms.sendToSpecificCustomers);
  const generateDeal = useAction(api.sms.generateDealMessage);

  // Filter customers by search and opted-in only
  const filteredCustomers = useMemo(() => {
    if (!allCustomers) return [];
    const q = customerSearch.toLowerCase();
    return allCustomers.filter(
      (c) =>
        c.optedInSms &&
        (c.name.toLowerCase().includes(q) || c.phone.includes(q))
    );
  }, [allCustomers, customerSearch]);

  const allSelected =
    filteredCustomers.length > 0 &&
    filteredCustomers.every((c) => selectedIds.has(c._id));

  const toggleSelectAll = () => {
    if (allSelected) {
      // Deselect all filtered customers
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredCustomers.forEach((c) => next.delete(c._id));
        return next;
      });
    } else {
      // Select all filtered customers
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredCustomers.forEach((c) => next.add(c._id));
        return next;
      });
    }
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
    if (!restaurant?.name) return;
    const text = await generateDeal({
      restaurantName: restaurant.name,
      dealDescription: dealPrompt,
    });
    setMessage(text);
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

  const filteredHistory = (history ?? []).filter((h) => {
    if (typeFilter && h.smsType !== typeFilter) return false;
    if (statusFilter && h.status !== statusFilter) return false;
    return true;
  });

  const charLimit = 160;

  if (!restaurantId) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">SMS Center</h1>

      <div className="flex gap-2 border-b border-zinc-800">
        {(["approval", "send", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            {t === "approval" && (
              <>
                Needs Approval
                {pending && pending.length > 0 && (
                  <span className="ml-2 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-400">
                    {pending.length}
                  </span>
                )}
              </>
            )}
            {t === "send" && "Send Message"}
            {t === "history" && "History"}
          </button>
        ))}
      </div>

      {/* ── APPROVAL TAB ── */}
      {tab === "approval" && (
        <div className="space-y-4">
          {pending && pending.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-800 py-16 text-zinc-400">
              <span className="text-4xl">✅</span>
              <p className="mt-2">All clear! No pending apologies.</p>
            </div>
          )}
          {pending?.map((log) => (
            <div key={log._id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{log.customerName}</p>
                  <p className="text-sm text-zinc-400">
                    Rating: <span className="text-red-400">{log.rating}/5</span>
                  </p>
                </div>
              </div>
              {editId === log._id ? (
                <div className="mt-4">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleEditAndSend(log._id)}
                      className="rounded bg-emerald-500 px-3 py-1.5 text-sm text-white hover:bg-emerald-600"
                    >
                      Save & Send
                    </button>
                    <button
                      onClick={() => { setEditId(null); setEditContent(""); }}
                      className="rounded border border-zinc-600 px-3 py-1.5 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-2 text-sm text-zinc-300">{log.content}</p>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleApprove(log._id)}
                      className="rounded bg-emerald-500 px-3 py-1.5 text-sm text-white hover:bg-emerald-600"
                    >
                      ✅ Approve & Send
                    </button>
                    <button
                      onClick={() => { setEditId(log._id); setEditContent(log.content); }}
                      className="rounded border border-zinc-600 px-3 py-1.5 text-sm hover:bg-zinc-800"
                    >
                      ✏️ Edit & Send
                    </button>
                    <button
                      onClick={() => handleDismiss(log._id)}
                      className="rounded border border-red-500/50 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10"
                    >
                      ✗ Dismiss
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── SEND MESSAGE TAB ── */}
      {tab === "send" && (
        <div className="space-y-6">

          {/* Success result banner */}
          {sendResult && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-emerald-400">
                ✅ Sent {sendResult.sentCount} messages successfully.
                {sendResult.failedCount > 0 && (
                  <span className="ml-2 text-red-400">
                    {sendResult.failedCount} failed.
                  </span>
                )}
              </p>
              <button
                onClick={() => setSendResult(null)}
                className="mt-1 text-xs text-zinc-500 hover:text-zinc-300"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Step 1: Select customers */}
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-400">
              Step 1: Select customers
            </p>

            <input
              type="search"
              placeholder="Search by name or phone..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="mb-2 w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none"
            />

            <div className="overflow-hidden rounded-lg border border-zinc-800">
              {/* Select all header */}
              <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900/70 px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 accent-blue-500"
                />
                <span className="text-sm font-medium text-zinc-300">
                  {allSelected ? "Deselect all" : "Select all"}
                  <span className="ml-2 text-zinc-500">
                    ({filteredCustomers.length} customers)
                  </span>
                </span>
                {selectedIds.size > 0 && (
                  <span className="ml-auto rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
                    {selectedIds.size} selected
                  </span>
                )}
              </div>

              {/* Customer list */}
              <div className="max-h-72 overflow-y-auto">
                {allCustomers === undefined && (
                  <p className="px-4 py-6 text-center text-sm text-zinc-500">Loading...</p>
                )}
                {filteredCustomers.length === 0 && allCustomers !== undefined && (
                  <p className="px-4 py-6 text-center text-sm text-zinc-500">No customers found.</p>
                )}
                {filteredCustomers.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => toggleCustomer(c._id)}
                    className={`flex cursor-pointer items-center gap-3 border-b border-zinc-800/50 px-4 py-3 transition-colors last:border-0 hover:bg-zinc-800/40 ${
                      selectedIds.has(c._id) ? "bg-blue-500/10" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c._id)}
                      onChange={() => toggleCustomer(c._id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 accent-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-white">{c.name}</p>
                      <p className="text-xs text-zinc-500">{c.phone}</p>
                    </div>
                    <div className="flex gap-1.5">
                      {c.isLoyal && (
                        <span className="rounded px-1.5 py-0.5 text-xs bg-emerald-500/20 text-emerald-400">Loyal</span>
                      )}
                      {c.isInactive && (
                        <span className="rounded px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400">Inactive</span>
                      )}
                      {c.isUnhappy && (
                        <span className="rounded px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400">Unhappy</span>
                      )}
                      <span className="text-xs text-zinc-500">{c.visitCount} visits</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Step 2: Compose message */}
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-400">
              Step 2: Compose message
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your message... (use [name] for customer's name)"
              rows={4}
              className="w-full max-w-xl rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500 focus:outline-none"
            />
            <p className="mt-1 text-sm text-zinc-500">
              {message.length} / {charLimit} characters
            </p>
            <button
              onClick={() => setShowDealPrompt((v) => !v)}
              className="mt-2 rounded-lg border border-zinc-600 px-3 py-1.5 text-sm hover:bg-zinc-800"
            >
              ✨ Draft with AI
            </button>
            {showDealPrompt && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Describe your deal (e.g. 20% off lunch this week)"
                  value={dealPrompt}
                  onChange={(e) => setDealPrompt(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={handleGenerateDeal}
                  className="rounded bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
                >
                  Generate
                </button>
              </div>
            )}
          </div>

          {/* Step 3: Send */}
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-400">
              Step 3: Preview & Send
            </p>
            <p className="text-zinc-400">
              Sending to{" "}
              <strong className="text-white">{selectedIds.size}</strong>{" "}
              customer{selectedIds.size !== 1 ? "s" : ""}
            </p>

            {confirmSend ? (
              <div className="mt-4">
                <p className="mb-2 text-amber-400">
                  Are you sure? This will send {selectedIds.size} SMS message{selectedIds.size !== 1 ? "s" : ""}.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleSend}
                    className="rounded bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600"
                  >
                    Yes, Send Now
                  </button>
                  <button
                    onClick={() => setConfirmSend(false)}
                    className="rounded border border-zinc-600 px-4 py-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmSend(true)}
                disabled={selectedIds.size === 0 || !message.trim()}
                className="mt-4 rounded-lg bg-blue-500 px-6 py-2 font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              >
                Send Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === "history" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white"
            >
              <option value="">All types</option>
              {["WELCOME", "GOOGLE_REVIEW", "APOLOGY", "DEAL", "BIRTHDAY", "REENGAGEMENT"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white"
            >
              <option value="">All statuses</option>
              <option value="SENT">Sent</option>
              <option value="PENDING_APPROVAL">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
          <div className="overflow-hidden rounded-lg border border-zinc-800">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Message</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Sent</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">
                      No messages yet.
                    </td>
                  </tr>
                )}
                {filteredHistory.map((h) => (
                  <tr key={h._id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-900/30">
                    <td className="px-4 py-3 text-sm">{h.customerName}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs ${typeColors[h.smsType] ?? ""}`}>
                        {h.smsType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs ${statusColors[h.status] ?? ""}`}>
                        {h.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="truncate text-sm text-zinc-400">{h.content}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      {new Date(h.sentAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}