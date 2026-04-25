import { TrustPageShell } from "@/components/trust-page-shell";

const sections = [
  {
    title: "1. Information we collect",
    body: "We collect restaurant account information, guest details such as name, phone number, and email where provided, as well as business setup data including review links, kiosk branding, and outreach preferences.",
  },
  {
    title: "2. How we use information",
    body: "We use collected information to deliver SMS flows, power analytics, improve product quality, support review and feedback routing, and provide the restaurant dashboard and admin controls.",
  },
  {
    title: "3. SMS consent",
    body: "Restaurants using ReviewPilot are responsible for obtaining consent before sending SMS messages. Guests can opt out by replying STOP, and businesses should honor all applicable messaging laws and policies.",
  },
  {
    title: "4. Data retention and deletion",
    body: "We retain information for as long as needed to operate the service, maintain account history, and satisfy legal or operational obligations. Restaurants may request deletion of account-related data subject to legal retention requirements.",
  },
  {
    title: "5. Third-party services",
    body: "ReviewPilot relies on third-party providers including Twilio for messaging, Convex for backend infrastructure, and Clerk for authentication. These providers process data only to the extent needed to deliver the service.",
  },
  {
    title: "6. Privacy requests",
    body: "For privacy-related requests, including deletion or access requests, contact support@reviewpilot.ai. We will review and respond as reasonably possible.",
  },
];

export default function PrivacyPage() {
  return (
    <TrustPageShell
      eyebrow="Privacy Policy"
      title="ReviewPilot AI Privacy Policy"
      description="Last updated: April 21, 2026. This privacy policy explains what information ReviewPilot AI collects, how it is used, and the choices restaurants and customers have when using the platform."
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
