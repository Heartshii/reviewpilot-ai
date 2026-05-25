"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useIsClient } from "@/hooks/useIsClient";
import { useLocationScope } from "@/hooks/useLocationScope";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { hasFeatureForTier } from "@/lib/billing-plans";
import {
  CAMPAIGN_SEGMENTS,
  type CampaignSegmentKey,
} from "@/lib/campaign-segments";
import {
  WorkspaceHero,
  WorkspaceHeroStat,
  WorkspaceSectionHeader,
} from "@/components/ui/workspace-page";
import { IconBadge } from "@/components/ui/premium-icon";

const typeColors: Record<string, string> = {
  GOOGLE_REVIEW: "bg-emerald-500/20 text-emerald-400",
  APOLOGY: "bg-amber-500/20 text-amber-400",
  WELCOME: "bg-blue-500/20 text-blue-400",
  BIRTHDAY: "bg-pink-500/20 text-pink-400",
  REENGAGEMENT: "bg-violet-500/20 text-violet-400",
  LOYALTY_REWARD: "bg-cyan-500/20 text-cyan-300",
  DEAL: "bg-zinc-500/20 text-zinc-300",
};

const statusColors: Record<string, string> = {
  SENT: "bg-emerald-500/20 text-emerald-400",
  PENDING_APPROVAL: "bg-amber-500/20 text-amber-400",
  FAILED: "bg-red-500/20 text-red-400",
};

const campaignStatusColors: Record<string, string> = {
  SCHEDULED: "bg-blue-500/20 text-blue-300",
  RUNNING: "bg-amber-500/20 text-amber-300",
  SENT: "bg-emerald-500/20 text-emerald-300",
  FAILED: "bg-red-500/20 text-red-300",
  CANCELED: "bg-zinc-500/20 text-zinc-400",
};

function formatSmsTimestamp(ts: number, mounted: boolean) {
  const date = new Date(ts);
  if (!mounted) {
    return date.toLocaleDateString("en-US");
  }
  return `${date.toLocaleDateString("en-US")} ${date.toLocaleTimeString("en-US")}`;
}

function buildDefaultScheduleValue() {
  const date = new Date(Date.now() + 2 * 60 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export default function SmsPage() {
  const restaurantId = useRestaurantId();
  const { selectedLocationId, selectedLocation } = useLocationScope();
  const locationId =
    selectedLocationId === "ALL" ? undefined : selectedLocationId;
  const searchParams = useSearchParams();
  const { userId } = useAuth();
  const isClient = useIsClient();

  const tabParam = searchParams.get("tab");
  const initialTab: "approval" | "send" | "history" =
    tabParam === "approval" || tabParam === "send" || tabParam === "history"
      ? tabParam
      : "approval";

  const [tab, setTab] = useState<"approval" | "send" | "history">(initialTab);
  const [channel, setChannel] = useState<"SMS" | "WHATSAPP" | "EMAIL">("SMS");
  const [audienceMode, setAudienceMode] = useState<"MANUAL" | "SEGMENT">(
    "MANUAL"
  );
  const [selectedSegment, setSelectedSegment] =
    useState<CampaignSegmentKey>("LOYAL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customerSearch, setCustomerSearch] = useState("");
  const [message, setMessage] = useState("");
  const [campaignTitle, setCampaignTitle] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [scheduledFor, setScheduledFor] = useState(buildDefaultScheduleValue);
  const [dealPrompt, setDealPrompt] = useState("");
  const [showDealPrompt, setShowDealPrompt] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [sendResult, setSendResult] = useState<{
    tone: "sent" | "scheduled";
    summary: string;
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
    restaurantId ? { restaurantId, locationId } : "skip"
  );
  const restaurant = useQuery(
    api.queries.getRestaurant,
    restaurantId ? { restaurantId } : "skip"
  );
  const audienceSegments = useQuery(
    api.campaigns.getCampaignAudienceSegments,
    restaurantId ? { restaurantId, locationId, channel } : "skip"
  );
  const scheduledCampaigns = useQuery(
    api.campaigns.getScheduledCampaigns,
    restaurantId ? { restaurantId, locationId } : "skip"
  );
  const history = useQuery(
    api.queries.getSmsHistory,
    restaurantId ? { restaurantId, locationId } : "skip"
  );
  const allCustomers = useQuery(
    api.queries.getCustomers,
    restaurantId ? { restaurantId, locationId } : "skip"
  );

  type PendingRow = NonNullable<typeof pending>[number];
  type HistoryRow = NonNullable<typeof history>[number];
  type CustomerRow = NonNullable<typeof allCustomers>[number];
  type SegmentRow = NonNullable<typeof audienceSegments>[number];
  type ScheduledCampaignRow = NonNullable<typeof scheduledCampaigns>[number];

  const approveSms = useAction(api.sms.approveSms);
  const dismissSms = useMutation(api.dashboardMutations.dismissSms);
  const updateSmsContent = useMutation(api.dashboardMutations.updateSmsContent);
  const sendToSpecific = useAction(api.sms.sendToSpecificCustomers);
  const sendBulk = useAction(api.sms.sendBulkSms);
  const generateDeal = useAction(api.sms.generateDealMessage);
  const scheduleCampaign = useMutation(api.campaigns.scheduleCampaign);
  const cancelScheduledCampaign = useMutation(api.campaigns.cancelScheduledCampaign);

  const filteredCustomers = useMemo(() => {
    if (!allCustomers) return [];
    const q = customerSearch.toLowerCase();
    return allCustomers.filter(
      (customer: CustomerRow) =>
        (channel === "EMAIL"
          ? customer.optedInEmail === true && !!customer.email
          : customer.optedInSms) &&
        (customer.name.toLowerCase().includes(q) || customer.phone.includes(q))
    );
  }, [allCustomers, channel, customerSearch]);

  const filteredHistory = (history ?? []).filter((entry: HistoryRow) => {
    if (typeFilter && entry.smsType !== typeFilter) return false;
    if (statusFilter && entry.status !== statusFilter) return false;
    return true;
  });

  const selectedSegmentMeta =
    audienceSegments?.find((segment: SegmentRow) => segment.key === selectedSegment) ??
    CAMPAIGN_SEGMENTS.find((segment) => segment.key === selectedSegment);
  const selectedAudienceCount =
    audienceMode === "MANUAL"
      ? selectedIds.size
      : (selectedSegmentMeta?.count ?? 0);

  const charLimit = channel === "EMAIL" ? 1200 : channel === "WHATSAPP" ? 500 : 160;
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

  const resetComposer = () => {
    setSelectedIds(new Set());
    setMessage("");
    setCampaignTitle("");
    setEmailSubject("");
    setDealPrompt("");
    setScheduledFor(buildDefaultScheduleValue());
    setConfirmSend(false);
  };

  const handleSend = async () => {
    if (!restaurantId || !message.trim()) return;

    const result =
      audienceMode === "SEGMENT"
        ? await sendBulk({
            restaurantId,
            locationId,
            channel,
            subject: channel === "EMAIL" ? emailSubject : undefined,
            segment: selectedSegment,
            message,
          })
        : await sendToSpecific({
            restaurantId,
            locationId,
            channel,
            subject: channel === "EMAIL" ? emailSubject : undefined,
            customerIds: Array.from(selectedIds) as Id<"customers">[],
            message,
          });

    setSendResult({
      tone: "sent",
      summary: `Sent ${result.sentCount} ${channel.toLowerCase()} message${
        result.sentCount === 1 ? "" : "s"
      }${
        result.failedCount > 0 ? ` (${result.failedCount} failed)` : ""
      }.`,
    });
    resetComposer();
  };

  const handleSchedule = async () => {
    if (!restaurantId || !userId || !message.trim()) return;
    if (audienceMode === "MANUAL" && selectedIds.size === 0) return;

    setIsScheduling(true);
    try {
      await scheduleCampaign({
        actorClerkId: userId,
        restaurantId,
        locationId,
        channel,
        title:
          campaignTitle.trim() ||
          (audienceMode === "SEGMENT"
            ? `${selectedSegmentMeta?.label ?? "Segment"} campaign`
            : "Customer campaign"),
        subject: channel === "EMAIL" ? emailSubject : undefined,
        message,
        audienceType: audienceMode,
        segment: audienceMode === "SEGMENT" ? selectedSegment : undefined,
        customerIds:
          audienceMode === "MANUAL"
            ? (Array.from(selectedIds) as Id<"customers">[])
            : undefined,
        scheduledFor: new Date(scheduledFor).getTime(),
      });
      setSendResult({
        tone: "scheduled",
        summary: `Scheduled for ${new Date(scheduledFor).toLocaleString("en-US")}.`,
      });
      resetComposer();
    } finally {
      setIsScheduling(false);
    }
  };

  if (!restaurantId) return null;

  return (
    <div className="space-y-6">
      <WorkspaceHero
        eyebrow="Communication"
        title="Messaging center for approvals, campaigns, and lifecycle sends"
        description="Run review approvals, direct outreach, scheduled campaigns, and channel-aware follow-up from one calmer workspace. ReviewPilot keeps the delivery paths together so operators can think in audiences instead of tabs and tools."
        scope={`Scope: ${selectedLocation?.name ?? "All locations"}`}
        actions={
          <>
            <button
              type="button"
              onClick={() => setTab("approval")}
              className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/72 transition-colors hover:border-white/18 hover:text-white"
            >
              Review approvals
            </button>
            <button
              type="button"
              onClick={() => setTab("send")}
              className="rounded-[1.25rem] bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-4 py-3 text-sm font-semibold text-slate-950"
            >
              Launch a campaign
            </button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => {
            setTab("history");
            setStatusFilter("");
            setTypeFilter("");
          }}
          className="text-left"
        >
          <WorkspaceHeroStat
            eyebrow="Capacity"
            label="Monthly message runway"
            value={`${stats.smsUsed}`}
            note={`${stats.smsLimit} total sends available this cycle`}
            icon="message"
          />
        </button>

        <button
          type="button"
          onClick={() => setTab("approval")}
          className="text-left"
        >
          <WorkspaceHeroStat
            eyebrow="Approvals"
            label="Messages waiting on review"
            value={`${stats.pending}`}
            note="Open these while the customer moment is still warm."
            icon="clock"
          />
        </button>

        <button
          type="button"
          onClick={() => {
            setTab("history");
            setStatusFilter("SENT");
            setTypeFilter("");
          }}
          className="text-left"
        >
          <WorkspaceHeroStat
            eyebrow="Delivered"
            label="Confirmed outbound sends"
            value={`${stats.totalSent}`}
            note="Includes recent campaign, review, and lifecycle activity."
            icon="rocket"
          />
        </button>

        <button
          type="button"
          onClick={() => {
            setTab("history");
            setStatusFilter("FAILED");
            setTypeFilter("");
          }}
          className="text-left"
        >
          <WorkspaceHeroStat
            eyebrow="Exceptions"
            label="Messages that need another look"
            value={`${stats.failedMessages}`}
            note="Provider errors or delivery issues worth cleaning up."
            icon="alert"
          />
        </button>
      </div>

      <section className="rounded-[1.9rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-5 shadow-[0_20px_60px_rgba(7,17,29,0.28)] backdrop-blur-sm">
        <WorkspaceSectionHeader
          eyebrow="Workflow"
          title="Move between triage, outreach, and history without losing context"
          description="This jump rail keeps the communication workspace organized around what operators actually do next."
        />
        <div className="mt-5 flex flex-wrap gap-3">
        {(["approval", "send", "history"] as const).map((currentTab) => (
          <button
            key={currentTab}
            type="button"
            onClick={() => setTab(currentTab)}
            className={`flex items-center gap-3 rounded-[1.25rem] border px-4 py-3 text-sm font-medium transition-all ${
              tab === currentTab
                ? "border-emerald-400/22 bg-emerald-500/12 text-emerald-200"
                : "border-white/8 bg-white/[0.03] text-white/60 hover:text-white/80"
            }`}
          >
            <IconBadge
              name={
                currentTab === "approval"
                  ? "shield"
                  : currentTab === "send"
                    ? "flash"
                    : "receipt"
              }
              className={`h-9 w-9 ${
                tab === currentTab
                  ? "border-emerald-300/20 bg-emerald-400/[0.1] text-emerald-100"
                  : "border-white/8 bg-white/[0.03] text-white/52"
              }`}
              iconClassName="h-[15px] w-[15px]"
            />
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
      </section>

      {tab === "approval" && (
        <div className="space-y-4">
          {pending && pending.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/[0.02] py-16">
              <span className="text-5xl">OK</span>
              <p className="mt-4 text-lg text-white/60">
                All clear. No pending approvals.
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
                        Save and Send
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
                        Approve and Send
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(log._id);
                          setEditContent(log.content);
                        }}
                        className="rounded-xl border border-white/8 bg-white/4 px-4 py-2 text-sm text-white hover:bg-white/6"
                      >
                        Edit and Send
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDismiss(log._id)}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/20"
                      >
                        Dismiss
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
                Upgrade your plan to send AI-generated deals, segment campaigns,
                and scheduled outreach from this workspace.
              </p>
            </div>
          )}

          {sendResult && (
            <div
              className={`dashboard-surface rounded-2xl border p-4 ${
                sendResult.tone === "scheduled"
                  ? "border-blue-500/30 bg-blue-500/5"
                  : "border-emerald-500/30 bg-emerald-500/5"
              }`}
            >
              <p
                className={`font-medium ${
                  sendResult.tone === "scheduled"
                    ? "text-blue-200"
                    : "text-emerald-300"
                }`}
              >
                {sendResult.tone === "scheduled" ? "Scheduled" : "Delivered"}:{" "}
                {sendResult.summary}
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
            className={`dashboard-surface overflow-hidden rounded-[2rem] border border-white/8 p-5 shadow-[0_24px_80px_rgba(7,17,29,0.35)] ${
              canUseCampaigns ? "" : "opacity-60"
            }`}
          >
            <div className="mb-5 rounded-[1.6rem] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                    Campaign studio
                  </p>
                  <h3 className="mt-3 font-display text-[1.65rem] font-semibold tracking-[-0.04em] text-white">
                    Build outreach around audience, message, and timing
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-white/48">
                    Choose the channel, define the audience, and send now or schedule later from one calmer operator flow.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-white/44">
                  {[
                    ["1", "Audience"],
                    ["2", "Message"],
                    ["3", "Timing"],
                  ].map(([step, label]) => (
                    <div
                      key={step}
                      className="rounded-[1.2rem] border border-white/8 bg-black/10 px-3 py-3 text-center"
                    >
                      <p className="font-display text-lg font-semibold text-white">{step}</p>
                      <p className="mt-1 uppercase tracking-[0.16em]">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-1">
              {(["SMS", "WHATSAPP", "EMAIL"] as const).map((currentChannel) => (
                <button
                  key={currentChannel}
                  type="button"
                  onClick={() => setChannel(currentChannel)}
                  disabled={!canUseCampaigns}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                    channel === currentChannel
                      ? "bg-sky-500/20 text-sky-200"
                      : "text-white/60 hover:text-white/80"
                  }`}
                >
                  {currentChannel === "SMS"
                    ? "SMS campaigns"
                    : currentChannel === "WHATSAPP"
                      ? "WhatsApp campaigns"
                      : "Email campaigns"}
                </button>
              ))}
            </div>
            <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-1">
              {(
                [
                  ["MANUAL", "Manual list"],
                  ["SEGMENT", "Smart segment"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setAudienceMode(mode)}
                  disabled={!canUseCampaigns}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                    audienceMode === mode
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "text-white/60 hover:text-white/80"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mb-4 flex items-center gap-3">
              <IconBadge
                name="customers"
                className="h-10 w-10 border-white/10 bg-white/[0.04] text-white/72"
                iconClassName="h-[16px] w-[16px]"
              />
              <div>
                <h3 className="text-sm font-medium text-white">Step 1: Select recipients</h3>
                <p className="mt-1 text-xs text-white/38">
                  Start with a direct list or a smart segment from this location scope.
                </p>
              </div>
            </div>

            {audienceMode === "MANUAL" ? (
              <>
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
                          <p className="text-xs text-white/40">
                            {channel === "EMAIL"
                              ? customer.email ?? "No email on file"
                              : customer.phone}
                          </p>
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
              </>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {audienceSegments?.map((segment: SegmentRow) => (
                  <button
                    key={segment.key}
                    type="button"
                    onClick={() => setSelectedSegment(segment.key as CampaignSegmentKey)}
                    disabled={!canUseCampaigns}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      selectedSegment === segment.key
                        ? "border-emerald-400/30 bg-emerald-500/10"
                        : "border-white/8 bg-white/[0.02] hover:border-white/12"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {segment.label}
                        </p>
                        <p className="mt-1 text-xs leading-6 text-white/45">
                          {segment.description}
                        </p>
                      </div>
                      <span className="rounded-full bg-white/6 px-2.5 py-1 text-xs text-white/70">
                        {segment.count}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            className={`dashboard-surface rounded-[1.85rem] border border-white/8 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.2)] ${
              canUseCampaigns ? "" : "opacity-60"
            }`}
          >
            <div className="mb-4 flex items-center gap-3">
              <IconBadge
                name="message"
                className="h-10 w-10 border-white/10 bg-white/[0.04] text-white/72"
                iconClassName="h-[16px] w-[16px]"
              />
              <div>
                <h3 className="text-sm font-medium text-white">Step 2: Compose message</h3>
                <p className="mt-1 text-xs text-white/38">
                  Shape the campaign, personalize the copy, and draft faster with AI.
                </p>
              </div>
            </div>
            <input
              type="text"
              value={campaignTitle}
              onChange={(e) => setCampaignTitle(e.target.value)}
              placeholder="Campaign title (used for scheduled sends)"
              disabled={!canUseCampaigns}
              className="mb-4 w-full rounded-xl border border-white/8 bg-white/4 px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/12 focus:outline-none"
            />
            {channel === "EMAIL" && (
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject"
                disabled={!canUseCampaigns}
                className="mb-4 w-full rounded-xl border border-white/8 bg-white/4 px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/12 focus:outline-none"
              />
            )}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                channel === "EMAIL"
                  ? "Write your email body here... (use [name] for personalization)"
                  : channel === "WHATSAPP"
                    ? "Your WhatsApp message here... (use [name] for customer name)"
                    : "Your SMS message here... (use [name] for customer name)"
              }
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
                Draft with AI
              </button>
            </div>
            {showDealPrompt && (
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Describe your deal (for example 20% off this week)"
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

          <div className="dashboard-surface rounded-[1.85rem] border border-white/8 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.2)]">
            <div className="mb-4 flex items-center gap-3">
              <IconBadge
                name="flash"
                className="h-10 w-10 border-white/10 bg-white/[0.04] text-white/72"
                iconClassName="h-[16px] w-[16px]"
              />
              <div>
                <h3 className="text-sm font-medium text-white">Step 3: Preview and send</h3>
                <p className="mt-1 text-xs text-white/38">
                  Confirm the audience, choose now or later, and keep the schedule visible.
                </p>
              </div>
            </div>
            <p className="text-white/60">
              Ready to send {channel.toLowerCase()} to{" "}
              <span className="font-semibold text-white">{selectedAudienceCount}</span>{" "}
              customer{selectedAudienceCount !== 1 ? "s" : ""}
            </p>
            {channel === "EMAIL" && emailSubject.trim() && (
              <p className="mt-2 text-sm text-white/42">
                Subject: <span className="font-medium text-white">{emailSubject}</span>
              </p>
            )}
            {audienceMode === "SEGMENT" && selectedSegmentMeta && (
              <p className="mt-2 text-sm text-white/42">
                Segment:{" "}
                <span className="font-medium text-white">
                  {selectedSegmentMeta.label}
                </span>
              </p>
            )}

            {confirmSend ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="text-sm text-amber-300">
                    Confirm {channel.toLowerCase()} send to {selectedAudienceCount} customer
                    {selectedAudienceCount !== 1 ? "s" : ""} now?
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSend}
                    className="rounded-xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-4 py-2 text-sm font-medium text-slate-950 transition-transform hover:scale-105"
                  >
                    Yes, send now
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
                disabled={
                  !canUseCampaigns ||
                  selectedAudienceCount === 0 ||
                  !message.trim() ||
                  (channel === "EMAIL" && !emailSubject.trim())
                }
                className="mt-4 rounded-xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-6 py-2 font-medium text-slate-950 transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-50"
              >
                Send Now
              </button>
            )}

            <div className="mt-6 rounded-[1.4rem] border border-white/8 bg-white/[0.02] p-4">
              <p className="text-sm font-medium text-white">Schedule for later</p>
              <p className="mt-1 text-xs text-white/42">
                Save this campaign and let ReviewPilot send it automatically.
              </p>
              <div className="mt-4 flex flex-col gap-3 lg:flex-row">
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  disabled={!canUseCampaigns}
                  className="rounded-xl border border-white/8 bg-white/4 px-4 py-2 text-sm text-white focus:border-white/12 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSchedule}
                  disabled={
                    !canUseCampaigns ||
                    isScheduling ||
                    selectedAudienceCount === 0 ||
                    !message.trim() ||
                    (channel === "EMAIL" && !emailSubject.trim())
                  }
                  className="rounded-xl border border-blue-400/20 bg-blue-500/10 px-5 py-2 text-sm font-medium text-blue-200 transition-colors hover:bg-blue-500/20 disabled:opacity-50"
                >
                  {isScheduling ? "Scheduling..." : "Schedule campaign"}
                </button>
              </div>
            </div>
          </div>

          <div className="dashboard-surface rounded-[1.85rem] border border-white/8 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.2)]">
            <h3 className="text-sm font-medium text-white">Scheduled campaigns</h3>
            <p className="mt-1 text-xs text-white/42">
              Upcoming and recent scheduled sends for this scope.
            </p>
            <div className="mt-4 space-y-3">
              {scheduledCampaigns?.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/42">
                  No scheduled campaigns yet.
                </div>
              )}
              {scheduledCampaigns?.map((campaign: ScheduledCampaignRow) => (
                <div
                  key={campaign._id}
                  className="rounded-2xl border border-white/8 bg-white/[0.02] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {campaign.title}
                      </p>
                      <p className="mt-1 text-xs text-white/42">
                        {campaign.channel} ·{" "}
                        {campaign.audienceType === "SEGMENT"
                          ? campaign.segmentLabel
                          : `${campaign.customerIds?.length ?? 0} direct customers`}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        campaignStatusColors[campaign.status] ?? ""
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-white/60">
                    {campaign.channel === "EMAIL" && campaign.subject ? (
                      <span className="mb-1 block text-xs uppercase tracking-[0.16em] text-white/35">
                        Subject: {campaign.subject}
                      </span>
                    ) : null}
                    {campaign.message}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-white/42">
                      Scheduled for{" "}
                      {formatSmsTimestamp(campaign.scheduledFor, isClient)}
                    </p>
                    {campaign.status === "SCHEDULED" && userId && (
                      <button
                        type="button"
                        onClick={() =>
                          cancelScheduledCampaign({
                            actorClerkId: userId,
                            restaurantId,
                            campaignId: campaign._id,
                          })
                        }
                        className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
                  "LOYALTY_REWARD",
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
                      Channel
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
                        colSpan={6}
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
                      <td className="px-4 py-3 text-sm text-white/55">
                        {entry.deliveryChannel ?? "SMS"}
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
