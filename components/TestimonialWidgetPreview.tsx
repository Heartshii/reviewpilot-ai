import {
  TESTIMONIAL_WIDGET_THEMES,
  type PublicTestimonialWidgetData,
  type TestimonialWidgetTheme,
} from "@/lib/testimonial-widget";

function themeClasses(theme: TestimonialWidgetTheme) {
  if (theme === "MIDNIGHT") {
    return {
      frame: "border-sky-400/15 bg-[#09111d]/90",
      chip: "border-sky-400/20 bg-sky-500/12 text-sky-200",
      star: "text-sky-300",
      glow: "from-sky-500/10 via-cyan-400/6 to-transparent",
    };
  }
  if (theme === "GLASS") {
    return {
      frame: "border-white/10 bg-white/[0.06]",
      chip: "border-white/12 bg-white/8 text-white/72",
      star: "text-emerald-200",
      glow: "from-emerald-400/10 via-white/6 to-transparent",
    };
  }
  return {
    frame: "border-emerald-400/15 bg-[#08111d]/92",
    chip: "border-emerald-400/20 bg-emerald-500/12 text-emerald-200",
    star: "text-emerald-300",
    glow: "from-emerald-400/12 via-cyan-400/8 to-transparent",
  };
}

export function TestimonialWidgetPreview({
  data,
}: {
  data: PublicTestimonialWidgetData | null | undefined;
}) {
  if (!data) {
    return (
      <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center text-white/42">
        Enable the widget and collect a few 5-star experiences to preview the live embed.
      </div>
    );
  }

  const theme = themeClasses(data.theme);
  const themeMeta =
    TESTIMONIAL_WIDGET_THEMES.find((option) => option.value === data.theme) ??
    TESTIMONIAL_WIDGET_THEMES[0];

  return (
    <div className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] ${theme.frame}`}>
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b ${theme.glow}`}
      />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
            {data.badgeLabel}
          </div>
          <div className={`rounded-full border px-3 py-1 text-xs ${theme.chip}`}>
            {themeMeta.label}
          </div>
        </div>

        <div className="mt-6 max-w-2xl">
          <p className="text-2xl font-semibold text-white">{data.headline}</p>
          <p className="mt-3 text-sm leading-7 text-white/55">{data.subheadline}</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {data.items.map((item) => (
            <article
              key={item.id}
              className="rounded-[1.6rem] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-sm"
            >
              <div className={`text-sm ${theme.star}`}>★★★★★</div>
              <p className="mt-4 text-sm leading-7 text-white/72">
                &ldquo;{item.quote}&rdquo;
              </p>
              <div className="mt-5 border-t border-white/8 pt-4">
                <p className="text-sm font-medium text-white">{item.customerName}</p>
                <p className="mt-1 text-xs text-white/35">
                  {item.visitCount > 1
                    ? `${item.visitCount} visits captured`
                    : "Verified 5-star visit"}
                </p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
          <p className="text-xs uppercase tracking-[0.16em] text-white/32">
            {data.footerLabel}
          </p>
          {data.supportEmail ? (
            <p className="text-xs text-white/38">{data.supportEmail}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
