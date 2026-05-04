import Link from "next/link";

export function MarketingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 py-10 text-sm text-white/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              {"\u2726"}
            </div>
            <div>
              <p className="font-display text-base font-semibold text-white">
                ReviewPilot AI
              </p>
              <p className="text-xs text-white/35">
                Built for local businesses that care about their reputation
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-white/50">
          <Link href="/#features" className="hover:text-white">
            Features
          </Link>
          <Link href="/#pricing" className="hover:text-white">
            Pricing
          </Link>
          <Link href="/about" className="hover:text-white">
            About
          </Link>
          <Link href="/contact" className="hover:text-white">
            Contact
          </Link>
          <Link href="/privacy" className="hover:text-white">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-white">
            Terms of Service
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-6 flex w-full max-w-6xl flex-col gap-2 px-4 text-xs text-white/30 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <p>{"\u00A9"} {currentYear} ReviewPilot AI. All rights reserved.</p>
        <p>Built for local businesses that care about their reputation</p>
      </div>
    </footer>
  );
}
