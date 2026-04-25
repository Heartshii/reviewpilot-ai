import Link from "next/link";
import { MarketingFooter } from "@/components/marketing-footer";

export function TrustPageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-transparent text-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-sm text-white/60 backdrop-blur-sm hover:text-white"
        >
          {"\u2190"} Back to home
        </Link>

        <div className="mt-8 rounded-3xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-400">
            {eyebrow}
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold text-white sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-white/60 sm:text-lg">
            {description}
          </p>
        </div>

        <div className="mt-8 space-y-6">{children}</div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <MarketingFooter />
      </div>
    </main>
  );
}
