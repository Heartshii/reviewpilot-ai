"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#060816] text-white antialiased">
        <main className="flex min-h-screen items-center justify-center px-6 py-16">
          <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-center shadow-2xl shadow-black/30 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.24em] text-white/35">
              Unexpected error
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-white">
              Something went wrong.
            </h1>
            <p className="mt-4 text-sm leading-7 text-white/55">
              The incident has been captured for review. You can try the action
              again or head back once the page resets.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/15 px-5 py-3 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/25"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
