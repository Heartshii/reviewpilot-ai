"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = typeof params?.token === "string" ? params.token : "";
  const invite = useQuery(
    api.users.getStaffInviteByToken,
    token ? { token } : "skip"
  );
  const acceptStaffInvite = useMutation(api.users.acceptStaffInvite);
  const email =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress;

  const acceptInvite = async () => {
    if (!user?.id || !email || !token) return;

    setSubmitting(true);
    setError(null);
    try {
      await acceptStaffInvite({
        token,
        clerkId: user.id,
        email,
      });
      router.push("/dashboard");
      router.refresh();
    } catch (acceptError) {
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : "Unable to accept invite"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-shell px-2 py-16 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-300/80">
            Workspace invite
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-white">
            Join a ReviewPilot workspace
          </h1>

          {invite === undefined && (
            <p className="mt-5 text-sm leading-7 text-white/58">
              Loading invite details...
            </p>
          )}

          {invite === null && (
            <p className="mt-5 text-sm leading-7 text-red-200">
              This invite link is invalid or no longer available.
            </p>
          )}

          {invite && (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-sm text-white/55">Workspace</p>
                <p className="mt-2 text-lg font-medium text-white">
                  {invite.restaurantName}
                </p>
                <p className="mt-2 text-sm text-white/55">
                  Role: <span className="text-white">{invite.role}</span>
                </p>
                <p className="mt-1 text-sm text-white/55">
                  Invited email: <span className="text-white">{invite.email}</span>
                </p>
              </div>

              {!isLoaded ? (
                <p className="text-sm leading-7 text-white/58">Checking your account...</p>
              ) : !user ? (
                <div className="space-y-3">
                  <p className="text-sm leading-7 text-white/58">
                    Sign in with the invited email address to accept this workspace invite.
                  </p>
                  <Link
                    href={`/sign-in?redirect_url=/accept-invite/${token}`}
                    className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#34d399,#4cc9f0)] px-5 py-3.5 text-sm font-semibold text-slate-950"
                  >
                    Sign in to accept
                  </Link>
                </div>
              ) : email?.toLowerCase() !== invite.email.toLowerCase() ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
                  You are signed in as {email}, but this invite belongs to {invite.email}.
                </div>
              ) : invite.status !== "PENDING" ? (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-white/75">
                  This invite has already been {invite.status.toLowerCase()}.
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm leading-7 text-white/58">
                    Accept this invite to join {invite.restaurantName} and open the workspace dashboard.
                  </p>
                  <button
                    type="button"
                    onClick={() => void acceptInvite()}
                    disabled={submitting}
                    className="rounded-2xl bg-[linear-gradient(135deg,#34d399,#4cc9f0)] px-5 py-3.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
                  >
                    {submitting ? "Joining workspace..." : "Accept invite"}
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
