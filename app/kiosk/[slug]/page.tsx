"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  useQuery,
  useMutation,
  useConvexConnectionState,
} from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const INACTIVITY_MS = 30_000;
const SUCCESS_AUTO_RETURN_MS = 5_000;
const DEFAULT_ACCENT = "#10b981";

type Screen =
  | "welcome"
  | "new"
  | "returning"
  | "consent"
  | "returning-confirm"
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
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function NumericKeypad({
  value,
  onChange,
  maxLength = 10,
  placeholder = "",
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  placeholder?: string;
}) {
  const addDigit = (d: string) => {
    if (value.length < maxLength) onChange(value + d);
  };
  const backspace = () => onChange(value.slice(0, -1));

  return (
    <div className="space-y-3">
      <div className="min-h-[56px] rounded-xl bg-zinc-900 px-4 py-3 text-2xl font-medium tracking-widest text-white">
        {value || placeholder}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "⌫"].map((n) =>
          n === null ? (
            <div key="empty" />
          ) : n === "⌫" ? (
            <button
              key="back"
              type="button"
              onClick={backspace}
              className="flex min-h-[56px] items-center justify-center rounded-xl bg-zinc-800 text-xl font-medium text-white transition active:scale-95"
            >
              ⌫
            </button>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => addDigit(String(n))}
              className="flex min-h-[56px] items-center justify-center rounded-xl bg-zinc-800 text-2xl font-medium text-white transition active:scale-95"
            >
              {n}
            </button>
          )
        )}
      </div>
    </div>
  );
}

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
  const [returningCustomer, setReturningCustomer] = useState<{
    name: string;
    points: number;
    phone: string;
  } | null>(null);
  const [staffPinOpen, setStaffPinOpen] = useState(false);
  const [staffPin, setStaffPin] = useState("");
  const [countdown, setCountdown] = useState(5);
  const lastActivityRef = useRef(Date.now());
  const queueRef = useRef<QueuedSubmission[]>([]);
  const [queueCount, setQueueCount] = useState(0);

  const restaurant = useQuery(
    api.queries.getRestaurantBySlug,
    slug ? { slug } : "skip"
  );
  const createCustomerMutation = useMutation(api.smsMutations.createCustomer);
  const connectionState = useConvexConnectionState();

  const findCustomer = useQuery(
    api.queries.findCustomerByLastFour,
    lastFour.length === 4 && restaurant
      ? { lastFour, restaurantId: restaurant._id }
      : "skip"
  );

  const accent =
    restaurant?.restaurantSettings?.kioskAccentColor ?? DEFAULT_ACCENT;
  const displayName =
    restaurant?.restaurantSettings?.kioskDisplayName ?? restaurant?.name ?? "";
  const logoUrl = restaurant?.restaurantSettings?.kioskLogoUrl;
  const isOffline = !connectionState.isWebSocketConnected;

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (screen !== "welcome") return;
    const iv = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_MS) {
        setScreen("welcome");
        setName("");
        setPhone("");
        setLastFour("");
        setBirthdayMonth(undefined);
        setBirthdayDay(undefined);
        setConsent(false);
        setReturningCustomer(null);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [screen]);

  useEffect(() => {
    if (screen !== "success" && screen !== "success-returning") return;
    setCountdown(5);
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

  useEffect(() => {
    if (!connectionState.isWebSocketConnected || queueRef.current.length === 0)
      return;
    const processQueue = async () => {
      const queue = [...queueRef.current];
      for (const item of queue) {
        try {
          if (item.type === "new") {
            await createCustomerMutation({
              name: item.name,
              phone: item.phone,
              restaurantId: item.restaurantId,
              birthdayMonth: item.birthdayMonth,
              birthdayDay: item.birthdayDay,
              optedInSms: item.optedInSms,
            });
          } else {
            await createCustomerMutation({
              name: item.name,
              phone: item.phone,
              restaurantId: item.restaurantId,
              optedInSms: true,
            });
          }
          queueRef.current = queueRef.current.filter((x) => x !== item);
          setQueueCount(queueRef.current.length);
        } catch {
          break;
        }
      }
    };
    void processQueue();
  }, [connectionState.isWebSocketConnected, createCustomerMutation]);

  const handleCreateCustomer = useCallback(
    async (opts: {
      type: "new" | "returning";
      name: string;
      phone: string;
      restaurantId: Id<"restaurants">;
      birthdayMonth?: number;
      birthdayDay?: number;
      optedInSms?: boolean;
    }) => {
      if (!restaurant) return;
      const payload = {
        name: opts.name,
        phone: opts.phone,
        restaurantId: opts.restaurantId,
        birthdayMonth: opts.birthdayMonth,
        birthdayDay: opts.birthdayDay,
        optedInSms: opts.optedInSms ?? true,
      };
      try {
        await createCustomerMutation(payload);
        if (opts.type === "new") setScreen("success");
        else setScreen("success-returning");
      } catch {
        queueRef.current.push({
          ...payload,
          type: opts.type,
          optedInSms: opts.optedInSms ?? true,
        } as QueuedSubmission);
        setQueueCount(queueRef.current.length);
        if (opts.type === "new") setScreen("success");
        else setScreen("success-returning");
      }
    },
    [createCustomerMutation, restaurant]
  );

  useEffect(() => {
    if (lastFour.length === 4 && findCustomer !== undefined) {
      if (findCustomer) {
        setReturningCustomer({
          name: findCustomer.name,
          points: findCustomer.points,
          phone: findCustomer.phone,
        });
      } else {
        setReturningCustomer(null);
      }
    } else {
      setReturningCustomer(null);
    }
  }, [lastFour, findCustomer]);

  if (!slug) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <p className="text-zinc-500">Invalid kiosk URL</p>
      </div>
    );
  }

  if (restaurant === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (restaurant === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <p className="text-zinc-500">Restaurant not found</p>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex min-h-screen min-w-0 flex-col overflow-hidden bg-zinc-950 text-white"
      onClick={recordActivity}
      onTouchStart={recordActivity}
    >
      {isOffline && queueCount > 0 && (
        <div className="absolute right-4 top-4 z-50 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium">
          Offline — {queueCount} queued
        </div>
      )}

      <div className="absolute bottom-4 left-4">
        <button
          type="button"
          onClick={() => setStaffPinOpen(true)}
          className="text-sm text-zinc-500 underline-offset-2 hover:underline"
        >
          Staff
        </button>
      </div>

      {staffPinOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="w-full max-w-sm rounded-xl bg-zinc-900 p-6">
            <h3 className="mb-4 text-lg font-semibold">Staff PIN</h3>
            <input
              type="password"
              value={staffPin}
              onChange={(e) => setStaffPin(e.target.value)}
              placeholder="Enter PIN"
              className="mb-4 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-lg"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (staffPin === "1234") {
                    window.location.href = "/dashboard";
                  }
                }}
                className="flex-1 rounded-lg py-3 font-medium"
                style={{ backgroundColor: accent }}
              >
                Enter
              </button>
              <button
                type="button"
                onClick={() => {
                  setStaffPinOpen(false);
                  setStaffPin("");
                }}
                className="rounded-lg border border-zinc-600 px-4 py-3"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center p-6">
        {screen === "welcome" && (
          <div
            className="flex w-full max-w-lg flex-col items-center gap-12 transition-opacity duration-300"
            style={{ opacity: 1 }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={displayName}
                className="max-h-32 object-contain"
              />
            ) : (
              <h1 className="text-4xl font-bold">{displayName}</h1>
            )}
            <div className="flex w-full flex-col gap-4">
              <button
                type="button"
                onClick={() => setScreen("new")}
                className="min-h-[56px] w-full rounded-xl font-semibold text-white transition active:scale-[0.98]"
                style={{ backgroundColor: accent }}
              >
                New Customer
              </button>
              <button
                type="button"
                onClick={() => {
                  setScreen("returning");
                  setLastFour("");
                  setReturningCustomer(null);
                }}
                className="min-h-[56px] w-full rounded-xl border-2 border-zinc-600 font-semibold transition active:scale-[0.98]"
              >
                Returning Customer
              </button>
            </div>
          </div>
        )}

        {screen === "new" && (
          <div className="flex w-full max-w-lg flex-col gap-6 transition-opacity duration-300">
            <h2 className="text-2xl font-bold">Welcome! Let&apos;s get you set up</h2>
            <div>
              <label className="mb-2 block text-lg">Your First Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-4 text-lg"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="mb-2 block text-lg">Mobile Number</label>
              <NumericKeypad value={phone} onChange={setPhone} maxLength={10} />
            </div>
            <div>
              <label className="mb-2 block text-lg">
                🎂 Birthday — optional! Get a surprise deal on your birthday.
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={birthdayMonth ?? ""}
                  onChange={(e) =>
                    setBirthdayMonth(
                      e.target.value ? parseInt(e.target.value, 10) : undefined
                    )
                  }
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-lg"
                >
                  <option value="">Month</option>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={birthdayDay ?? ""}
                  onChange={(e) =>
                    setBirthdayDay(
                      e.target.value ? parseInt(e.target.value, 10) : undefined
                    )
                  }
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-lg"
                >
                  <option value="">Day</option>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setBirthdayMonth(undefined);
                    setBirthdayDay(undefined);
                  }}
                  className="rounded-lg border border-zinc-600 px-4 py-2 text-lg"
                >
                  Skip
                </button>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setScreen("welcome")}
                className="flex-1 rounded-xl border-2 border-zinc-600 py-3 font-semibold"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  const trimmedName = name.trim();
                  if (!trimmedName) return;
                  if (phone.length !== 10) return;
                  setScreen("consent");
                }}
                disabled={!name.trim() || phone.length !== 10}
                className="flex-1 rounded-xl py-3 font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: accent }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {screen === "returning" && (
          <div className="flex w-full max-w-lg flex-col gap-6 transition-opacity duration-300">
            <h2 className="text-2xl font-bold">Welcome back!</h2>
            <label className="text-lg">
              Enter the last 4 digits of your phone number
            </label>
            <NumericKeypad
              value={lastFour}
              onChange={setLastFour}
              maxLength={4}
              placeholder="••••"
            />
            {lastFour.length === 4 && (
              <div className="space-y-4">
                {findCustomer === undefined ? (
                  <p className="text-lg text-zinc-400">Looking up…</p>
                ) : returningCustomer ? (
                  <>
                    <p className="text-xl">
                      Welcome back {returningCustomer.name}! You have{" "}
                      {returningCustomer.points} points 🎁
                    </p>
                    <button
                      type="button"
                      onClick={() => setScreen("returning-confirm")}
                      className="w-full min-h-[56px] rounded-xl font-semibold text-white"
                      style={{ backgroundColor: accent }}
                    >
                      Continue
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xl">
                      Number not found. Are you a new customer?
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setScreen("new");
                        setLastFour("");
                      }}
                      className="w-full min-h-[56px] rounded-xl font-semibold text-white"
                      style={{ backgroundColor: accent }}
                    >
                      Register Now
                    </button>
                  </>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => setScreen("welcome")}
              className="rounded-xl border-2 border-zinc-600 py-3 font-semibold"
            >
              Back
            </button>
          </div>
        )}

        {screen === "consent" && (
          <div className="flex w-full max-w-lg flex-col gap-6 transition-opacity duration-300">
            <h2 className="text-2xl font-bold">Almost there!</h2>
            <label className="flex min-h-[56px] cursor-pointer items-start gap-4 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 h-11 min-h-[44px] min-w-[44px] shrink-0 accent-emerald-500"
              />
              <span className="text-lg leading-relaxed">
                I agree to receive SMS messages from {displayName} including
                review requests, deals, and loyalty updates. Msg & data rates
                may apply. Reply STOP to unsubscribe.
              </span>
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setScreen("new")}
                className="flex-1 rounded-xl border-2 border-zinc-600 py-3 font-semibold"
              >
                Back
              </button>
              <button
                type="button"
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
                disabled={!consent}
                className="flex-1 rounded-xl py-3 font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: accent }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {screen === "returning-confirm" && returningCustomer && (
          <div className="flex w-full max-w-lg flex-col gap-6 transition-opacity duration-300">
            <h2 className="text-2xl font-bold">
              Great to see you again {returningCustomer.name}!
            </h2>
            <p className="flex items-center gap-2 text-xl">
              <span>⭐</span> {returningCustomer.points} points
            </p>
            <button
              type="button"
              onClick={() =>
                void handleCreateCustomer({
                  type: "returning",
                  name: returningCustomer.name,
                  phone: returningCustomer.phone,
                  restaurantId: restaurant._id,
                })
              }
              className="min-h-[56px] w-full rounded-xl font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              Done
            </button>
          </div>
        )}

        {screen === "success" && (
          <div className="flex w-full max-w-lg flex-col items-center gap-6 transition-opacity duration-300">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/30" />
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full text-5xl"
                style={{ backgroundColor: accent }}
              >
                ✓
              </div>
            </div>
            <h2 className="text-2xl font-bold">
              You&apos;re all set {name.trim()}! 🎉
            </h2>
            <p className="text-center text-lg text-zinc-400">
              We&apos;ll send you a text after your visit to hear about your
              experience
            </p>
            {countdown > 0 && (
              <p className="text-zinc-500">
                Returning to home in {countdown}...
              </p>
            )}
          </div>
        )}

        {screen === "success-returning" && returningCustomer && (
          <div className="flex w-full max-w-lg flex-col items-center gap-6 transition-opacity duration-300">
            <h2 className="text-2xl font-bold">
              Thanks {returningCustomer.name}! Enjoy your visit 😊
            </h2>
            <p className="flex items-center gap-2 text-xl">
              <span>⭐</span> {returningCustomer.points} points
            </p>
            {countdown > 0 && (
              <p className="text-zinc-500">
                Returning to home in {countdown}...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
