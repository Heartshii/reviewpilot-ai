import Link from "next/link";

const sections = [
  {
    title: "Service scope",
    body: "ReviewPilot provides software for kiosk-based guest capture, review routing, SMS workflows, customer tracking, and operator-facing dashboard tools. The exact feature set may vary by plan or account configuration.",
  },
  {
    title: "Business responsibilities",
    body: "Customers are responsible for lawful use of SMS messaging, guest consent collection, accuracy of review links, and appropriate handling of customer communications sent through the platform.",
  },
  {
    title: "Acceptable use",
    body: "The platform should not be used to send deceptive, abusive, or non-compliant outreach. Accounts may be restricted if the product is used in a way that creates legal, messaging, or reputation risk.",
  },
  {
    title: "Availability and changes",
    body: "ReviewPilot may improve, update, or adjust product functionality over time. Businesses should review major changes before relying on automated workflows in production environments.",
  },
];

export default function TermsPage() {
  return (
    <main className="page-shell px-2 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <span className="section-label">Terms</span>
        <h1 className="mt-6 text-5xl font-semibold leading-tight">
          ReviewPilot terms overview
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-white/58">
          This is a trust-building starter terms page for the product. It helps
          the site feel complete, but you should still replace it with reviewed
          legal terms before broad public launch.
        </p>

        <div className="mt-10 space-y-5">
          {sections.map((section) => (
            <section
              key={section.title}
              className="glass-panel rounded-[1.8rem] p-6"
            >
              <h2 className="text-2xl font-semibold text-white">{section.title}</h2>
              <p className="mt-4 text-sm leading-8 text-white/58">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-8">
          <Link href="/privacy" className="text-sm text-emerald-300 hover:text-emerald-200">
            Read privacy
          </Link>
        </div>
      </div>
    </main>
  );
}
