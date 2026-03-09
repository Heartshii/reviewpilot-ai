import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white">
      <main className="flex flex-col items-center gap-8 px-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
          ReviewPilot AI
        </h1>
        <p className="max-w-xl text-lg text-zinc-400 sm:text-xl">
          Turn every restaurant visit into a 5-star Google review
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/dashboard"
            className="rounded-lg bg-white px-8 py-3 font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
          >
            Restaurant Login
          </Link>
          <Link
            href="/admin"
            className="rounded-lg border border-zinc-600 px-8 py-3 font-semibold transition-colors hover:border-zinc-400 hover:bg-zinc-900"
          >
            Admin
          </Link>
        </div>
      </main>
    </div>
  );
}
