"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  PREMIUM_AI_ADDON,
  SMS_PACK_ADDONS,
} from "@/lib/billing-addons";
import {
  BILLING_PLANS,
  formatSubscriptionStatus,
  getSubscriptionTone,
  getRemainingTrialDays,
  hasActiveSubscription,
  isTrialExpired,
  type BillingInterval,
  type DisplaySubscriptionStatus,
} from "@/lib/billing-plans";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { useEnsureUser } from "@/hooks/useEnsureUser";
import { canAccessBilling } from "@/lib/permissions";
import {
  WorkspaceHero,
  WorkspaceHeroStat,
} from "@/components/ui/workspace-page";

function formatDate(timestamp: number | null) {
  if (!timestamp) return "Not available";
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDaysUntil(timestamp: number | null) {
  if (!timestamp) return null;
  return getRemainingTrialDays(timestamp);
}

function getPrimaryBillingMessage(args: {
  status: DisplaySubscriptionStatus;
  trialEndsAt: number | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
}) {
  const trialDaysLeft = getDaysUntil(args.trialEndsAt);
  const trialExpired = isTrialExpired({ trialEndsAt: args.trialEndsAt });

  if (trialExpired && !hasActiveSubscription(args.status)) {
    return {
      tone: "border-red-500/20 bg-red-500/10 text-red-100",
      title: "Trial access has ended",
      body:
        "Activate a paid plan to keep kiosk check-ins, campaigns, and automated follow-up running for this workspace.",
    };
  }

  if (args.status === "NONE") {
    return {
      tone: "border-sky-500/20 bg-sky-500/10 text-sky-100",
      title: "Start billing before launch week",
      body:
        "Activate a plan now so your business can finish setup, test kiosk flows, and avoid a last-minute billing scramble.",
    };
  }

  if (args.status === "TRIALING") {
    return {
      tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
      title:
        trialDaysLeft === 0
          ? "Trial ends today"
          : `Trial active${trialDaysLeft !== null ? ` - ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left` : ""}`,
      body:
        "Your workspace is live. Make sure the kiosk, review link, and SMS approvals are tested before the paid cycle begins.",
    };
  }

  if (args.cancelAtPeriodEnd) {
    return {
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-100",
      title: "Cancellation scheduled",
      body: `This subscription is still active and will end on ${formatDate(
        args.currentPeriodEnd
      )}. Open the billing portal if you want to keep the account running.`,
    };
  }

  if (args.status === "PAST_DUE" || args.status === "INCOMPLETE") {
    return {
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-100",
      title: "Payment needs attention",
      body:
        "Stripe could not fully confirm the latest invoice or payment method. Update billing details as soon as possible to avoid service interruption.",
    };
  }

  if (
    args.status === "UNPAID" ||
    args.status === "CANCELED" ||
    args.status === "INCOMPLETE_EXPIRED"
  ) {
    return {
      tone: "border-red-500/20 bg-red-500/10 text-red-100",
      title: "Subscription is not active",
      body:
        "Pick a plan again to restore active billing and keep this workspace ready for live customer use.",
    };
  }

  return {
    tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
    title: "Billing is healthy",
    body:
      "Your subscription is active. You can switch plans anytime or use the Stripe portal for invoices, card updates, and cancellation.",
  };
}

async function postJson(url: string, body?: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : "{}",
  });

  const data = (await response.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
    synced?: boolean;
    trialing?: boolean;
    hasImmediateCharge?: boolean;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }

  return data;
}

export default function BillingPage() {
  const restaurantId = useRestaurantId();
  const searchParams = useSearchParams();
  const { convexUser, isLoading: userLoading } = useEnsureUser();
  const summary = useQuery(
    api.billing.getBillingSummary,
    restaurantId ? { restaurantId } : "skip"
  );
  const referralSummary = useQuery(
    api.billing.getReferralProgramSummary,
    restaurantId ? { restaurantId } : "skip"
  );
  type ReferralItem = NonNullable<typeof referralSummary>["items"][number];
  const [loadingTier, setLoadingTier] = useState<number | null>(null);
  const [loadingAddonKey, setLoadingAddonKey] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [syncingCheckout, setSyncingCheckout] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("MONTHLY");
  const ensureDefaults = useMutation(
    api.billing.ensureRestaurantMonetizationDefaults
  );

  const banner = useMemo(() => {
    if (searchParams.get("checkout") === "success") {
      return "Checkout completed. We are syncing the subscription with your workspace now.";
    }
    if (searchParams.get("checkout") === "cancelled") {
      return "Checkout was cancelled. You can restart it any time.";
    }
    if (searchParams.get("plan") === "updated") {
      return "Your plan was updated successfully.";
    }
    return null;
  }, [searchParams]);

  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");

    if (checkoutStatus !== "success" || !sessionId) {
      return;
    }

    let cancelled = false;

    const syncCheckoutSession = async () => {
      setSyncingCheckout(true);
      setError(null);
      try {
        const result = await postJson("/api/stripe/checkout/session", {
          sessionId,
        });

        if (cancelled) return;

        setSyncMessage(
          result.message
            ? result.message
            : result.synced
              ? result.trialing
                ? "Subscription synced. Because this checkout starts with a trial, Stripe may not show an immediate payment yet."
                : "Subscription synced successfully."
              : "Checkout finished, but Stripe is still finalizing the subscription record."
        );
      } catch (syncError) {
        if (cancelled) return;

        setError(
          syncError instanceof Error
            ? syncError.message
            : "Unable to sync checkout session"
        );
      } finally {
        if (!cancelled) {
          setSyncingCheckout(false);
        }
      }
    };

    void syncCheckoutSession();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    if (!summary) {
      return;
    }

    setBillingInterval(summary.billingInterval);
  }, [summary]);

  useEffect(() => {
    if (!restaurantId || !summary || summary.referralCode) {
      return;
    }

    void ensureDefaults({ restaurantId });
  }, [ensureDefaults, restaurantId, summary]);

  const startCheckout = async (tier: number) => {
    setError(null);
    setLoadingTier(tier);
    try {
      const result = await postJson("/api/stripe/checkout", {
        tier,
        billingInterval,
      });
      if (result.url) {
        window.location.assign(result.url);
      }
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to open checkout"
      );
    } finally {
      setLoadingTier(null);
    }
  };

  const startAddonCheckout = async (addonKey: string) => {
    setError(null);
    setLoadingAddonKey(addonKey);
    try {
      const result = await postJson("/api/stripe/checkout", { addonKey });
      if (result.url) {
        window.location.assign(result.url);
      }
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to open add-on checkout"
      );
    } finally {
      setLoadingAddonKey(null);
    }
  };

  const openPortal = async () => {
    setError(null);
    setOpeningPortal(true);
    try {
      const result = await postJson("/api/stripe/portal");
      if (result.url) {
        window.location.assign(result.url);
      }
    } catch (portalError) {
      setError(
        portalError instanceof Error
          ? portalError.message
          : "Unable to open billing portal"
      );
    } finally {
      setOpeningPortal(false);
    }
  };

  if (!restaurantId || summary === undefined || userLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-500">Loading billing...</p>
      </div>
    );
  }

  if (!canAccessBilling(convexUser?.role)) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-amber-100">
        <p className="text-sm font-semibold">Billing is restricted</p>
        <p className="mt-2 text-sm leading-7 opacity-90">
          Only the workspace owner can manage subscription, invoices, and payment
          details. Ask the owner to open billing for this account.
        </p>
      </div>
    );
  }

  const statusLabel = formatSubscriptionStatus(summary.subscriptionStatus);
  const statusTone = getSubscriptionTone(summary.subscriptionStatus);
  const summaryBanner = getPrimaryBillingMessage({
    status: summary.subscriptionStatus,
    trialEndsAt: summary.trialEndsAt,
    cancelAtPeriodEnd: summary.cancelAtPeriodEnd,
    currentPeriodEnd: summary.subscriptionCurrentPeriodEnd,
  });
  const hasSubscription = hasActiveSubscription(summary.subscriptionStatus);
  const trialDaysLeft = getDaysUntil(summary.trialEndsAt);
  const trialExpired = isTrialExpired({ trialEndsAt: summary.trialEndsAt });
  const usagePercent =
    summary.effectiveSmsLimit > 0
      ? Math.min(100, Math.round((summary.smsUsed / summary.effectiveSmsLimit) * 100))
      : 0;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const referralLink = referralSummary
    ? `${appUrl}/?ref=${encodeURIComponent(referralSummary.referralCode)}`
    : "";

  return (
    <div className="space-y-6">
      <WorkspaceHero
        eyebrow="Revenue"
        title="Control subscription health, plan packaging, and add-on expansion"
        description="Billing should feel like part of the operating system, not a separate chore. This workspace keeps trial status, plan changes, add-ons, referral rewards, and Stripe access in one place."
        actions={
          <>
            <Link
              href="/setup"
              className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/65 hover:text-white"
            >
              Back to setup
            </Link>
            <button
              type="button"
              onClick={openPortal}
              disabled={!summary.stripeCustomerId || openingPortal}
              className="rounded-[1.25rem] bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-4 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {openingPortal ? "Opening portal..." : "Open billing portal"}
            </button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <WorkspaceHeroStat
          eyebrow="Plan"
          label="Current workspace tier"
          value={summary.planName}
          note={`${statusLabel} · ${summary.billingInterval.toLowerCase()} cycle`}
          icon="billing"
        />
        <WorkspaceHeroStat
          eyebrow="Usage"
          label="Message runway remaining"
          value={`${Math.max(summary.effectiveSmsLimit - summary.smsUsed, 0)}`}
          note={`${summary.smsUsed}/${summary.effectiveSmsLimit} used this cycle`}
          icon="message"
        />
        <WorkspaceHeroStat
          eyebrow="Referral"
          label="Credits earned so far"
          value={`$${((referralSummary?.creditsEarnedCents ?? 0) / 100).toFixed(0)}`}
          note="Referral rewards can offset future billing automatically."
          icon="rocket"
        />
      </div>

      <div className={`rounded-2xl border px-5 py-4 ${summaryBanner.tone}`}>
        <p className="text-sm font-semibold">{summaryBanner.title}</p>
        <p className="mt-1 text-sm/7 opacity-90">{summaryBanner.body}</p>
      </div>

      {banner && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
          {banner}
        </div>
      )}

      {syncingCheckout && (
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-5 py-4 text-sm text-sky-100">
          Syncing your Stripe checkout to this workspace...
        </div>
      )}

      {syncMessage && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/75">
          {syncMessage}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                Current plan
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                {summary.planName}
              </h2>
              <p className="mt-2 text-sm text-white/45">
                {summary.billingInterval === "ANNUAL"
                  ? `$${summary.annualPrice}/year`
                  : `$${summary.monthlyPrice}/month`}{" "}
                with {summary.smsLimit} plan SMS, plus {summary.smsCreditsBalance} purchased
                credits available.
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone}`}
            >
              {statusLabel}
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                Current period
              </p>
              <p className="mt-2 text-sm text-white/75">
                Ends {formatDate(summary.subscriptionCurrentPeriodEnd)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                Trial
              </p>
              <p className="mt-2 text-sm text-white/75">
                {summary.trialEndsAt
                  ? trialExpired && !hasSubscription
                    ? "Trial expired"
                    : `${trialDaysLeft ?? 0} day${trialDaysLeft === 1 ? "" : "s"} left`
                  : "No trial active"}
              </p>
              {summary.subscriptionStatus === "TRIALING" && (
                <p className="mt-2 text-xs leading-6 text-white/42">
                  Trial subscriptions usually do not create an immediate Stripe
                  charge, so check Stripe subscriptions first instead of only
                  looking at Payments.
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                SMS usage
              </p>
              <p className="mt-2 text-sm text-white/75">
                {summary.smsUsed} / {summary.effectiveSmsLimit} available
              </p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full ${
                    usagePercent >= 90 ? "bg-amber-400" : "bg-emerald-400"
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                Cancellation
              </p>
              <p className="mt-2 text-sm text-white/75">
                {summary.cancelAtPeriodEnd
                  ? `Ends on ${formatDate(summary.subscriptionCurrentPeriodEnd)}`
                  : "Renews automatically"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                Billing cadence
              </p>
              <p className="mt-2 text-sm text-white/75">
                {summary.billingInterval === "ANNUAL"
                  ? "Annual billing"
                  : "Monthly billing"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                Purchased SMS credits
              </p>
              <p className="mt-2 text-sm text-white/75">
                {summary.smsCreditsBalance} credits remaining
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                Premium AI
              </p>
              <p className="mt-2 text-sm text-white/75">
                {summary.premiumAiEnabled ? "Active" : "Not active"}
              </p>
            </div>
          </div>
      </section>

      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-white/28">
              Billing cadence
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Monthly or annual pricing
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/45">
              Annual billing helps agencies and established operators lock in a lower
              effective monthly rate while reducing churn and invoice overhead.
            </p>
          </div>
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
            {(["MONTHLY", "ANNUAL"] as const).map((interval) => {
              const active = billingInterval === interval;
              return (
                <button
                  key={interval}
                  type="button"
                  onClick={() => setBillingInterval(interval)}
                  className={`rounded-full px-4 py-2 text-sm transition-all ${
                    active
                      ? "bg-[linear-gradient(135deg,#34d399,#38bdf8)] font-semibold text-slate-950"
                      : "text-white/55"
                  }`}
                >
                  {interval === "MONTHLY" ? "Monthly" : "Annual"}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-white/28">
            Recommended next actions
          </p>
          <div className="mt-5 space-y-3">
            {[
              summary.subscriptionStatus === "NONE"
                ? "Start a plan before handing the kiosk to staff so live visits are tied to a real subscription."
                : "Keep your payment method current in Stripe so review and SMS flows do not get interrupted.",
              summary.subscriptionStatus === "TRIALING"
                ? "Use the trial period to test kiosk branding, Google routing, and owner approval workflow end-to-end."
                : "Use the portal for invoices, receipts, card updates, and cancellation management.",
              summary.subscriptionStatus === "PAST_DUE" ||
              summary.subscriptionStatus === "INCOMPLETE" ||
              summary.subscriptionStatus === "UNPAID"
                ? "Open the billing portal now and resolve payment issues before staff start relying on automated follow-up."
                : "Switch plans anytime if SMS usage is outgrowing the current allowance.",
              "Finish onboarding by confirming the review link, kiosk branding, and AI tone settings after billing is active.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm leading-7 text-white/58"
              >
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-white/28">
              Referral program
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Invite another business and both get rewarded
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/45">
              When another workspace signs up through your link and activates billing,
              they receive a referral discount at checkout and you receive invoice
              credit on your own subscription.
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/55">
            Earned so far: $
            {((summary.referralCreditsEarnedCents ?? 0) / 100).toFixed(2)}
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-white/28">
              Your referral link
            </p>
            <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/70">
              {referralLink || "Loading referral link..."}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={async () => {
                  if (!referralLink) return;
                  await navigator.clipboard.writeText(referralLink);
                  setCopiedReferral(true);
                  window.setTimeout(() => setCopiedReferral(false), 1800);
                }}
                className="rounded-xl bg-[linear-gradient(135deg,#34d399,#4cc9f0)] px-4 py-2 text-sm font-semibold text-slate-950"
              >
                {copiedReferral ? "Copied" : "Copy link"}
              </button>
              {referralSummary && (
                <div className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60">
                  Code: <span className="text-white">{referralSummary.referralCode}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                Total referrals
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {referralSummary?.totalReferrals ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                Activated
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {referralSummary?.subscribedReferrals ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                Rewarded
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {referralSummary?.rewardedReferrals ?? 0}
              </p>
            </div>
          </div>
        </div>

        {referralSummary && referralSummary.items.length > 0 && (
          <div className="mt-6 space-y-3">
            {referralSummary.items.map((item: ReferralItem) => (
              <div
                key={item._id}
                className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {item.referredRestaurantName ?? item.referredEmail ?? "Pending referral"}
                    </p>
                    <p className="mt-1 text-xs text-white/38">
                      Status: {item.status.toLowerCase()} • reward $
                      {(item.rewardAmountCents / 100).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-xs text-white/34">
                    Created {new Date(item.createdAt).toLocaleDateString("en-US")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        {BILLING_PLANS.map((plan) => {
          const isCurrentSelection =
            plan.tier === summary.tier && billingInterval === summary.billingInterval;
          const displayPrice =
            billingInterval === "ANNUAL" ? plan.annualPrice : plan.price;
          const savings =
            billingInterval === "ANNUAL" ? Math.max(0, plan.price * 12 - plan.annualPrice) : 0;

          return (
            <section
              key={plan.key}
              className={`rounded-2xl border p-6 backdrop-blur-sm ${
                plan.highlighted
                  ? "border-emerald-500/25 bg-emerald-500/[0.08] shadow-[0_0_0_1px_rgba(16,185,129,0.08)]"
                  : "border-white/5 bg-white/[0.02]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">{plan.name}</h2>
                  <p className="mt-2 text-sm text-white/42">{plan.summary}</p>
                </div>
                {plan.highlighted && (
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-200">
                    Popular
                  </span>
                )}
              </div>

              <div className="mt-6">
                <p className="text-4xl font-light text-white">${displayPrice}</p>
                <p className="mt-1 text-sm text-white/42">
                  {billingInterval === "ANNUAL" ? "per year" : "per month"}
                </p>
                {billingInterval === "ANNUAL" && savings > 0 && (
                  <p className="mt-2 text-xs text-emerald-200">
                    Save ${savings}/year versus monthly billing
                  </p>
                )}
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="text-sm text-white/62">
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => startCheckout(plan.tier)}
                disabled={loadingTier === plan.tier || (isCurrentSelection && hasSubscription)}
                className={`mt-8 w-full rounded-[1.35rem] px-5 py-4 text-sm font-semibold transition-all ${
                  isCurrentSelection && hasSubscription
                    ? "cursor-not-allowed border border-white/10 text-white/35"
                    : "bg-[linear-gradient(135deg,#34d399,#4cc9f0)] text-slate-950 shadow-[0_18px_40px_rgba(76,201,240,0.18)]"
                }`}
              >
                {loadingTier === plan.tier
                  ? "Opening Stripe..."
                  : isCurrentSelection && hasSubscription
                    ? "Current plan"
                    : hasSubscription
                      ? `Switch to ${plan.name} ${billingInterval === "ANNUAL" ? "annual" : "monthly"}`
                      : `Start ${plan.name}`}
              </button>
            </section>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                Usage add-ons
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Buy extra SMS capacity
              </h2>
              <p className="mt-2 text-sm text-white/45">
                Add one-time SMS packs when campaigns or recovery volume spike beyond
                the current plan.
              </p>
            </div>
            <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/45">
              {summary.smsCreditsBalance} credits available
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {SMS_PACK_ADDONS.map((addon) => (
              <div
                key={addon.key}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-5"
              >
                <p className="text-lg font-semibold text-white">{addon.name}</p>
                <p className="mt-2 text-sm text-white/45">{addon.description}</p>
                <p className="mt-5 text-3xl font-light text-white">${addon.price}</p>
                <p className="mt-1 text-sm text-white/42">
                  One-time purchase for {addon.credits} extra SMS credits
                </p>
                <button
                  type="button"
                  onClick={() => startAddonCheckout(addon.key)}
                  disabled={loadingAddonKey === addon.key}
                  className="mt-6 w-full rounded-[1.35rem] bg-[linear-gradient(135deg,#34d399,#4cc9f0)] px-5 py-4 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(76,201,240,0.18)] disabled:opacity-60"
                >
                  {loadingAddonKey === addon.key
                    ? "Opening Stripe..."
                    : `Buy ${addon.credits} credits`}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                AI add-on
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {PREMIUM_AI_ADDON.name}
              </h2>
              <p className="mt-2 text-sm text-white/45">
                Turn on stronger AI generation for campaign copy, recovery drafts,
                sentiment analysis, and public review replies.
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs ${
                summary.premiumAiEnabled
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                  : "border-white/10 text-white/45"
              }`}
            >
              {summary.premiumAiEnabled ? "Active" : "Optional"}
            </span>
          </div>

          <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
            <p className="text-3xl font-light text-white">${PREMIUM_AI_ADDON.price}</p>
            <p className="mt-1 text-sm text-white/42">per month</p>
            <ul className="mt-5 space-y-3">
              {PREMIUM_AI_ADDON.features.map((feature) => (
                <li key={feature} className="text-sm text-white/62">
                  {feature}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => startAddonCheckout(PREMIUM_AI_ADDON.key)}
              disabled={summary.premiumAiEnabled || loadingAddonKey === PREMIUM_AI_ADDON.key}
              className={`mt-6 w-full rounded-[1.35rem] px-5 py-4 text-sm font-semibold ${
                summary.premiumAiEnabled
                  ? "cursor-not-allowed border border-white/10 text-white/35"
                  : "bg-[linear-gradient(135deg,#34d399,#4cc9f0)] text-slate-950 shadow-[0_18px_40px_rgba(76,201,240,0.18)]"
              }`}
            >
              {summary.premiumAiEnabled
                ? "Premium AI active"
                : loadingAddonKey === PREMIUM_AI_ADDON.key
                  ? "Opening Stripe..."
                  : "Activate Premium AI"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
