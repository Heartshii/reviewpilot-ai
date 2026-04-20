"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { useRestaurantId } from "@/hooks/useRestaurantId";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/dashboard/customers", label: "Customers", icon: "👥" },
  { href: "/dashboard/sms", label: "SMS Center", icon: "📲" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const restaurantId = useRestaurantId();

  if (!restaurantId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent text-white">
        <p className="text-zinc-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-transparent text-white">
      <aside className="flex w-56 flex-col border-r border-zinc-800 bg-[#0d0d14]/80 backdrop-blur">
        <div className="border-b border-zinc-800 p-4">
          <h1 className="font-semibold text-white">ReviewPilot AI</h1>
          <p className="text-xs text-zinc-500">Restaurant Dashboard</p>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-zinc-800 p-2">
          <SignOutButton>
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white">
              Sign out
            </button>
          </SignOutButton>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
