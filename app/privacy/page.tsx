import Link from "next/link";

const sections = [
  {
    title: "What ReviewPilot stores",
    body: "ReviewPilot stores business account information, guest check-in details, consent-aware SMS fields, rating and feedback activity, and branding/settings data needed to operate the kiosk and dashboard.",
  },
  {
    title: "How guest data is used",
    body: "Guest information is used to power visit tracking, review requests, private recovery messages, loyalty activity, and approved business outreach such as birthdays or re-engagement campaigns.",
  },
  {
    title: "SMS expectations",
    body: "Businesses using ReviewPilot are responsible for collecting permission before sending promotional or operational messages. ReviewPilot supports opt-out language and workflows, but proper use remains the business owner's responsibility.",
  },
  {
    title: "Operational access",
    body: "Restaurant owners, staff, and platform admins may access account information based on their role. Businesses should remove access when team responsibilities change.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="page-shell px-2 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <span className="section-label">Privacy</span>
        <h1 className="mt-6 text-5xl font-semibold leading-tight">
          ReviewPilot privacy overview
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-white/58">
          This page is a simple product-facing privacy summary. It should still be
          reviewed and finalized with proper legal language before wide commercial use.
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
          <Link href="/terms" className="text-sm text-emerald-300 hover:text-emerald-200">
            Read terms
          </Link>
        </div>
      </div>
    </main>
  );
}
