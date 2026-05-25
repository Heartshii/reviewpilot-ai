import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { IconBadge } from "@/components/ui/premium-icon";
import { useE2ESession } from "@/hooks/useE2ESession";
import { useEnsureUser } from "@/hooks/useEnsureUser";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function statusLabel(customer: {
  isLoyal: boolean;
  isInactive: boolean;
  isUnhappy: boolean;
}) {
  if (customer.isUnhappy) {
    return { text: "Needs recovery", tone: "bg-red-500/15 text-red-300" };
  }
  if (customer.isLoyal) {
    return { text: "Loyal", tone: "bg-emerald-500/15 text-emerald-300" };
  }
  if (customer.isInactive) {
    return { text: "Inactive", tone: "bg-amber-500/15 text-amber-200" };
  }
  return { text: "Active", tone: "bg-blue-500/15 text-blue-300" };
}

function initialsFor(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function CustomerDrawer({
  customer,
  smsHistory,
  receiptHistory,
  restaurantId,
  onClose,
  isLoadingSms = false,
  isLoadingReceipts = false,
}: {
  customer: {
    _id: Id<"customers">;
    name: string;
    phone: string;
    email?: string;
    points: number;
    visitCount: number;
    birthdayMonth?: number;
    birthdayDay?: number;
    visitNote?: string;
    latestRating?: number;
    isLoyal: boolean;
    isInactive: boolean;
    isUnhappy: boolean;
    totalSpent: number;
    lastBillAmount?: number;
    optedInSms: boolean;
    optedInEmail?: boolean;
  };
  smsHistory: { content: string; sentAt: number; smsType: string }[];
  receiptHistory: {
    billAmount: number;
    pointsEarned: number;
    submittedAt: number;
    status: string;
  }[];
  restaurantId: Id<"restaurants">;
  onClose: () => void;
  isLoadingSms?: boolean;
  isLoadingReceipts?: boolean;
}) {
  const [visitNote, setVisitNote] = useState(customer.visitNote ?? "");
  const [email, setEmail] = useState(customer.email ?? "");
  const [optedInSms, setOptedInSms] = useState(customer.optedInSms);
  const [optedInEmail, setOptedInEmail] = useState(customer.optedInEmail === true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPrivacyActions, setShowPrivacyActions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const { user } = useUser();
  const { session: e2eSession } = useE2ESession();
  const { convexUser } = useEnsureUser();
  const activeClerkId = user?.id ?? e2eSession?.clerkId ?? "";
  const canManagePrivacy =
    convexUser?.role === "OWNER" || convexUser?.role === "SUPER_ADMIN";

  const updateNote = useMutation(api.dashboardMutations.updateCustomerVisitNote);
  const updateContactPreferences = useMutation(
    api.dashboardMutations.updateCustomerContactPreferences
  );
  const deleteCustomerPrivacyData = useMutation(
    api.dashboardMutations.deleteCustomerPrivacyData
  );
  const customerPrivacyExport = useQuery(
    api.queries.getCustomerPrivacyExport,
    canManagePrivacy
      ? {
          actorClerkId: activeClerkId,
          customerId: customer._id,
          restaurantId,
        }
      : "skip"
  );

  const handleSaveNote = async () => {
    setSaving(true);
    try {
      await updateNote({ customerId: customer._id, restaurantId, visitNote });
      setToast({ message: "Note saved successfully", type: "success" });
      window.setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("Failed to save note:", error);
      setToast({ message: "Failed to save note", type: "error" });
      window.setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!canManagePrivacy || !activeClerkId) {
      return;
    }

    void deleteCustomerPrivacyData({
      actorClerkId: activeClerkId,
      customerId: customer._id,
      restaurantId,
    });
    onClose();
  };

  const handleSaveContact = async () => {
    setSaving(true);
    try {
      await updateContactPreferences({
        customerId: customer._id,
        restaurantId,
        email: email.trim() || undefined,
        optedInSms,
        optedInEmail,
      });
      setToast({ message: "Contact preferences updated", type: "success" });
      window.setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("Failed to update contact preferences:", error);
      setToast({ message: "Failed to update contact preferences", type: "error" });
      window.setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!canManagePrivacy || !customerPrivacyExport) {
      return;
    }

    try {
      const payload = JSON.stringify(customerPrivacyExport, null, 2);
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${customer.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-privacy-export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setToast({ message: "Customer export downloaded", type: "success" });
      window.setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("Failed to export customer data:", error);
      setToast({ message: "Failed to export customer data", type: "error" });
      window.setTimeout(() => setToast(null), 3000);
    }
  };

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const status = statusLabel(customer);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close customer drawer"
        className="absolute inset-0 bg-[#020711]/78 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative flex h-full w-full max-w-[44rem] animate-in slide-in-from-right duration-300">
        <div className="absolute left-0 top-0 h-full w-px bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.16),transparent)]" />
        <aside className="relative flex h-full w-full flex-col overflow-hidden border-l border-white/10 bg-[linear-gradient(180deg,rgba(5,11,20,0.98),rgba(9,17,28,0.97))] shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)] opacity-90" />
          <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(76,201,240,0.15),transparent_62%)] blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(52,211,153,0.12),transparent_62%)] blur-3xl" />

          <div className="relative border-b border-white/8 px-6 pb-6 pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] border border-white/10 bg-white/[0.05] font-display text-base font-semibold tracking-[0.24em] text-white/74">
                  {initialsFor(customer.name)}
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/32">
                    Customer profile
                  </p>
                  <h2 className="mt-3 font-display text-[2rem] font-semibold tracking-[-0.05em] text-white">
                    {customer.name}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs ${status.tone}`}>
                      {status.text}
                    </span>
                    <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-white/64">
                      {customer.phone}
                    </span>
                    {customer.email ? (
                      <span className="rounded-full border border-sky-400/18 bg-sky-400/10 px-3 py-1 text-xs text-sky-200">
                        {customer.email}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/55 transition-colors hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Visits", value: customer.visitCount.toString(), icon: "repeat" as const },
                { label: "Lifetime spend", value: formatCurrency(customer.totalSpent), icon: "spend" as const },
                { label: "Loyalty points", value: customer.points.toString(), icon: "loyalty" as const },
                {
                  label: "Latest rating",
                  value:
                    customer.latestRating !== undefined
                      ? `${customer.latestRating}/5`
                      : "--",
                  icon: "reviews" as const,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.4rem] border border-white/10 bg-black/10 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">
                      {item.label}
                    </p>
                    <IconBadge
                      name={item.icon}
                      className="h-9 w-9 border-white/8 bg-white/[0.03] text-white/64"
                      iconClassName="h-[15px] w-[15px]"
                    />
                  </div>
                  <p className="mt-3 font-display text-[1.5rem] font-semibold tracking-[-0.04em] text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {customer.birthdayMonth != null && customer.birthdayDay != null ? (
              <div className="mt-4 inline-flex rounded-full border border-pink-400/18 bg-pink-400/10 px-4 py-2 text-xs tracking-[0.16em] text-pink-200">
                Birthday on {months[customer.birthdayMonth - 1]} {customer.birthdayDay}
              </div>
            ) : null}
          </div>

          <div className="relative flex-1 overflow-y-auto px-6 py-6">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <section className="space-y-5">
                <div className="rounded-[1.65rem] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex items-start gap-3">
                    <IconBadge
                      name="message"
                      className="h-11 w-11 border-white/10 bg-white/[0.03] text-white/72"
                      iconClassName="h-[17px] w-[17px]"
                    />
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                        Contact permissions
                      </p>
                      <p className="mt-2 text-sm leading-7 text-white/52">
                        Keep message permissions clean before you launch review, recovery, or lifecycle outreach.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="customer@example.com"
                      className="w-full rounded-[1.15rem] border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/26"
                    />
                    <label className="flex items-center gap-3 rounded-[1.15rem] border border-white/8 bg-black/10 px-4 py-3 text-sm text-white/72">
                      <input
                        type="checkbox"
                        checked={optedInSms}
                        onChange={(e) => setOptedInSms(e.target.checked)}
                        className="h-4 w-4 accent-emerald-500"
                      />
                      SMS opt-in enabled
                    </label>
                    <label className="flex items-center gap-3 rounded-[1.15rem] border border-white/8 bg-black/10 px-4 py-3 text-sm text-white/72">
                      <input
                        type="checkbox"
                        checked={optedInEmail}
                        onChange={(e) => setOptedInEmail(e.target.checked)}
                        className="h-4 w-4 accent-sky-500"
                      />
                      Email opt-in enabled
                    </label>
                    <button
                      type="button"
                      onClick={handleSaveContact}
                      className="rounded-[1.15rem] border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm font-medium text-sky-200"
                    >
                      {saving ? "Saving..." : "Save contact preferences"}
                    </button>
                  </div>
                </div>

                <div className="rounded-[1.65rem] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex items-start gap-3">
                    <IconBadge
                      name="receipt"
                      className="h-11 w-11 border-white/10 bg-white/[0.03] text-white/72"
                      iconClassName="h-[17px] w-[17px]"
                    />
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                        Bill and points history
                      </p>
                      <p className="mt-2 text-sm leading-7 text-white/52">
                        Every visit stays tied to spend and points so staff can see real customer value.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {isLoadingReceipts ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-emerald-500/60" />
                      </div>
                    ) : receiptHistory.length === 0 ? (
                      <div className="rounded-[1.2rem] border border-white/8 bg-black/10 px-4 py-4 text-sm text-white/42">
                        No bill history recorded yet.
                      </div>
                    ) : (
                      receiptHistory.map((receipt, index) => (
                        <div
                          key={`${receipt.submittedAt}-${index}`}
                          className="rounded-[1.2rem] border border-white/8 bg-black/10 px-4 py-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {formatCurrency(receipt.billAmount)}
                              </p>
                              <p className="mt-1 text-xs text-white/38">
                                {new Date(receipt.submittedAt).toLocaleString()} · {receipt.status}
                              </p>
                            </div>
                            <span className="rounded-full border border-emerald-400/18 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                              +{receipt.pointsEarned} pts
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-5">
                <div className="rounded-[1.65rem] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex items-start gap-3">
                    <IconBadge
                      name="sms"
                      className="h-11 w-11 border-white/10 bg-white/[0.03] text-white/72"
                      iconClassName="h-[17px] w-[17px]"
                    />
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                        Message history
                      </p>
                      <p className="mt-2 text-sm leading-7 text-white/52">
                        Review the last delivered messages before you send recovery, loyalty, or review prompts.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {isLoadingSms ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-emerald-500/60" />
                      </div>
                    ) : smsHistory.length === 0 ? (
                      <div className="rounded-[1.2rem] border border-white/8 bg-black/10 px-4 py-4 text-sm text-white/42">
                        No messages yet.
                      </div>
                    ) : (
                      smsHistory.map((msg, index) => (
                        <div
                          key={`${msg.sentAt}-${index}`}
                          className="rounded-[1.2rem] border border-white/8 bg-black/10 px-4 py-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <p className="text-sm leading-7 text-white/82">{msg.content}</p>
                            <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/55">
                              {msg.smsType}
                            </span>
                          </div>
                          <p className="mt-3 text-xs text-white/36">
                            {new Date(msg.sentAt).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[1.65rem] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex items-start gap-3">
                    <IconBadge
                      name="spark"
                      className="h-11 w-11 border-white/10 bg-white/[0.03] text-white/72"
                      iconClassName="h-[17px] w-[17px]"
                    />
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                        Internal note
                      </p>
                      <p className="mt-2 text-sm leading-7 text-white/52">
                        Keep a clean summary of context the next operator should know before reaching out.
                      </p>
                    </div>
                  </div>

                  <textarea
                    value={visitNote}
                    onChange={(e) => setVisitNote(e.target.value)}
                    rows={5}
                    className="mt-5 w-full rounded-[1.2rem] border border-white/8 bg-black/10 px-4 py-3 text-sm text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    disabled={saving}
                    className="mt-4 rounded-[1.2rem] bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save note"}
                  </button>
                </div>

                <div className="rounded-[1.65rem] border border-white/8 bg-white/[0.03] p-5">
                  {canManagePrivacy ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <IconBadge
                          name="shield"
                          className="h-11 w-11 border-white/10 bg-white/[0.03] text-white/72"
                          iconClassName="h-[17px] w-[17px]"
                        />
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                            Privacy request tools
                          </p>
                          <p className="mt-2 text-sm leading-7 text-white/52">
                            Export the full customer record bundle or permanently delete the customer and linked history from this workspace.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => void handleExport()}
                          className="rounded-[1.15rem] border border-emerald-400/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-200"
                        >
                          Export customer data
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPrivacyActions((value) => !value)}
                          className="rounded-[1.15rem] border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/70"
                        >
                          {showPrivacyActions ? "Hide delete tools" : "Show delete tools"}
                        </button>
                      </div>

                      {showPrivacyActions ? (
                        <div className="rounded-[1.2rem] border border-red-500/20 bg-red-500/10 p-4">
                          <p className="text-sm leading-7 text-red-100/92">
                            Deleting this customer removes receipts, feedback, SMS history, loyalty claims, recovery calls, and the customer record itself.
                          </p>
                          {!showConfirm ? (
                            <button
                              type="button"
                              onClick={() => setShowConfirm(true)}
                              className="mt-4 rounded-[1.1rem] border border-red-500/20 bg-red-500/20 px-4 py-2.5 text-sm font-medium text-red-100"
                            >
                              Delete all customer data
                            </button>
                          ) : (
                            <div className="mt-4 flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() => setShowConfirm(false)}
                                className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white/72"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleDelete}
                                className="rounded-[1.1rem] bg-red-500 px-4 py-2.5 text-sm font-medium text-white"
                              >
                                Confirm delete
                              </button>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-white/34">
                      Privacy export and deletion are owner-only actions.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </div>

          {toast ? (
            <div className="absolute bottom-5 right-5">
              <div
                className={`rounded-[1.15rem] border px-4 py-3 text-sm font-medium shadow-lg ${
                  toast.type === "success"
                    ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-200"
                    : "border-red-500/30 bg-red-500/20 text-red-200"
                }`}
              >
                {toast.message}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
