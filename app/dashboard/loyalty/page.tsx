"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useE2ESession } from "@/hooks/useE2ESession";
import { useLocationScope } from "@/hooks/useLocationScope";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import {
  WorkspaceHero,
  WorkspaceHeroStat,
  WorkspaceSectionHeader,
} from "@/components/ui/workspace-page";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPoints(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

type RewardRow = Doc<"loyaltyRewards">;
type ClaimRow =
  | (Doc<"loyaltyClaims"> & {
      customerName: string;
      customerPhone: string;
      rewardTitle: string;
    });

export default function LoyaltyPage() {
  const restaurantId = useRestaurantId();
  const { selectedLocationId, selectedLocation } = useLocationScope();
  const locationId =
    selectedLocationId === "ALL" ? undefined : selectedLocationId;
  const { user } = useUser();
  const { session: e2eSession } = useE2ESession();
  const customers = useQuery(
    api.queries.getCustomers,
    restaurantId ? { restaurantId, locationId } : "skip"
  );
  const rewards = useQuery(
    api.loyalty.getLoyaltyRewards,
    restaurantId ? { restaurantId } : "skip"
  ) as RewardRow[] | undefined;
  const claims = useQuery(
    api.loyalty.getRecentLoyaltyClaims,
    restaurantId ? { restaurantId, locationId } : "skip"
  ) as ClaimRow[] | undefined;

  const saveReward = useMutation(api.loyalty.upsertLoyaltyReward);
  const markRedeemed = useMutation(api.loyalty.markLoyaltyClaimRedeemed);
  const sendRewardLink = useAction(api.loyaltyActions.sendRewardClaimLink);
  const sendPointsReminder = useAction(api.loyaltyActions.sendPointsBalanceReminder);
  type CustomerRow = NonNullable<typeof customers>[number];

  const actorClerkId = user?.id ?? e2eSession?.clerkId ?? null;
  const [selectedRewardId, setSelectedRewardId] = useState<Id<"loyaltyRewards"> | null>(
    null
  );
  const [editingRewardId, setEditingRewardId] = useState<Id<"loyaltyRewards"> | null>(
    null
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pointsCost, setPointsCost] = useState("250");
  const [smsCopy, setSmsCopy] = useState("");
  const [active, setActive] = useState(true);
  const [expandedReminderCustomerId, setExpandedReminderCustomerId] = useState<
    Id<"customers"> | null
  >(null);
  const [expandedRewardPreviewCustomerId, setExpandedRewardPreviewCustomerId] =
    useState<Id<"customers"> | null>(null);
  const [recentRewardLinks, setRecentRewardLinks] = useState<Record<string, string>>(
    {}
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!rewards?.length || selectedRewardId) {
      return;
    }
    const first = rewards.find((reward) => reward.active) ?? rewards[0];
    if (first) {
      setSelectedRewardId(first._id);
    }
  }, [rewards, selectedRewardId]);

  const selectedReward = useMemo(
    () => rewards?.find((reward) => reward._id === selectedRewardId) ?? null,
    [rewards, selectedRewardId]
  );

  const eligibleCustomers = useMemo(() => {
    if (!customers || !selectedReward) return [];
    return customers
      .filter(
        (customer: CustomerRow) =>
          customer.optedInSms && customer.points >= selectedReward.pointsCost
      )
      .sort(
        (a: CustomerRow, b: CustomerRow) =>
          b.points - a.points || b.totalSpent - a.totalSpent
      );
  }, [customers, selectedReward]);

  const pendingClaims =
    claims?.filter((claim) => claim.status === "PENDING").length ?? 0;
  const claimedReady =
    claims?.filter((claim) => claim.status === "CLAIMED").length ?? 0;
  const totalPointsReady = eligibleCustomers.reduce(
    (sum: number, customer: CustomerRow) => sum + customer.points,
    0
  );
  const customersWithPoints = useMemo(() => {
    if (!customers) return [];
    return [...customers]
      .filter((customer: CustomerRow) => customer.points > 0)
      .sort(
        (a: CustomerRow, b: CustomerRow) =>
          b.points - a.points || b.totalSpent - a.totalSpent
      );
  }, [customers]);

  const buildRedeemUrl = (token: string) => {
    if (typeof window !== "undefined" && window.location?.origin) {
      return `${window.location.origin}/redeem/${token}`;
    }
    return `/redeem/${token}`;
  };

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setToast("Redeem link copied.");
    } catch {
      setToast(link);
    }
  };

  const resetForm = () => {
    setEditingRewardId(null);
    setTitle("");
    setDescription("");
    setImageUrl("");
    setPointsCost("250");
    setSmsCopy("");
    setActive(true);
  };

  const editReward = (reward: RewardRow) => {
    setEditingRewardId(reward._id);
    setSelectedRewardId(reward._id);
    setTitle(reward.title);
    setDescription(reward.description ?? "");
    setImageUrl(reward.imageUrl ?? "");
    setPointsCost(String(reward.pointsCost));
    setSmsCopy(reward.smsCopy ?? "");
    setActive(reward.active);
  };

  const handleSaveReward = async () => {
    if (!restaurantId || !actorClerkId) return;

    setBusy("save-reward");
    setToast(null);
    try {
      const rewardId = await saveReward({
        actorClerkId,
        restaurantId,
        rewardId: editingRewardId ?? undefined,
        title,
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        pointsCost: Number(pointsCost || 0),
        smsCopy: smsCopy.trim() || undefined,
        active,
      });
      setSelectedRewardId(rewardId);
      resetForm();
      setToast("Reward saved.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Failed to save reward.");
    } finally {
      setBusy(null);
    }
  };

  const handleSendReward = async (customerId: Id<"customers">) => {
    if (!restaurantId || !actorClerkId || !selectedRewardId) return;

    setBusy(`send-${customerId}`);
    setToast(null);
    try {
      const result = await sendRewardLink({
        actorClerkId,
        restaurantId,
        locationId,
        rewardId: selectedRewardId,
        customerId,
      });
      setRecentRewardLinks((current) => ({
        ...current,
        [customerId]: result.link,
      }));
      setToast("Reward link sent. The SMS now includes a visible redeem URL.");
      setExpandedRewardPreviewCustomerId(null);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Failed to send reward.");
    } finally {
      setBusy(null);
    }
  };

  const handleRedeemed = async (claimId: Id<"loyaltyClaims">) => {
    if (!restaurantId || !actorClerkId) return;

    setBusy(`redeem-${claimId}`);
    setToast(null);
    try {
      await markRedeemed({
        actorClerkId,
        restaurantId,
        claimId,
      });
      setToast("Reward marked redeemed.");
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Failed to mark reward redeemed."
      );
    } finally {
      setBusy(null);
    }
  };

  const handleSendPointsReminder = async (customer: CustomerRow) => {
    if (!restaurantId || !actorClerkId) return;

    setBusy(`points-${customer._id}`);
    setToast(null);
    try {
      const rewardIdForReminder =
        selectedReward && customer.points >= selectedReward.pointsCost
          ? selectedReward._id
          : undefined;

      const result = await sendPointsReminder({
        actorClerkId,
        restaurantId,
        locationId,
        customerId: customer._id,
        rewardId: rewardIdForReminder,
        rewardTitle: selectedReward?.title,
      });
      if (result.link) {
        setRecentRewardLinks((current) => ({
          ...current,
          [customer._id]: result.link,
        }));
      }
      setToast(
        result.link
          ? `Points reminder with redeem link sent to ${customer.name}.`
          : `Points reminder sent to ${customer.name}.`
      );
      setExpandedReminderCustomerId(null);
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Failed to send points reminder."
      );
    } finally {
      setBusy(null);
    }
  };

  if (!restaurantId) {
    return null;
  }

  return (
    <div className="space-y-6 px-5 py-6 sm:px-6">
      <WorkspaceHero
        eyebrow="Loyalty redemption"
        title="Turn points into offers customers actually come back for"
        description="Create branded rewards, send claim links by SMS, surface point balances, and give the team a cleaner redemption workflow instead of tracking perks manually."
        scope={`Scope: ${selectedLocation?.name ?? "All locations"} · 1 USD = 10 points`}
        actions={
          <>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/72"
            >
              New reward
            </button>
            {selectedReward ? (
              <button
                type="button"
                onClick={() =>
                  setExpandedReminderCustomerId(
                    customersWithPoints[0]?._id ?? null
                  )
                }
                className="rounded-[1.25rem] bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-4 py-3 text-sm font-semibold text-slate-950"
              >
                Nudge loyalty members
              </button>
            ) : null}
          </>
        }
      />
      {false && (
        <>
        <p className="text-xs uppercase tracking-[0.18em] text-white/30">
          Loyalty redemption
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white">
          Turn points into claimable rewards
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/55">
          Create rewards, send claim links by SMS, and mark them redeemed when
          the customer comes back in. Points are deducted when the claim is
          accepted, not when the link is sent.
        </p>
        <p className="mt-2 text-xs text-white/24">
          Scope: {selectedLocation?.name ?? "All locations"} · 1 USD = 10 points
        </p>

          {toast ? (
            <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white/72">
              {toast}
            </div>
          ) : null}
        </>
      )}
      {toast ? (
        <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white/72">
          {toast}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <WorkspaceHeroStat
          eyebrow="Catalog"
          label="Active rewards customers can unlock"
          value={`${rewards?.filter((reward) => reward.active).length ?? 0}`}
          note="Keep the menu focused so every offer feels intentional."
          icon="gift"
        />
        <WorkspaceHeroStat
          eyebrow="Claims"
          label="Pending loyalty claims"
          value={`${pendingClaims}`}
          note="Customers opened the reward flow and are ready to come back."
          icon="clock"
        />
        <WorkspaceHeroStat
          eyebrow="Redeem"
          label="Claimed and waiting redemption"
          value={`${claimedReady}`}
          note="Staff can clear these at the counter when the customer returns."
          icon="check"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6">
          <WorkspaceSectionHeader
            eyebrow="Rewards catalog"
            title="Create redeemable offers with branded deal art"
            description="Reward cards stay visible to staff, while claim links and reminder messages make the offer easy for customers to act on."
            action={
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70"
              >
                New reward
              </button>
            }
          />

          <div className="mt-5 grid gap-3">
            {(rewards ?? []).map((reward) => (
              <button
                key={reward._id}
                type="button"
                onClick={() => editReward(reward)}
                className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                  selectedRewardId === reward._id
                    ? "border-emerald-300/25 bg-emerald-300/[0.08]"
                    : "border-white/8 bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-4">
                    {reward.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- reward art is an optional external image URL
                      <img
                        src={reward.imageUrl}
                        alt={reward.title}
                        className="h-16 w-16 rounded-2xl border border-white/8 object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] text-[11px] uppercase tracking-[0.14em] text-white/28">
                        Deal art
                      </div>
                    )}
                    <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{reward.title}</p>
                    <p className="mt-1 text-sm text-white/50">
                      {reward.description ?? "No description yet."}
                    </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-emerald-300">
                      {formatPoints(reward.pointsCost)} pts
                    </p>
                    <p className="mt-1 text-xs text-white/35">
                      {reward.active ? "Active" : "Paused"}
                    </p>
                  </div>
                </div>
              </button>
            ))}
            {(rewards ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-white/42">
                No rewards yet. Create the first one to start sending loyalty
                claim links.
              </div>
            ) : null}
          </div>

          <div className="mt-6 rounded-2xl border border-white/8 bg-[#09131f]/80 p-5">
            <p className="text-sm font-medium text-white">
              {editingRewardId ? "Edit reward" : "Create reward"}
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Free dessert"
                className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/24 outline-none"
              />
              <input
                type="number"
                min={1}
                step="10"
                value={pointsCost}
                onChange={(event) => setPointsCost(event.target.value)}
                placeholder="250"
                className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/24 outline-none"
              />
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Tell the customer what they unlock and any terms your staff should know."
              className="mt-4 w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/24 outline-none"
            />
            <input
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="Optional deal image URL for reward cards and reminders"
              className="mt-4 w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/24 outline-none"
            />
            {imageUrl ? (
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- reward preview can use arbitrary remote image URLs */}
                <img
                  src={imageUrl}
                  alt={title || "Reward preview"}
                  className="h-32 w-full rounded-2xl object-cover"
                />
              </div>
            ) : null}
            <textarea
              rows={3}
              value={smsCopy}
              onChange={(event) => setSmsCopy(event.target.value)}
              placeholder="Optional SMS template. Use [name], [reward], [points], [business], and [link]."
              className="mt-4 w-full rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/24 outline-none"
            />
            <p className="mt-2 text-xs leading-6 text-white/38">
              If you customize the SMS copy, keep the <span className="text-emerald-300">[link]</span> placeholder so the customer receives a redeem URL. ReviewPilot will append the link automatically if it is missing.
            </p>
            <label className="mt-4 flex items-center gap-3 text-sm text-white/70">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              Reward is active and can be sent to customers
            </label>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleSaveReward()}
                disabled={busy === "save-reward"}
                className="rounded-[1.25rem] bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-6 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
              >
                {busy === "save-reward" ? "Saving..." : "Save reward"}
              </button>
              {editingRewardId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-6 py-3 text-sm text-white/70"
                >
                  Cancel editing
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-white/30">
            Eligible customers
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Send reward claim links
          </h2>
          <p className="mt-2 text-sm leading-7 text-white/52">
            {selectedReward
              ? `Customers below can claim ${selectedReward.title} for ${formatPoints(selectedReward.pointsCost)} points.`
              : "Select a reward first to see who can claim it."}
          </p>
          <p className="mt-2 text-xs text-white/24">
            Total points ready in this scope: {formatPoints(totalPointsReady)}
          </p>

          <div className="mt-5 space-y-3">
            {!selectedReward ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-white/42">
                Pick a reward from the catalog to send claim links.
              </div>
            ) : eligibleCustomers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-white/42">
                No one in this scope has enough points for this reward yet.
              </div>
            ) : (
              eligibleCustomers.slice(0, 16).map((customer: CustomerRow) => (
                <div
                  key={customer._id}
                  className="rounded-2xl border border-white/8 bg-[#09131f]/80 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {customer.name}
                      </p>
                      <p className="mt-1 text-xs text-white/35">
                        {customer.phone}
                        {customer.email ? ` · ${customer.email}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-300">
                        {formatPoints(customer.points)} pts
                      </p>
                      <p className="mt-1 text-xs text-white/35">
                        {formatCurrency(customer.totalSpent)} lifetime spend
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedRewardPreviewCustomerId((current) =>
                          current === customer._id ? null : customer._id
                        )
                      }
                      className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/72"
                    >
                      {expandedRewardPreviewCustomerId === customer._id
                        ? "Hide preview"
                        : "Preview SMS"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSendReward(customer._id)}
                      disabled={busy === `send-${customer._id}`}
                      className="rounded-[1.15rem] border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-medium text-emerald-200 disabled:opacity-60"
                    >
                      {busy === `send-${customer._id}`
                        ? "Sending..."
                        : "Send reward link"}
                    </button>
                  </div>
                  {expandedRewardPreviewCustomerId === customer._id ? (
                    <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/30">
                        Reward SMS preview
                      </p>
                      <p className="mt-2 text-sm leading-7 text-white/62">
                        Hi {customer.name}! You can now claim {selectedReward.title} for{" "}
                        {formatPoints(selectedReward.pointsCost)} points at{" "}
                        {selectedLocation?.name ?? "your business"}.
                      </p>
                      <p className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100/88">
                        Redeem link: a unique claim URL will be generated and appended when you send.
                      </p>
                    </div>
                  ) : null}
                  {recentRewardLinks[customer._id] ? (
                    <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-100/70">
                        Latest redeem link
                      </p>
                      <p className="mt-2 break-all text-xs leading-6 text-emerald-100/86">
                        {recentRewardLinks[customer._id]}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={recentRewardLinks[customer._id]}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-[1.05rem] border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-medium text-emerald-100"
                        >
                          Open redeem page
                        </a>
                        <button
                          type="button"
                          onClick={() => void handleCopyLink(recentRewardLinks[customer._id])}
                          className="rounded-[1.05rem] border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/80"
                        >
                          Copy link
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-white/30">
          Customer balances
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          Loyalty points by customer
        </h2>
        <p className="mt-2 text-sm leading-7 text-white/52">
          Click a customer to send a quick reminder about their current point
          balance and the next reward they can unlock.
        </p>

        <div className="mt-5 space-y-3">
          {customersWithPoints.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-white/42">
              No loyalty balances yet. Add visits or imported receipts to start
              building point history.
            </div>
          ) : (
            customersWithPoints.slice(0, 18).map((customer: CustomerRow) => {
              const reminderOpen = expandedReminderCustomerId === customer._id;

              return (
                <div
                  key={customer._id}
                  className="rounded-2xl border border-white/8 bg-[#09131f]/80 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{customer.name}</p>
                      <p className="mt-1 text-xs text-white/35">
                        {customer.phone}
                        {customer.email ? ` · ${customer.email}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-emerald-300">
                        {formatPoints(customer.points)} pts
                      </p>
                      <p className="mt-1 text-xs text-white/35">
                        {customer.visitCount} visits · {formatCurrency(customer.totalSpent)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedReminderCustomerId((current) =>
                          current === customer._id ? null : customer._id
                        )
                      }
                      className="rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/72"
                    >
                      {reminderOpen ? "Hide reminder" : "Message loyalty balance"}
                    </button>
                    {selectedReward ? (
                      <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-200">
                        Current reward focus: {selectedReward.title}
                      </span>
                    ) : null}
                  </div>

                  {reminderOpen ? (
                    <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/30">
                        Reminder preview
                      </p>
                      <p className="mt-2 text-sm leading-7 text-white/62">
                        Hi {customer.name}! You have {formatPoints(customer.points)} loyalty
                        points waiting
                        {selectedReward
                          ? customer.points >= selectedReward.pointsCost
                            ? ` and can already claim ${selectedReward.title}.`
                            : ` and are getting closer to ${selectedReward.title}.`
                          : "."}{" "}
                        {selectedReward && customer.points >= selectedReward.pointsCost
                          ? "We will include a redeem link in the SMS."
                          : "Visit now to redeem them on your next visit."}
                      </p>
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void handleSendPointsReminder(customer)}
                          disabled={busy === `points-${customer._id}`}
                          className="rounded-[1.15rem] border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-medium text-emerald-200 disabled:opacity-60"
                        >
                          {busy === `points-${customer._id}`
                            ? "Sending..."
                            : "Send points reminder"}
                        </button>
                      </div>
                      {recentRewardLinks[customer._id] ? (
                        <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                          <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-100/70">
                            Latest redeem link
                          </p>
                          <p className="mt-2 break-all text-xs leading-6 text-emerald-100/86">
                            {recentRewardLinks[customer._id]}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <a
                              href={recentRewardLinks[customer._id]}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-[1.05rem] border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-medium text-emerald-100"
                            >
                              Open redeem page
                            </a>
                            <button
                              type="button"
                              onClick={() =>
                                void handleCopyLink(recentRewardLinks[customer._id])
                              }
                              className="rounded-[1.05rem] border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/80"
                            >
                              Copy link
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-white/30">
          Claims activity
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          Recent redemption activity
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-white/46">
          Pending means the link was sent but the customer has not claimed it yet. Claimed means points were already deducted and the team should mark the reward redeemed after it is fulfilled in person.
        </p>
        <div className="mt-5 space-y-3">
          {(claims ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-white/42">
              No reward links have been claimed yet.
            </div>
          ) : (
            claims?.map((claim) => (
              <div
                key={claim._id}
                className="rounded-2xl border border-white/8 bg-[#09131f]/80 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {claim.customerName} · {claim.rewardTitle}
                    </p>
                    <p className="mt-1 text-xs text-white/35">
                      {claim.customerPhone} · {formatPoints(claim.pointsCostSnapshot)} pts
                    </p>
                    <p className="mt-1 text-xs text-white/35">
                      Sent {new Date(claim.createdAt).toLocaleString()}
                    </p>
                    {claim.claimCode ? (
                      <p className="mt-2 text-sm text-emerald-200">
                        Claim code: <span className="font-semibold">{claim.claimCode}</span>
                      </p>
                    ) : null}
                    {claim.status !== "REDEEMED" ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={buildRedeemUrl(claim.token)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-[1.05rem] border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/80"
                        >
                          Open redeem page
                        </a>
                        <button
                          type="button"
                          onClick={() => void handleCopyLink(buildRedeemUrl(claim.token))}
                          className="rounded-[1.05rem] border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/80"
                        >
                          Copy link
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="max-w-[16rem] text-right">
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        claim.status === "PENDING"
                          ? "border border-amber-400/20 bg-amber-400/10 text-amber-200"
                          : claim.status === "CLAIMED"
                            ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                            : "border border-white/10 bg-white/[0.04] text-white/70"
                      }`}
                    >
                      {claim.status === "PENDING"
                        ? "Link sent"
                        : claim.status === "CLAIMED"
                          ? "Ready to redeem"
                          : "Redeemed"}
                    </span>
                    <p className="mt-3 text-xs leading-6 text-white/38">
                      {claim.status === "PENDING"
                        ? "Waiting for the customer to claim the reward from their link."
                        : claim.status === "CLAIMED"
                          ? "Points were already deducted. Mark this redeemed once staff fulfills the offer."
                          : "This reward has already been completed and cleared."}
                    </p>
                    {claim.status === "CLAIMED" ? (
                      <button
                        type="button"
                        onClick={() => void handleRedeemed(claim._id)}
                        disabled={busy === `redeem-${claim._id}`}
                        className="mt-3 block rounded-[1.1rem] border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-medium text-emerald-200 disabled:opacity-60"
                      >
                        {busy === `redeem-${claim._id}`
                          ? "Saving..."
                          : "Mark redeemed"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
