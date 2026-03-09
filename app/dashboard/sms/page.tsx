"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useRestaurantId } from "@/hooks/useRestaurantId";

const segments = [
  { id: "ALL" as const, label: "All Customers" },
  { id: "LOYAL" as const, label: "Loyal (5+ visits)" },
  { id: "NEW" as const, label: "New Customers" },
  { id: "INACTIVE" as const, label: "Inactive" },
  { id: "VIP" as const, label: "VIP (200+ pts)" },
];

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
  const [segment, setSegment] = useState<"ALL"|"LOYAL"|"NEW"|"INACTIVE"|"VIP">("ALL");
  const [message, setMessage] = useState("");
  const [dealPrompt, setDealPrompt] = useState("");
  const [showDealPrompt, setShowDealPrompt] = useState(false);
  const [editId, setEditId] = useState<Id<"smsLogs"> | null>(null);
  const [editContent, setEditContent] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [confirmSend, setConfirmSend] = useState(false);

  const pending = useQuery(
    api.queries.getPendingApprovals,
    restaurantId ? { restaurantId } : "skip"
  );
  const segmentCounts = useQuery(
    api.queries.getSegmentCounts,
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

  const approveSms = useAction(api.sms.approveSms);
  const dismissSms = useMutation(api.dashboardMutations.dismissSms);
  const updateSmsContent = useMutation(api.dashboardMutations.updateSmsContent);
  const sendBulkSms = useAction(api.sms.sendBulkSms);
  const generateDeal = useAction(api.sms.generateDealMessage);

  const count =
    segment === "ALL"
      ? segmentCounts?.all ?? 0
      : segment === "LOYAL"
        ? segmentCounts?.loyal ?? 0
        : segment === "NEW"
          ? segmentCounts?.new ?? 0
          : segment === "INACTIVE"
            ? segmentCounts?.inactive ?? 0
            : segmentCounts?.vip ?? 0;

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

  const handleSendBulk = async () => {
    if (!restaurantId || count === 0) return;
    await sendBulkSms({ restaurantId, message, segment });
    setConfirmSend(false);
    setMessage("");
  };

  const filteredHistory = (history ?? []).filter((h) => {
    if (typeFilter && h.smsType !== typeFilter) return false;
    if (statusFilter && h.status !== statusFilter) return false;
    return true;
  });

  const charLimit = 120;
  const isTrial = true;

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
            {t === "approval" && "Needs Approval"}
            {t === "send" && "Send Message"}
            {t === "history" && "History"}
          </button>
        ))}
      </div>

      {tab === "approval" && (
        <div className="space-y-4">
          {pending && pending.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-800 py-16 text-zinc-400">
              <span className="text-4xl">✅</span>
              <p className="mt-2">All clear! No pending apologies.</p>
            </div>
          )}
          {pending?.map((log) => (
            <div
              key={log._id}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
            >
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
                      onClick={() => {
                        setEditId(null);
                        setEditContent("");
                      }}
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
                      onClick={() => {
                        setEditId(log._id);
                        setEditContent(log.content);
                      }}
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

      {tab === "send" && (
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-400">
              Step 1: Select audience
            </p>
            <div className="flex flex-wrap gap-2">
              {segments.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSegment(s.id)}
                  className={`rounded-lg border px-4 py-2 text-sm ${
                    segment === s.id
                      ? "border-blue-500 bg-blue-500/20 text-blue-400"
                      : "border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  {s.label} (
                  {s.id === "ALL"
                    ? segmentCounts?.all ?? 0
                    : s.id === "LOYAL"
                      ? segmentCounts?.loyal ?? 0
                      : s.id === "NEW"
                        ? segmentCounts?.new ?? 0
                        : s.id === "INACTIVE"
                          ? segmentCounts?.inactive ?? 0
                          : segmentCounts?.vip ?? 0}
                  )
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-zinc-400">
              Step 2: Compose message
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your message (use [name] for customer name)..."
              rows={4}
              className="w-full max-w-xl rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder-zinc-500"
            />
            <p className="mt-1 text-sm text-zinc-500">
              {message.length} / {charLimit} characters
            </p>
            <button
              onClick={() => setShowDealPrompt(true)}
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
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
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

          <div>
            <p className="mb-2 text-sm font-medium text-zinc-400">
              Step 3: Preview & Send
            </p>
            <p className="text-zinc-400">
              Sending to <strong className="text-white">{count}</strong>{" "}
              customers
            </p>
            <p className="text-sm text-zinc-500">
              Est. cost: {count} SMS segments
            </p>
            {confirmSend ? (
              <div className="mt-4">
                <p className="mb-2 text-amber-400">
                  Are you sure? This will send {count} SMS messages.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleSendBulk}
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
                disabled={count === 0 || !message.trim()}
                className="mt-4 rounded-lg bg-blue-500 px-6 py-2 font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              >
                Send Now
              </button>
            )}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm"
            >
              <option value="">All types</option>
              {["WELCOME","GOOGLE_REVIEW","APOLOGY","DEAL","BIRTHDAY","REENGAGEMENT"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm"
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
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-400">Date</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-400">Customer</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-400">Type</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-400">Preview</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-zinc-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((h) => (
                  <tr key={h._id} className="border-b border-zinc-800">
                    <td className="px-4 py-2 text-sm text-zinc-400">
                      {new Date(h.sentAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">{h.customerName}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs ${typeColors[h.smsType] ?? ""}`}>
                        {h.smsType}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-4 py-2 text-sm text-zinc-400">
                      {h.content}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs ${statusColors[h.status] ?? ""}`}>
                        {h.status}
                      </span>
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
