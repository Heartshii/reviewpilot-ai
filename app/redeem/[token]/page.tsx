"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function RedeemRewardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [resolvedToken, setResolvedToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  useEffect(() => {
    void params.then(({ token }) => setResolvedToken(token));
  }, [params]);

  const claim = useQuery(
    api.loyalty.getPublicClaimByToken,
    resolvedToken ? { token: resolvedToken } : "skip"
  );
  const claimReward = useMutation(api.loyalty.claimRewardByToken);

  const handleClaim = async () => {
    if (!resolvedToken) return;
    setBusy(true);
    setResultMessage(null);
    try {
      const result = await claimReward({ token: resolvedToken });
      if (result.status === "CLAIMED" || result.status === "REDEEMED") {
        setResultMessage(
          result.claimCode
            ? `Saved. Show code ${result.claimCode} to the business team.`
            : "Saved."
        );
      } else if (result.status === "EXPIRED") {
        setResultMessage("This reward link has expired.");
      }
    } catch (error) {
      setResultMessage(
        error instanceof Error ? error.message : "Unable to claim reward."
      );
    } finally {
      setBusy(false);
    }
  };

  if (!resolvedToken || claim === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-white">
        <p className="text-sm text-white/55">Loading reward...</p>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-white">
        <div className="w-full max-w-xl rounded-[2rem] border border-white/8 bg-white/[0.03] p-8 text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-white/28">
            Reward unavailable
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-white">
            This reward link could not be found
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/55">
            Ask the business to send you a fresh loyalty reward link.
          </p>
        </div>
      </div>
    );
  }

  const isClaimed = claim.status === "CLAIMED" || claim.status === "REDEEMED";
  const isExpired = claim.status === "EXPIRED";

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10 text-white">
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/8 bg-[#07111d]/88 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.18em] text-white/28">
          Loyalty reward
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-white">
          {claim.reward.title}
        </h1>
        <p className="mt-3 text-sm leading-7 text-white/55">
          {claim.reward.description ??
            `Claim this reward from ${claim.restaurantName} using your loyalty points.`}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/30">
              Reward cost
            </p>
            <p className="mt-2 text-2xl font-semibold text-emerald-300">
              {claim.reward.pointsCost} pts
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/30">
              Your balance
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {claim.customerPoints} pts
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/30">
              Status
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {claim.status}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
          <p className="text-sm text-white/62">
            Sent to {claim.customerName}. This reward link expires on{" "}
            {new Date(claim.expiresAt).toLocaleString()}.
          </p>

          {claim.claimCode ? (
            <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-emerald-100/70">
                Claim code
              </p>
              <p className="mt-2 text-3xl font-semibold text-emerald-200">
                {claim.claimCode}
              </p>
              <p className="mt-2 text-sm text-emerald-100/80">
                Show this code to the business team when you redeem the reward.
              </p>
            </div>
          ) : null}

          {resultMessage ? (
            <p className="mt-4 text-sm text-white/72">{resultMessage}</p>
          ) : null}

          {!isClaimed && !isExpired ? (
            <button
              type="button"
              onClick={() => void handleClaim()}
              disabled={busy}
              className="mt-6 rounded-[1.25rem] bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-6 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
            >
              {busy ? "Claiming..." : `Claim for ${claim.reward.pointsCost} points`}
            </button>
          ) : null}

          {isExpired ? (
            <p className="mt-6 text-sm text-rose-300">
              This reward link has expired. Ask {claim.restaurantName} to send a
              fresh one.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
