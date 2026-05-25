"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLocationScope } from "@/hooks/useLocationScope";
import { useRestaurantId } from "@/hooks/useRestaurantId";
import { TESTIMONIAL_WIDGET_THEMES } from "@/lib/testimonial-widget";
import { TestimonialWidgetPreview } from "@/components/TestimonialWidgetPreview";
import {
  WorkspaceHero,
  WorkspaceHeroStat,
  WorkspaceSectionHeader,
} from "@/components/ui/workspace-page";

export default function WidgetPage() {
  const restaurantId = useRestaurantId();
  const { userId } = useAuth();
  const { selectedLocationId, selectedLocation } = useLocationScope();
  const locationId =
    selectedLocationId === "ALL" ? undefined : selectedLocationId;
  const restaurant = useQuery(
    api.queries.getRestaurant,
    restaurantId ? { restaurantId } : "skip"
  );
  const editorState = useQuery(
    api.reviews.getWidgetEditorState,
    restaurantId ? { restaurantId, locationId } : "skip"
  );
  const saveSettings = useMutation(api.reviews.updateTestimonialWidgetSettings);

  const [enabled, setEnabled] = useState(false);
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [theme, setTheme] = useState<(typeof TESTIMONIAL_WIDGET_THEMES)[number]["value"]>(
    "EMERALD"
  );
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<"snippet" | "script" | null>(null);

  useEffect(() => {
    if (!editorState) {
      return;
    }

    setEnabled(editorState.settings.enabled);
    setHeadline(editorState.settings.headline);
    setSubheadline(editorState.settings.subheadline);
    setTheme(editorState.settings.theme);
  }, [editorState]);

  const baseUrl =
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_APP_URL ?? ""
      : window.location.origin;
  const targetSlug = editorState?.slug ?? selectedLocation?.slug ?? restaurant?.slug ?? "";

  const scriptUrl = useMemo(() => {
    if (!baseUrl || !targetSlug) {
      return "";
    }
    return `${baseUrl}/api/widget/testimonials/script?slug=${encodeURIComponent(targetSlug)}`;
  }, [baseUrl, targetSlug]);

  const embedSnippet = useMemo(() => {
    if (!scriptUrl) {
      return "";
    }

    return `<div data-reviewpilot-testimonials></div>\n<script async src="${scriptUrl}"></script>`;
  }, [scriptUrl]);

  if (!restaurantId) {
    return null;
  }

  if (!restaurant || !editorState) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-500">Loading widget workspace...</p>
      </div>
    );
  }

  const previewData = editorState.preview
    ? {
        ...editorState.preview,
        headline,
        subheadline,
        theme,
      }
    : null;

  const handleSave = async () => {
    if (!restaurantId || !userId) {
      return;
    }

    setSaving(true);
    try {
      await saveSettings({
        actorClerkId: userId,
        restaurantId,
        enabled,
        headline,
        subheadline,
        theme,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (value: string, mode: "snippet" | "script") => {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopied(mode);
    window.setTimeout(() => setCopied(null), 1800);
  };

  return (
    <div className="space-y-8">
      <WorkspaceHero
        eyebrow="Growth widget"
        title="Turn fresh 5-star feedback into an embeddable proof block"
        description="This widget keeps recent positive experiences visible on the client site without forcing the owner to manually copy testimonial text. Save the presentation once, then drop the snippet anywhere."
        scope={`Scope: ${selectedLocation?.name ?? restaurant.name}`}
        actions={
          <div className="rounded-[1.25rem] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {editorState.preview?.items.length ?? 0} approved 5-star highlights ready
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <WorkspaceHeroStat
          eyebrow="Content"
          label="Approved highlights ready"
          value={`${editorState.preview?.items.length ?? 0}`}
          note="These are the public-safe highlights the widget can show now."
          icon="widget"
        />
        <WorkspaceHeroStat
          eyebrow="Theme"
          label="Current visual direction"
          value={TESTIMONIAL_WIDGET_THEMES.find((item) => item.value === theme)?.label ?? theme}
          note="Use this to match the client brand instead of dropping in a generic block."
          icon="spark"
        />
        <WorkspaceHeroStat
          eyebrow="Status"
          label="Widget publishing state"
          value={enabled ? "Live" : "Paused"}
          note="Disable the widget here if the client needs to hide proof temporarily."
          icon="live"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-white/6 bg-white/[0.02] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium text-white">Widget controls</h2>
              <p className="mt-1 text-sm text-white/42">
                Choose how the embed should look before you add it to the client site.
              </p>
            </div>
            <label className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-transparent"
              />
              Widget enabled
            </label>
          </div>

          <div className="mt-6 grid gap-5">
            <div>
              <label className="block text-sm text-white/52">Headline</label>
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
                placeholder="Recent 5-star experiences from your business"
              />
            </div>

            <div>
              <label className="block text-sm text-white/52">Subheadline</label>
              <textarea
                value={subheadline}
                onChange={(e) => setSubheadline(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none"
                placeholder="Explain what customers are seeing in the widget."
              />
            </div>

            <div>
              <label className="block text-sm text-white/52">Theme</label>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {TESTIMONIAL_WIDGET_THEMES.map((option) => {
                  const active = theme === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTheme(option.value)}
                      className={`rounded-2xl border p-4 text-left transition-all ${
                        active
                          ? "border-emerald-400/25 bg-emerald-500/10"
                          : "border-white/8 bg-white/[0.02]"
                      }`}
                    >
                      <p className="text-sm font-medium text-white">{option.label}</p>
                      <p className="mt-2 text-xs leading-6 text-white/42">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-2xl bg-[linear-gradient(135deg,#34d399,#38bdf8)] px-5 py-3 text-sm font-semibold text-slate-950"
              >
                {saving ? "Saving widget..." : "Save widget settings"}
              </button>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/48">
                Live slug: <span className="text-white">{targetSlug}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/6 bg-white/[0.02] p-6">
          <h2 className="text-lg font-medium text-white">Embed instructions</h2>
          <p className="mt-1 text-sm text-white/42">
            Add this snippet where you want the testimonial block to appear on the
            client website.
          </p>

          <div className="mt-5 rounded-[1.5rem] border border-white/8 bg-[#07111d]/90 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/28">
              Full snippet
            </p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-emerald-200">
              {embedSnippet || "Save settings to generate the embed snippet."}
            </pre>
            <button
              type="button"
              onClick={() => handleCopy(embedSnippet, "snippet")}
              className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm text-white/62"
            >
              {copied === "snippet" ? "Copied" : "Copy snippet"}
            </button>
          </div>

          <div className="mt-4 rounded-[1.5rem] border border-white/8 bg-[#07111d]/90 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/28">
              Script URL
            </p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-sky-200">
              {scriptUrl || "Save settings to generate the script URL."}
            </pre>
            <button
              type="button"
              onClick={() => handleCopy(scriptUrl, "script")}
              className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm text-white/62"
            >
              {copied === "script" ? "Copied" : "Copy script URL"}
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-7 text-white/50">
            The widget only publishes 5-star feedback highlights that have usable
            public-safe copy. If you want more cards to appear, encourage customers to
            leave a short note when they rate the experience.
          </div>
        </section>
      </div>

      <section className="space-y-4">
        <WorkspaceSectionHeader
          eyebrow="Preview"
          title="See the live embed before you publish it"
          description="This preview uses the current headline, subheadline, theme, and available approved feedback so the owner can judge the final presentation."
        />
        <TestimonialWidgetPreview data={previewData} />
      </section>
    </div>
  );
}
