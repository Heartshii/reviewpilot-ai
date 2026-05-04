import { TrustPageShell } from "@/components/trust-page-shell";

const sections = [
  {
    title: "1. Service description",
    body: "ReviewPilot AI provides a software platform for reputation growth, feedback routing, messaging workflows, customer capture, dashboard analytics, and related operational tools.",
  },
  {
    title: "2. Acceptable use",
    body: "The service is intended for lawful business use. Users may not use ReviewPilot for deceptive, unlawful, abusive, or non-compliant messaging activity.",
  },
  {
    title: "3. SMS compliance",
    body: "Customers of ReviewPilot are solely responsible for obtaining proper consent before messaging end users. ReviewPilot provides tooling, but compliance obligations remain with the business using the service.",
  },
  {
    title: "4. Payment terms",
    body: "Paid plans, message limits, and related fees are governed by the applicable subscription selected by the customer. Failure to pay may result in suspension or termination of access.",
  },
  {
    title: "5. Limitation of liability",
    body: "ReviewPilot AI is provided on an as-is and as-available basis. To the maximum extent permitted by law, ReviewPilot disclaims liability for indirect, incidental, special, or consequential damages arising from use of the service.",
  },
  {
    title: "6. Termination",
    body: "We may suspend or terminate accounts that violate these terms, misuse the service, or create legal or compliance risk. Customers may also discontinue use subject to plan-specific billing obligations.",
  },
  {
    title: "7. Governing law",
    body: "These terms are governed by the applicable laws of the jurisdiction in which ReviewPilot AI operates, unless otherwise required by law or explicitly agreed in writing.",
  },
];

export default function TermsPage() {
  return (
    <TrustPageShell
      eyebrow="Terms of Service"
      title="ReviewPilot AI Terms of Service"
      description="Last updated: May 3, 2026. These terms govern access to and use of ReviewPilot AI by business customers and authorized users."
    >
      {sections.map((section) => (
        <section
          key={section.title}
          className="rounded-2xl border border-white/5 bg-white/[0.02] p-6"
        >
          <h2 className="text-2xl font-semibold text-white">{section.title}</h2>
          <p className="mt-4 text-sm leading-8 text-white/58">{section.body}</p>
        </section>
      ))}
    </TrustPageShell>
  );
}
