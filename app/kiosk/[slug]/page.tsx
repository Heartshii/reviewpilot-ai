"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "next/navigation";
import {
  useQuery,
  useMutation,
  useConvexConnectionState,
} from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const INACTIVITY_MS = 30_000;
const DEFAULT_ACCENT = "#10b981";

type Screen =
  | "welcome"
  | "new"
  | "returning"
  | "consent"
  | "returning-confirm"
  | "bill"
  | "success"
  | "success-returning";

type QueuedSubmission =
  | {
      type: "new";
      name: string;
      phone: string;
      restaurantId: Id<"restaurants">;
      birthdayMonth?: number;
      birthdayDay?: number;
      optedInSms: boolean;
    }
  | {
      type: "returning";
      name: string;
      phone: string;
      restaurantId: Id<"restaurants">;
    };

const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

// ── Numeric Keypad ──────────────────────────────────────
function NumericKeypad({
  value,
  onChange,
  maxLength = 10,
  placeholder = "",
  accent,
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  placeholder?: string;
  accent: string;
}) {
  const addDigit = (d: string) => {
    if (value.length < maxLength) onChange(value + d);
  };
  const backspace = () => onChange(value.slice(0, -1));

  return (
    <div className="space-y-3">
      {/* Display */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-center text-3xl font-light tracking-[0.3em] text-white backdrop-blur-sm">
        {value
          ? value.replace(/(\d{3})(\d{3})(\d{0,4})/, (_, a, b, c) =>
              c ? `(${a}) ${b}-${c}` : b ? `(${a}) ${b}` : `(${a})`
            )
          : <span className="text-white/20">{placeholder}</span>
        }
        <div
          className="absolute bottom-0 left-0 h-0.5 transition-all duration-300"
          style={{ width: `${(value.length / maxLength) * 100}%`, backgroundColor: accent }}
        />
      </div>

      {/* Keys */}
      <div className="grid grid-cols-3 gap-2">
        {[1,2,3,4,5,6,7,8,9,null,0,"⌫"].map((n) =>
          n === null ? (
            <div key="empty" />
          ) : n === "⌫" ? (
            <button
              key="back"
              type="button"
              onClick={backspace}
              className="flex min-h-[56px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl text-white/70 backdrop-blur-sm transition-all duration-150 active:scale-95 active:bg-white/10"
            >
              ⌫
            </button>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => addDigit(String(n))}
              className="flex min-h-[56px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl font-light text-white backdrop-blur-sm transition-all duration-150 active:scale-95 active:bg-white/15"
            >
              {n}
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ── Glass Card wrapper ───────────────────────────────────
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full max-w-md rounded-3xl border border-white/10 bg-white/8 p-8 shadow-2xl backdrop-blur-xl ${className}`}>
      {children}
    </div>
  );
}

// ── Primary Button ───────────────────────────────────────
function PrimaryButton({
  onClick,
  disabled,
  accent,
  children,
  className = "",
}: {
  onClick?: () => void;
  disabled?: boolean;
  accent: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative min-h-[56px] w-full overflow-hidden rounded-2xl font-semibold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-40 ${className}`}
      style={{ backgroundColor: accent }}
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 bg-white opacity-0 transition-opacity duration-200 hover:opacity-10" />
    </button>
  );
}

// ── Ghost Button ─────────────────────────────────────────
function GhostButton({
  onClick,
  children,
  className = "",
}: {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[56px] w-full rounded-2xl border border-white/15 bg-white/5 font-semibold text-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-white/10 active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  );
}

// ── Main Kiosk Page ──────────────────────────────────────
export default function KioskPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const [screen, setScreen] = useState<Screen>("welcome");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [lastFour, setLastFour] = useState("");
  const [birthdayMonth, setBirthdayMonth] = useState<number | undefined>();
  const [birthdayDay, setBirthdayDay] = useState<number | undefined>();
  const [consent, setConsent] = useState(false);
  const [staffPinOpen, setStaffPinOpen] = useState(false);
  const [staffPin, setStaffPin] = useState("");
  const [countdown, setCountdown] = useState(5);
  const [billAmount, setBillAmount] = useState("");
  const [checkedInCustomerId, setCheckedInCustomerId] = useState<Id<"customers"> | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const lastActivityRef = useRef(0);
  const queueRef = useRef<QueuedSubmission[]>([]);
  const [queueCount, setQueueCount] = useState(0);

  useLayoutEffect(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const restaurant = useQuery(
    api.queries.getRestaurantBySlug,
    slug ? { slug } : "skip"
  );
  const createCustomerMutation = useMutation(api.smsMutations.createCustomer);
  const addReceiptMutation = useMutation(api.smsMutations.addReceiptForCustomer);
  const connectionState = useConvexConnectionState();

  const findCustomer = useQuery(
    api.queries.findCustomerByLastFour,
    lastFour.length === 4 && restaurant
      ? { lastFour, restaurantId: restaurant._id }
      : "skip"
  );

  const accent = restaurant?.restaurantSettings?.kioskAccentColor ?? DEFAULT_ACCENT;
  const displayName = restaurant?.restaurantSettings?.kioskDisplayName ?? restaurant?.name ?? "";
  const logoUrl = restaurant?.restaurantSettings?.kioskLogoUrl;
  const bgImageUrl = restaurant?.restaurantSettings?.kioskBgImageUrl;
  const isOffline = !connectionState.isWebSocketConnected;

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Inactivity reset
  useEffect(() => {
    if (screen === "welcome") return;
    const iv = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_MS) {
        setScreen("welcome");
        setName(""); setPhone(""); setLastFour("");
        setBirthdayMonth(undefined); setBirthdayDay(undefined);
        setConsent(false);
        setBillAmount(""); setCheckedInCustomerId(null); setPointsEarned(0);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [screen]);

  // Auto-return countdown on success
  useEffect(() => {
    if (screen !== "success" && screen !== "success-returning") return;
    queueMicrotask(() => setCountdown(5));
    const iv = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(iv);
          setScreen("welcome");
          setName("");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [screen]);

  // Offline queue replay
  useEffect(() => {
    if (!connectionState.isWebSocketConnected || queueRef.current.length === 0) return;
    const processQueue = async () => {
      const queue = [...queueRef.current];
      for (const item of queue) {
        try {
          await createCustomerMutation({
            name: item.name,
            phone: item.phone,
            restaurantId: item.restaurantId,
            birthdayMonth: item.type === "new" ? item.birthdayMonth : undefined,
            birthdayDay: item.type === "new" ? item.birthdayDay : undefined,
            optedInSms: item.type === "new" ? item.optedInSms : true,
          });
          queueRef.current = queueRef.current.filter((x) => x !== item);
          setQueueCount(queueRef.current.length);
        } catch { break; }
      }
    };
    void processQueue();
  }, [connectionState.isWebSocketConnected, createCustomerMutation]);

  const matchedReturningCustomer = useMemo(() => {
    if (lastFour.length !== 4 || !findCustomer) return null;
    return {
      name: findCustomer.name,
      points: findCustomer.points,
      phone: findCustomer.phone,
    };
  }, [lastFour, findCustomer]);

  const handleCreateCustomer = useCallback(
    async (opts: {
      type: "new" | "returning";
      name: string; phone: string;
      restaurantId: Id<"restaurants">;
      birthdayMonth?: number; birthdayDay?: number; optedInSms?: boolean;
    }) => {
      if (!restaurant) return;
      const payload = {
        name: opts.name, phone: opts.phone,
        restaurantId: opts.restaurantId,
        birthdayMonth: opts.birthdayMonth,
        birthdayDay: opts.birthdayDay,
        optedInSms: opts.optedInSms ?? true,
      };
      try {
        const result = await createCustomerMutation(payload);
        if (opts.type === "returning" && result.existing && result.customer) {
          setCheckedInCustomerId(result.customer._id);
          setScreen("bill");
        } else {
          setScreen(opts.type === "new" ? "success" : "success-returning");
        }
      } catch {
        queueRef.current.push({ ...payload, type: opts.type, optedInSms: opts.optedInSms ?? true } as QueuedSubmission);
        setQueueCount(queueRef.current.length);
        if (opts.type === "returning") {
          // For offline, assume existing and go to bill
          setScreen("bill");
        } else {
          setScreen(opts.type === "new" ? "success" : "success-returning");
        }
      }
    },
    [createCustomerMutation, restaurant]
  );

  // ── Loading / Error states ────────────────────────────
  if (!slug || restaurant === null) {
    return (
      <div suppressHydrationWarning={true} className="flex min-h-screen items-center justify-center bg-transparent text-white">
        <p className="text-zinc-500">{!slug ? "Invalid kiosk URL" : "Restaurant not found"}</p>
      </div>
    );
  }

  if (restaurant === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
          <p className="text-sm text-white/40">Loading…</p>
        </div>
      </div>
    );
  }

  // ── Shared background ─────────────────────────────────
  return (
    <div
      className="fixed inset-0 overflow-y-auto bg-transparent text-white"
      onClick={recordActivity}
      onTouchStart={recordActivity}
    >
      <div
        className="absolute inset-0"
        style={{ backgroundImage: "var(--bg-gradient), var(--bg-grid-pattern)" }}
      />

      {bgImageUrl && (
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: `url(${bgImageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      <div
        className={`absolute inset-0 ${bgImageUrl ? "bg-black/55" : "bg-black/20"}`}
      />

      {/* Subtle radial glow using accent color */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${accent}55, transparent)` }}
      />

      {/* Offline badge */}
      {isOffline && queueCount > 0 && (
        <div className="absolute right-4 top-4 z-50 flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-400 backdrop-blur-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          Offline — {queueCount} queued
        </div>
      )}

      {/* Staff button */}
      <div className="absolute bottom-5 left-5 z-40">
        <button
          type="button"
          onClick={() => setStaffPinOpen(true)}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/30 backdrop-blur-sm transition-all hover:text-white/60"
        >
          Staff
        </button>
      </div>

      {/* Staff PIN modal */}
      {staffPinOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <GlassCard className="max-w-sm">
            <h3 className="mb-6 text-xl font-semibold">Staff Access</h3>
            <input
              type="password"
              value={staffPin}
              onChange={(e) => setStaffPin(e.target.value)}
              placeholder="Enter PIN"
              className="mb-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-lg text-white placeholder-white/20 outline-none focus:border-white/20"
            />
            <div className="flex gap-3">
              <PrimaryButton
                accent={accent}
                onClick={() => { if (staffPin === "1234") window.location.href = "/dashboard"; }}
              >
                Enter
              </PrimaryButton>
              <GhostButton onClick={() => { setStaffPinOpen(false); setStaffPin(""); }}>
                Cancel
              </GhostButton>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center p-6">

        {/* WELCOME */}
        {screen === "welcome" && (
          <div className="flex w-full max-w-md flex-col items-center gap-10 animate-in fade-in duration-500">
            {/* Logo / Name */}
            <div className="flex flex-col items-center gap-4">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary logo URL from restaurant settings
                <img src={logoUrl} alt={displayName} className="max-h-28 max-w-[280px] object-contain drop-shadow-2xl" />
              ) : (
                <div className="text-center">
                  <h1 className="text-5xl font-bold tracking-tight">{displayName}</h1>
                  <div className="mx-auto mt-3 h-0.5 w-16 rounded-full opacity-60" style={{ backgroundColor: accent }} />
                </div>
              )}
              <p className="text-center text-white/50">Join our loyalty program & earn rewards</p>
            </div>

            {/* Buttons */}
            <div className="flex w-full flex-col gap-3">
              <PrimaryButton accent={accent} onClick={() => setScreen("new")}>
                New Customer
              </PrimaryButton>
              <GhostButton onClick={() => { setScreen("returning"); setLastFour(""); }}>
                Returning Customer
              </GhostButton>
            </div>
          </div>
        )}

        {/* NEW CUSTOMER */}
        {screen === "new" && (
          <GlassCard>
            <div className="mb-6 flex items-center gap-3">
              <button type="button" onClick={() => setScreen("welcome")} className="rounded-full p-1.5 text-white/40 transition-colors hover:text-white">
                ←
              </button>
              <h2 className="text-2xl font-semibold">Create Account</h2>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/60">First Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="off"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-lg text-white placeholder-white/20 outline-none transition-colors focus:border-white/20 focus:bg-white/8"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/60">Mobile Number</label>
                <NumericKeypad value={phone} onChange={setPhone} maxLength={10} placeholder="(555) 000-0000" accent={accent} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/60">
                  🎂 Birthday <span className="text-white/30">(optional — get a surprise gift!)</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={birthdayMonth ?? ""}
                    onChange={(e) => setBirthdayMonth(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-white outline-none"
                  >
                    <option value="">Month</option>
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                  <select
                    value={birthdayDay ?? ""}
                    onChange={(e) => setBirthdayDay(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-white outline-none"
                  >
                    <option value="">Day</option>
                    {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => { setBirthdayMonth(undefined); setBirthdayDay(undefined); }}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/50 transition-colors hover:text-white"
                  >
                    Skip
                  </button>
                </div>
              </div>

              <PrimaryButton
                accent={accent}
                disabled={!name.trim() || phone.length !== 10}
                onClick={() => { if (name.trim() && phone.length === 10) setScreen("consent"); }}
              >
                Continue
              </PrimaryButton>
            </div>
          </GlassCard>
        )}

        {/* RETURNING CUSTOMER */}
        {screen === "returning" && (
          <GlassCard>
            <div className="mb-6 flex items-center gap-3">
              <button type="button" onClick={() => setScreen("welcome")} className="rounded-full p-1.5 text-white/40 transition-colors hover:text-white">
                ←
              </button>
              <h2 className="text-2xl font-semibold">Welcome Back</h2>
            </div>

            <p className="mb-4 text-sm text-white/50">Enter the last 4 digits of your phone number</p>

            <NumericKeypad value={lastFour} onChange={setLastFour} maxLength={4} placeholder="••••" accent={accent} />

            {lastFour.length === 4 && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                {findCustomer === undefined ? (
                  <div className="flex items-center gap-3 text-white/50">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
                    Looking up…
                  </div>
                ) : matchedReturningCustomer ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-lg font-semibold">Hey, {matchedReturningCustomer.name}! 👋</p>
                      <p className="text-sm text-white/50">
                        <span style={{ color: accent }}>{matchedReturningCustomer.points}</span> loyalty points
                      </p>
                    </div>
                    <PrimaryButton
                      accent={accent}
                      onClick={() => setScreen("returning-confirm")}
                    >
                      That&apos;s me →
                    </PrimaryButton>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-white/60">Number not found. Are you new?</p>
                    <PrimaryButton accent={accent} onClick={() => { setLastFour(""); setScreen("new"); }}>
                      Register Now
                    </PrimaryButton>
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        )}

        {/* CONSENT */}
        {screen === "consent" && (
          <GlassCard>
            <div className="mb-6 flex items-center gap-3">
              <button type="button" onClick={() => setScreen("new")} className="rounded-full p-1.5 text-white/40 transition-colors hover:text-white">
                ←
              </button>
              <h2 className="text-2xl font-semibold">Almost there!</h2>
            </div>

            <label className="flex cursor-pointer items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/8">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all ${consent ? "border-transparent text-white" : "border-white/20 bg-transparent"}`}
                  style={consent ? { backgroundColor: accent } : {}}
                >
                  {consent && <span className="text-xs">✓</span>}
                </div>
              </div>
              <span className="text-sm leading-relaxed text-white/70">
                I agree to receive SMS messages from <span className="text-white">{displayName}</span> including review requests, deals, and loyalty updates. Msg & data rates may apply. Reply STOP to unsubscribe.
              </span>
            </label>

            <div className="mt-5">
              <PrimaryButton
                accent={accent}
                disabled={!consent}
                onClick={() => {
                  if (!consent) return;
                  void handleCreateCustomer({
                    type: "new",
                    name: name.trim(),
                    phone,
                    restaurantId: restaurant._id,
                    birthdayMonth,
                    birthdayDay,
                    optedInSms: true,
                  });
                }}
              >
                Join & Earn Rewards 🎉
              </PrimaryButton>
            </div>
          </GlassCard>
        )}

        {/* RETURNING CONFIRM */}
        {screen === "returning-confirm" && matchedReturningCustomer && (
          <GlassCard>
            <div className="mb-8 text-center">
              <div
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-4xl"
                style={{ backgroundColor: `${accent}22`, border: `2px solid ${accent}44` }}
              >
                👋
              </div>
              <h2 className="text-2xl font-bold">Great to see you,</h2>
              <h2 className="text-2xl font-bold" style={{ color: accent }}>{matchedReturningCustomer.name}!</h2>
              <p className="mt-2 text-white/50">
                You have <span className="font-semibold text-white">{matchedReturningCustomer.points}</span> loyalty points
              </p>
            </div>
            <PrimaryButton
              accent={accent}
              onClick={() => void handleCreateCustomer({
                type: "returning",
                name: matchedReturningCustomer.name,
                phone: matchedReturningCustomer.phone,
                restaurantId: restaurant._id,
              })}
            >
              Check In →
            </PrimaryButton>
          </GlassCard>
        )}

        {/* BILL AMOUNT */}
        {screen === "bill" && (
          <GlassCard>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold">Enter Your Bill Amount</h2>
              <p className="mt-2 text-white/50">
                To earn loyalty points (1$ = 10 points)
              </p>
            </div>
            <div className="mb-6">
              <NumericKeypad
                value={billAmount}
                onChange={setBillAmount}
                maxLength={6}
                placeholder="0.00"
                accent={accent}
              />
            </div>
            <div className="flex gap-3">
              <PrimaryButton
                accent={accent}
                onClick={async () => {
                  if (!checkedInCustomerId || !restaurant) return;
                  const amount = parseFloat(billAmount) || 0;
                  try {
                    const result = await addReceiptMutation({
                      customerId: checkedInCustomerId,
                      billAmount: amount,
                      restaurantId: restaurant._id,
                    });
                    setPointsEarned(result.pointsEarned);
                    setScreen("success-returning");
                  } catch {
                    setPointsEarned(0);
                    setScreen("success-returning");
                  }
                }}
              >
                {billAmount ? `Earn ${Math.round((parseFloat(billAmount) || 0) * 10)} Points →` : "Skip →"}
              </PrimaryButton>
            </div>
          </GlassCard>
        )}

        {/* SUCCESS — NEW */}
        {screen === "success" && (
          <div className="flex w-full max-w-md flex-col items-center gap-6 text-center animate-in fade-in duration-500">
            <div className="relative">
              <div
                className="absolute inset-0 animate-ping rounded-full opacity-20"
                style={{ backgroundColor: accent }}
              />
              <div
                className="relative flex h-28 w-28 items-center justify-center rounded-full text-5xl shadow-2xl"
                style={{ backgroundColor: accent }}
              >
                ✓
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold">You&apos;re all set{name.trim() ? `, ${name.trim()}` : ""}!</h2>
              <p className="mt-2 text-lg text-white/50">
                We&apos;ll text you shortly to hear about your experience
              </p>
            </div>
            <div className="mt-2 h-1 w-48 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${((5 - countdown) / 5) * 100}%`, backgroundColor: accent }}
              />
            </div>
            <p className="text-sm text-white/30">Returning in {countdown}s</p>
          </div>
        )}

        {/* SUCCESS — RETURNING */}
        {screen === "success-returning" && matchedReturningCustomer && (
          <div className="flex w-full max-w-md flex-col items-center gap-6 text-center animate-in fade-in duration-500">
            <div className="text-6xl">🎉</div>
            <div>
              <h2 className="text-3xl font-bold">Enjoy your visit,</h2>
              <h2 className="text-3xl font-bold" style={{ color: accent }}>{matchedReturningCustomer.name}!</h2>
              <p className="mt-3 text-white/50">
                <span className="font-semibold text-white">{matchedReturningCustomer.points}</span> loyalty points
              </p>
              {pointsEarned > 0 && (
                <p className="mt-1 text-sm" style={{ color: accent }}>
                  +{pointsEarned} points earned this visit! 🎉
                </p>
              )}
            </div>
            <div className="mt-2 h-1 w-48 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${((5 - countdown) / 5) * 100}%`, backgroundColor: accent }}
              />
            </div>
            <p className="text-sm text-white/30">Returning in {countdown}s</p>
          </div>
        )}

      </div>
    </div>
  );
}
