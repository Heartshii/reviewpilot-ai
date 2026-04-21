import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

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
  if (customer.isUnhappy) return { text: "Needs recovery", tone: "bg-red-500/15 text-red-300" };
  if (customer.isLoyal) return { text: "Loyal", tone: "bg-emerald-500/15 text-emerald-300" };
  if (customer.isInactive) return { text: "Inactive", tone: "bg-amber-500/15 text-amber-200" };
  return { text: "Active", tone: "bg-blue-500/15 text-blue-300" };
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
  };
  smsHistory: { content: string; sentAt: number; smsType: string }[];
  receiptHistory: { billAmount: number; pointsEarned: number; submittedAt: number; status: string }[];
  restaurantId: Id<"restaurants">;
  onClose: () => void;
  isLoadingSms?: boolean;
  isLoadingReceipts?: boolean;
}) {
  const [visitNote, setVisitNote] = useState(customer.visitNote ?? "");
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const updateNote = useMutation(api.dashboardMutations.updateCustomerVisitNote);
  const deleteCustomer = useMutation(api.dashboardMutations.deleteCustomer);

  const handleSaveNote = async () => {
    setSaving(true);
    try {
      await updateNote({ customerId: customer._id, restaurantId, visitNote });
      setToast({ message: "Note saved successfully", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error("Failed to save note:", error);
      setToast({ message: "Failed to save note", type: "error" });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    void deleteCustomer({ customerId: customer._id, restaurantId });
    onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="dashboard-surface relative flex h-full w-full max-w-2xl flex-col rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="border-b border-white/7 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">{customer.name}</h2>
              <p className="mt-1 text-sm text-white/42">{customer.phone}</p>
            </div>
            <button onClick={onClose} className="text-sm text-white/42 hover:text-white">
              Close
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs ${status.tone}`}>
              {status.text}
            </span>
            <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1 text-xs text-white/60">
              {customer.visitCount} visits
            </span>
            <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1 text-xs text-white/60">
              {customer.points} points
            </span>
            <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1 text-xs text-white/60">
              {formatCurrency(customer.totalSpent)} lifetime spend
            </span>
            {customer.latestRating !== undefined && (
              <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1 text-xs text-white/60">
                Latest rating {customer.latestRating}/5
              </span>
            )}
            {customer.birthdayMonth != null && customer.birthdayDay != null && (
              <span className="rounded-full border border-pink-400/20 bg-pink-400/10 px-3 py-1 text-xs text-pink-200">
                Birthday {months[customer.birthdayMonth - 1]} {customer.birthdayDay}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-auto pt-5">
          <section className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Visits", value: customer.visitCount.toString() },
              { label: "Lifetime spend", value: formatCurrency(customer.totalSpent) },
              { label: "Loyalty points", value: customer.points.toString() },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/8 bg-white/4 px-4 py-4"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                  {item.label}
                </p>
                <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </section>

          <section>
            <p className="text-xs uppercase tracking-[0.16em] text-white/28">
              Bill and points history
            </p>
            <div className="mt-3 space-y-3">
              {receiptHistory.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-4 text-sm text-white/42">
                  No bill history recorded yet
                </div>
              ) : (
                receiptHistory.map((receipt, index) => (
                  <div
                    key={`${receipt.submittedAt}-${index}`}
                    className="rounded-2xl border border-white/8 bg-white/4 px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-white">
                        {formatCurrency(receipt.billAmount)}
                      </p>
                      <p className="text-xs text-emerald-300">
                        +{receipt.pointsEarned} points
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-white/32">
                      {new Date(receipt.submittedAt).toLocaleString()} • {receipt.status}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <p className="text-xs uppercase tracking-[0.16em] text-white/28">
              Message history
            </p>
            <div className="mt-3 space-y-3">
              {isLoadingSms ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-emerald-500/60" />
                </div>
              ) : smsHistory.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-4 text-sm text-white/42">
                  No messages yet
                </div>
              ) : (
                smsHistory.map((msg, index) => (
                  <div
                    key={`${msg.sentAt}-${index}`}
                    className="rounded-2xl border border-white/8 bg-white/4 px-4 py-4"
                  >
                    <p className="text-sm text-white/82">{msg.content}</p>
                    <p className="mt-2 text-xs text-white/32">
                      {new Date(msg.sentAt).toLocaleString()} • {msg.smsType}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <p className="text-xs uppercase tracking-[0.16em] text-white/28">
              Internal note
            </p>
            <textarea
              value={visitNote}
              onChange={(e) => setVisitNote(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white outline-none"
            />
            <button
              onClick={handleSaveNote}
              disabled={saving}
              className="mt-3 rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save note"}
            </button>
          </section>
        </div>

        <div className="border-t border-white/7 pt-4">
          {showConfirm ? (
            <div className="space-y-3">
              <p className="text-sm text-white/48">
                Remove this customer? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="rounded-2xl border border-white/8 bg-white/4 px-4 py-2.5 text-sm text-white/72"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="rounded-2xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white"
                >
                  Remove customer
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="text-sm text-red-300 hover:text-red-200"
            >
              Remove customer
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className="absolute bottom-4 right-4 rounded-lg px-4 py-3 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div
            className={`${
              toast.type === "success"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-red-500/20 text-red-300 border border-red-500/30"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}