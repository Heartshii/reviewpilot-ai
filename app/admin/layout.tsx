"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { useIsClient } from "@/hooks/useIsClient";

const nav = [
  { href: "/admin", label: "Overview", badge: "OV" },
  { href: "/admin/clients", label: "Clients", badge: "CL" },
  { href: "/admin/settings", label: "Settings", badge: "SE" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isClient = useIsClient();
  const { user, isLoaded } = useUser();
  const needsAdminSync =
    isLoaded && !!user && user.publicMetadata?.role !== "SUPER_ADMIN";
  const todayLabel = isClient
    ? new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Live platform overview";

  useEffect(() => {
    if (!isLoaded || !user) return;
    if (user.publicMetadata?.role === "SUPER_ADMIN") return;

    void fetch("/api/admin/sync-role", { method: "POST" }).catch(() => undefined);
  }, [isLoaded, user]);

  return (
    <div className="min-h-screen bg-transparent text-white lg:grid lg:grid-cols-[300px_1fr]">
      <aside className="border-b border-white/6 bg-[#07111d]/84 px-4 py-4 backdrop-blur-xl lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="dashboard-surface rounded-[1.8rem] p-4">
          <div className="border-b border-white/6 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] text-sm font-semibold text-slate-950">
                RP
              </div>
              <div>
                <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-white/90">
                  ReviewPilot
                </p>
                <p className="text-xs text-red-300/80">Super admin control</p>
              </div>
            </div>
          </div>

          <nav className="mt-4 space-y-2">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all ${
                    active
                      ? "bg-white/8 text-white"
                      : "text-white/50 hover:bg-white/5 hover:text-white/80"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border text-[11px] font-semibold tracking-[0.14em] ${
                      active
                        ? "border-emerald-300/30 bg-emerald-300/12 text-emerald-200"
                        : "border-white/8 bg-white/4 text-white/35"
                    }`}
                  >
                    {item.badge}
                  </span>
                  <span>{item.label}</span>
                  {active && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-emerald-300" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-2xl border border-white/7 bg-white/4 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/30">
              Platform pulse
            </p>
            <p className="mt-2 text-sm leading-7 text-white/58">
              Watch client activity, monitor usage, and catch expansion
              opportunities before they get missed.
            </p>
          </div>

          <div className="mt-4 border-t border-white/6 pt-4">
            <SignOutButton>
              <button className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white/60 hover:bg-white/7 hover:text-white">
                Sign out
                <span className="text-white/30">Exit</span>
              </button>
            </SignOutButton>
          </div>
        </div>
      </aside>

      <main className="min-w-0">
        <div className="sticky top-0 z-20 border-b border-white/6 bg-[#08111d]/62 px-5 py-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/28">
                Platform control room
              </p>
              <p className="mt-1 text-sm text-white/52">{todayLabel}</p>
              {needsAdminSync && (
                <p className="mt-1 text-xs text-emerald-200/70">
                  Syncing admin access...
                </p>
              )}
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs text-emerald-200 sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
              Platform live
            </div>
          </div>
        </div>

        <div className="px-5 py-6 sm:px-8">{children}</div>
      </main>
    </div>
  );
}
