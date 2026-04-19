"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";

const nav = [
  { href: "/admin", label: "Overview", icon: "◈" },
  { href: "/admin/clients", label: "Clients", icon: "◉" },
  { href: "/admin/settings", label: "Settings", icon: "◎" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#0a0a0f] text-white">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-white/5 bg-[#0d0d14]">
        {/* Brand */}
        <div className="border-b border-white/5 px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
              <span className="text-sm text-emerald-400">✦</span>
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-white">ReviewPilot</p>
              <p className="text-[10px] uppercase tracking-widest text-red-400">Super Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 p-3">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                  active
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-white/40 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                <span className={`text-base ${active ? "text-emerald-400" : "text-white/20"}`}>{item.icon}</span>
                {item.label}
                {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="border-t border-white/5 p-3">
          <SignOutButton>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/30 transition-all hover:bg-white/5 hover:text-white/60">
              <span className="text-base">↪</span>
              Sign out
            </button>
          </SignOutButton>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 border-b border-white/5 bg-[#0a0a0f]/80 px-8 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/20">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-xs text-emerald-400">Live</span>
            </div>
          </div>
        </div>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}