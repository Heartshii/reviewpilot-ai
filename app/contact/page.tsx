"use client";

import { useState } from "react";
import { TrustPageShell } from "@/components/trust-page-shell";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    restaurantName: "",
    message: "",
  });

  return (
    <TrustPageShell
      eyebrow="Contact"
      title="Get in Touch"
      description="Tell us about your restaurant, current review process, and what you want to improve. We will point you in the right direction."
    >
      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Name"
            className="rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/30"
          />
          <input
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Email"
            className="rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/30"
          />
          <input
            value={form.restaurantName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, restaurantName: e.target.value }))
            }
            placeholder="Restaurant Name"
            className="rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/30 md:col-span-2"
          />
          <textarea
            value={form.message}
            onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
            placeholder="Message"
            rows={6}
            className="rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/30 md:col-span-2"
          />
        </div>

        <button className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/20 px-5 py-3 text-sm font-medium text-emerald-400">
          Submit
        </button>
      </section>

      <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        <p className="text-sm text-white/70">support@reviewpilot.ai</p>
        <p className="mt-2 text-sm text-white/45">
          Typical response time: within 1 business day.
        </p>
      </section>
    </TrustPageShell>
  );
}
