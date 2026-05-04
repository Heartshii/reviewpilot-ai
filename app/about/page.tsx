import Link from "next/link";
import { TrustPageShell } from "@/components/trust-page-shell";

const values = [
  {
    title: "Business-first",
    body: "Every workflow is designed around visits, reviews, recovery, and repeat revenue instead of generic marketing dashboards.",
  },
  {
    title: "Privacy focused",
    body: "Private feedback capture and consent-aware messaging are core product behaviors, not an afterthought.",
  },
  {
    title: "Built by operators",
    body: "The product is shaped around what owners and managers actually need to review every day.",
  },
];

export default function AboutPage() {
  return (
    <TrustPageShell
      eyebrow="About ReviewPilot"
      title="We help local businesses earn the reviews they deserve"
      description="ReviewPilot exists to help service businesses, clinics, stores, and local brands compete with larger operators using smart automation and faster follow-up."
    >
      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        <h2 className="text-2xl font-semibold text-white">Our mission</h2>
        <p className="mt-4 text-sm leading-8 text-white/58">
          Great local businesses often lose online reputation simply because no
          one consistently asks happy customers to share their experience. We
          built ReviewPilot to turn visits into feedback, feedback into action,
          and positive experiences into public proof.
        </p>
      </section>

      <div className="grid gap-5 md:grid-cols-3">
        {values.map((value) => (
          <section
            key={value.title}
            className="rounded-2xl border border-white/5 bg-white/[0.02] p-6"
          >
            <h2 className="text-xl font-semibold text-white">{value.title}</h2>
            <p className="mt-4 text-sm leading-8 text-white/58">{value.body}</p>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        <h2 className="text-2xl font-semibold text-white">
          Built by a team obsessed with local business growth
        </h2>
        <p className="mt-4 text-sm leading-8 text-white/58">
          ReviewPilot is built for operators who care about customer
          experience, repeat visits, and protecting local reputation in a world
          where one bad review can cost real revenue.
        </p>
        <Link
          href="/sign-up"
          className="mt-6 inline-flex rounded-xl border border-emerald-500/20 bg-emerald-500/20 px-5 py-3 text-sm font-medium text-emerald-400"
        >
          Start Free Trial
        </Link>
      </section>
    </TrustPageShell>
  );
}
