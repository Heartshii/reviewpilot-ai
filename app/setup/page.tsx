"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import {
  BUSINESS_TYPE_OPTIONS,
  getBusinessLabels,
  titleCaseLabel,
  type BusinessType,
} from "@/lib/business-copy";
import { useEnsureUser } from "@/hooks/useEnsureUser";
import { useRestaurantId } from "@/hooks/useRestaurantId";

const steps = [
  {
    title: "Shape the guest-facing experience",
    items: [
      "Set the kiosk display name, accent color, and logo so the flow feels native to your brand.",
      "Place the kiosk where staff can naturally point visitors to it during checkout, check-in, or handoff.",
      "Use the QR code in settings when you want a scannable fallback next to the tablet.",
    ],
  },
  {
    title: "Connect reputation and messaging",
    items: [
      "Add the Google review link so positive experiences can move into public reviews.",
      "Choose the SMS delay that feels natural for your service model.",
      "Review birthday and re-engagement templates before live traffic starts.",
    ],
  },
  {
    title: "Activate billing before launch",
    items: [
      "Start a plan or trial before the workflow goes live so usage lands on an active account.",
      "Use the billing page for invoices, card updates, and subscription changes.",
      "Resolve any trial or payment warnings before staff depend on automatic follow-up.",
    ],
  },
  {
    title: "Train the owner workflow",
    items: [
      "Check the dashboard daily for pending approvals, reputation trends, and customer activity.",
      "Use customer records before sending campaigns or handling recovery messages.",
      "Keep profile, branding, and review destination details current as the business evolves.",
    ],
  },
];

const checklist = [
  "Business profile completed",
  "Google review link added",
  "Kiosk branding saved",
  "AI message tone reviewed",
  "Billing plan or trial activated",
  "Owner knows who approves recovery SMS",
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export default function SetupPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { convexUser, isLoading } = useEnsureUser();
  const restaurantId = useRestaurantId();
  const completeOwnerOnboarding = useMutation(api.users.completeOwnerOnboarding);

  const [businessName, setBusinessName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [businessType, setBusinessType] =
    useState<BusinessType>("GENERAL_SERVICE");
  const [businessSubtype, setBusinessSubtype] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labels = getBusinessLabels(businessType);
  const suggestedSlug = useMemo(
    () => slugify(workspaceSlug || businessName),
    [businessName, workspaceSlug]
  );

  const handleCreateWorkspace = async () => {
    if (!user) return;
    const name = businessName.trim();
    const slug = suggestedSlug;

    if (!name || !slug) {
      setError("Add a business name first.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await completeOwnerOnboarding({
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress ?? "",
        restaurantName: name,
        restaurantSlug: slug,
        businessType,
        businessSubtype: businessSubtype.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        googleBusinessUrl: googleBusinessUrl.trim() || undefined,
      });
      router.push("/dashboard/billing");
      router.refresh();
    } catch (setupError) {
      setError(
        setupError instanceof Error
          ? setupError.message
          : "Unable to create workspace"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const showWorkspaceForm =
    isLoaded && user && !isLoading && convexUser !== undefined && !restaurantId;

  return (
    <main className="page-shell px-2 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <span className="section-label">Onboarding guide</span>
        <h1 className="mt-6 text-5xl font-semibold leading-tight text-white">
          Launch ReviewPilot for a real-world business.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-white/58">
          This setup flow is built for service brands, clinics, stores, and
          local operators who want the product to feel intentional on day one.
        </p>

        <div className="mt-10 space-y-5">
          {showWorkspaceForm && (
            <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs uppercase tracking-[0.16em] text-emerald-300/80">
                    Step 1
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-white">
                    Create your {labels.workspaceLabel}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-white/58">
                    Tell us what kind of business you run so the dashboard,
                    kiosk, and messaging flow use the right language for your
                    team and your customers.
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  Signed in as {user?.primaryEmailAddress?.emailAddress}
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="block text-sm text-white/55">
                    Business name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Example: North Shore Dental"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/25"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/55">
                    Business type
                  </label>
                  <select
                    value={businessType}
                    onChange={(e) =>
                      setBusinessType(e.target.value as BusinessType)
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0c1421] px-4 py-3 text-white"
                  >
                    {BUSINESS_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="block text-sm text-white/55">
                    Workspace slug
                  </label>
                  <input
                    type="text"
                    value={workspaceSlug}
                    onChange={(e) => setWorkspaceSlug(e.target.value)}
                    placeholder="north-shore-dental"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/25"
                  />
                  <p className="mt-2 text-xs text-white/34">
                    Kiosk URL preview: /kiosk/{suggestedSlug || "your-slug"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-white/55">
                    Specialty or service focus
                  </label>
                  <input
                    type="text"
                    value={businessSubtype}
                    onChange={(e) => setBusinessSubtype(e.target.value)}
                    placeholder="Optional: cosmetic dentistry, grocery delivery, med spa"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/25"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="block text-sm text-white/55">
                    Contact phone
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Optional"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/25"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/55">
                    Website
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="Optional"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/25"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm text-white/55">
                  Google review link
                </label>
                <input
                  type="url"
                  value={googleBusinessUrl}
                  onChange={(e) => setGoogleBusinessUrl(e.target.value)}
                  placeholder="Optional for now"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/25"
                />
              </div>

              <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 px-4 py-4 text-sm text-white/62">
                ReviewPilot will refer to your customers as{" "}
                <span className="text-white">
                  {labels.customerLabelPlural}
                </span>{" "}
                and your business as a{" "}
                <span className="text-white">{labels.businessLabel}</span> in
                the workspace.
              </div>

              {error && (
                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void handleCreateWorkspace()}
                  disabled={submitting}
                  className="rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-5 py-3.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
                >
                  {submitting ? "Creating workspace..." : "Create workspace"}
                </button>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/4 px-5 py-3.5 text-sm font-semibold text-white/82"
                >
                  Back to home
                </Link>
              </div>
            </section>
          )}

          {restaurantId && (
            <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-emerald-300/80">
                    Workspace ready
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-white">
                    Your business setup is connected
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-white/58">
                    Continue to billing to start a trial, then finish branding
                    and message behavior inside settings.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/dashboard/billing"
                    className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-5 py-3.5 text-sm font-semibold text-slate-950"
                  >
                    Open billing
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/4 px-5 py-3.5 text-sm font-semibold text-white/82"
                  >
                    Open dashboard
                  </Link>
                </div>
              </div>
            </section>
          )}

          <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
            <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
              <div className="space-y-8">
                {steps.map((step, index) => (
                  <section
                    key={step.title}
                    className="rounded-[1.5rem] border border-white/8 bg-white/4 p-5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-sm font-semibold text-emerald-200">
                        {index + 1}
                      </div>
                      <h2 className="text-2xl font-semibold text-white">
                        {step.title}
                      </h2>
                    </div>
                    <div className="mt-5 space-y-3">
                      {step.items.map((item) => (
                        <p key={item} className="text-sm leading-7 text-white/58">
                          {item}
                        </p>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="glass-panel rounded-[2rem] p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-white/30">
                  Go-live checklist
                </p>
                <div className="mt-4 space-y-3">
                  {checklist.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-white/68"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel rounded-[2rem] p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-white/30">
                  Recommended launch order
                </p>
                <p className="mt-4 text-sm leading-7 text-white/58">
                  First create the workspace. Then finish branding and the
                  review destination. Then activate billing. After that, confirm
                  the default message flow and let the team start using the
                  product live.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <Link
                    href="/dashboard/settings"
                    className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-5 py-3.5 text-sm font-semibold text-slate-950"
                  >
                    Open settings
                  </Link>
                  <Link
                    href="/dashboard/billing"
                    className="inline-flex items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-5 py-3.5 text-sm font-semibold text-emerald-100"
                  >
                    Activate billing
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/4 px-5 py-3.5 text-sm font-semibold text-white/82"
                  >
                    Open dashboard
                  </Link>
                </div>
              </div>

              <div className="glass-panel rounded-[2rem] p-6">
                <p className="text-xs uppercase tracking-[0.16em] text-white/30">
                  What changes by business type
                </p>
                <p className="mt-4 text-sm leading-7 text-white/58">
                  If you choose{" "}
                  <span className="text-white">
                    {BUSINESS_TYPE_OPTIONS.find(
                      (option) => option.value === businessType
                    )?.label ?? "General service business"}
                  </span>
                  , the product will refer to your business as a{" "}
                  <span className="text-white">{labels.businessLabel}</span> and
                  your customers as{" "}
                  <span className="text-white">
                    {titleCaseLabel(labels.customerLabelPlural)}
                  </span>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
