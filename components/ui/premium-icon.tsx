import type { SVGProps } from "react";

type IconName =
  | "overview"
  | "customers"
  | "reviews"
  | "loyalty"
  | "sms"
  | "widget"
  | "leaderboard"
  | "competitors"
  | "integrations"
  | "agency"
  | "billing"
  | "settings"
  | "spark"
  | "alert"
  | "trendDown"
  | "trendUp"
  | "clock"
  | "message"
  | "flash"
  | "spend"
  | "repeat"
  | "rocket"
  | "live"
  | "shield"
  | "layers"
  | "chevronLeft"
  | "check"
  | "gift"
  | "receipt";

const sharedProps = {
  fill: "none",
  viewBox: "0 0 24 24",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function AppIcon({
  name,
  className = "h-5 w-5",
  strokeWidth = 1.8,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  const props: SVGProps<SVGSVGElement> = {
    ...sharedProps,
    strokeWidth,
    className,
    "aria-hidden": true,
  };

  switch (name) {
    case "overview":
      return (
        <svg {...props}>
          <path d="M4 13.5 12 5l8 8.5" />
          <path d="M6.5 11.5V19h11v-7.5" />
          <path d="M10 19v-4.5h4V19" />
        </svg>
      );
    case "customers":
      return (
        <svg {...props}>
          <path d="M8.5 13a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M15.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          <path d="M3.5 19a5.5 5.5 0 0 1 10.5 0" />
          <path d="M13.5 19a4 4 0 0 1 7 0" />
        </svg>
      );
    case "reviews":
      return (
        <svg {...props}>
          <path d="m12 4 1.85 3.75 4.15.6-3 2.9.7 4.1L12 13.4l-3.7 1.95.7-4.1-3-2.9 4.15-.6L12 4Z" />
        </svg>
      );
    case "loyalty":
      return (
        <svg {...props}>
          <path d="M12 20 4.5 12.5A4.95 4.95 0 0 1 11.5 5l.5.5.5-.5a4.95 4.95 0 0 1 7 7.5L12 20Z" />
        </svg>
      );
    case "sms":
      return (
        <svg {...props}>
          <path d="M6 7.5h12A2.5 2.5 0 0 1 20.5 10v6A2.5 2.5 0 0 1 18 18.5H10L6 21v-2.5H6A2.5 2.5 0 0 1 3.5 16v-6A2.5 2.5 0 0 1 6 7.5Z" />
          <path d="M8 12h8" />
          <path d="M8 15h5" />
        </svg>
      );
    case "widget":
      return (
        <svg {...props}>
          <rect x="4.5" y="4.5" width="6.5" height="6.5" rx="1.5" />
          <rect x="13" y="4.5" width="6.5" height="6.5" rx="1.5" />
          <rect x="4.5" y="13" width="6.5" height="6.5" rx="1.5" />
          <rect x="13" y="13" width="6.5" height="6.5" rx="1.5" />
        </svg>
      );
    case "leaderboard":
      return (
        <svg {...props}>
          <path d="M7 18.5V11" />
          <path d="M12 18.5V7.5" />
          <path d="M17 18.5v-4" />
          <path d="M4.5 18.5h15" />
        </svg>
      );
    case "competitors":
      return (
        <svg {...props}>
          <path d="M10.5 17A5.5 5.5 0 1 0 10.5 6a5.5 5.5 0 0 0 0 11Z" />
          <path d="m14.5 14.5 5 5" />
        </svg>
      );
    case "integrations":
      return (
        <svg {...props}>
          <path d="M8 8h3V5" />
          <path d="M16 16h-3v3" />
          <path d="M7 17a4 4 0 0 1 0-8h3" />
          <path d="M17 7a4 4 0 0 1 0 8h-3" />
        </svg>
      );
    case "agency":
      return (
        <svg {...props}>
          <path d="M4.5 19V9.5L12 5l7.5 4.5V19" />
          <path d="M8.5 19v-5h3v5" />
          <path d="M14.5 19v-8h3v8" />
        </svg>
      );
    case "billing":
      return (
        <svg {...props}>
          <path d="M12 4v16" />
          <path d="M16 7.5c0-1.4-1.8-2.5-4-2.5S8 6.1 8 7.5 9.8 10 12 10s4 1.1 4 2.5S14.2 15 12 15s-4-1.1-4-2.5" />
        </svg>
      );
    case "settings":
      return (
        <svg {...props}>
          <path d="M12 9.25A2.75 2.75 0 1 0 12 14.75A2.75 2.75 0 1 0 12 9.25Z" />
          <path d="M19.4 12a7.32 7.32 0 0 0-.1-1.15l2-1.55-2-3.46-2.4.8a7.5 7.5 0 0 0-2-.95L14.5 3h-5l-.4 2.7a7.5 7.5 0 0 0-2 .95l-2.4-.8-2 3.46 2 1.55A7.32 7.32 0 0 0 4.6 12c0 .39.03.77.1 1.15l-2 1.55 2 3.46 2.4-.8c.6.39 1.28.72 2 .95L9.5 21h5l.4-2.7c.72-.23 1.4-.56 2-.95l2.4.8 2-3.46-2-1.55c.07-.38.1-.76.1-1.15Z" />
        </svg>
      );
    case "spark":
      return (
        <svg {...props}>
          <path d="m12 4 1.1 3.4L16.5 8.5l-3.4 1.1L12 13l-1.1-3.4L7.5 8.5l3.4-1.1L12 4Z" />
          <path d="m18 13 0.7 2.3L21 16l-2.3.7L18 19l-.7-2.3L15 16l2.3-.7L18 13Z" />
          <path d="m6 14 0.9 2.7L9.5 17l-2.6.8L6 20.5l-.9-2.7L2.5 17l2.6-.8L6 14Z" />
        </svg>
      );
    case "alert":
      return (
        <svg {...props}>
          <path d="M12 4 4.5 18.5h15L12 4Z" />
          <path d="M12 9v4.5" />
          <path d="M12 16.5h.01" />
        </svg>
      );
    case "trendDown":
      return (
        <svg {...props}>
          <path d="m5 8 5 5 4-4 5 5" />
          <path d="M19 14v5h-5" />
        </svg>
      );
    case "trendUp":
      return (
        <svg {...props}>
          <path d="m5 16 5-5 4 4 5-5" />
          <path d="M19 10V5h-5" />
        </svg>
      );
    case "clock":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="7.5" />
          <path d="M12 8v4l2.5 1.5" />
        </svg>
      );
    case "message":
      return (
        <svg {...props}>
          <path d="M5.5 7h13A2.5 2.5 0 0 1 21 9.5v5A2.5 2.5 0 0 1 18.5 17H10l-4.5 3v-3A2.5 2.5 0 0 1 3 14.5v-5A2.5 2.5 0 0 1 5.5 7Z" />
        </svg>
      );
    case "flash":
      return (
        <svg {...props}>
          <path d="M13.5 3 7 12h4l-0.5 9L17 12h-4L13.5 3Z" />
        </svg>
      );
    case "spend":
      return (
        <svg {...props}>
          <path d="M12 4v16" />
          <path d="M16.25 7.75c0-1.66-1.9-2.75-4.25-2.75S7.75 6.09 7.75 7.75 9.65 10.5 12 10.5s4.25 1.09 4.25 2.75S14.35 16 12 16s-4.25-1.09-4.25-2.75" />
        </svg>
      );
    case "repeat":
      return (
        <svg {...props}>
          <path d="M17.5 7.5H8a3.5 3.5 0 1 0 0 7h8.5" />
          <path d="m15 5 2.5 2.5L15 10" />
          <path d="m9 14  -2.5 2.5L9 19" />
        </svg>
      );
    case "rocket":
      return (
        <svg {...props}>
          <path d="M14 5c2.5 0 4.5 2 4.5 4.5v2L12 18l-6.5-6.5h2C12 11.5 14 9.5 14 5Z" />
          <path d="M8 16 5 19" />
          <path d="M5 13h3" />
        </svg>
      );
    case "live":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="2.5" />
          <path d="M4.5 12a7.5 7.5 0 0 1 15 0" />
          <path d="M4.5 12a7.5 7.5 0 0 0 15 0" />
        </svg>
      );
    case "shield":
      return (
        <svg {...props}>
          <path d="M12 4 18.5 6.5v5.3c0 3.2-2.4 6.1-6.5 8.2-4.1-2.1-6.5-5-6.5-8.2V6.5L12 4Z" />
          <path d="m9.5 12 1.8 1.8 3.2-3.5" />
        </svg>
      );
    case "layers":
      return (
        <svg {...props}>
          <path d="m12 4 8 4-8 4-8-4 8-4Z" />
          <path d="m4 12 8 4 8-4" />
          <path d="m4 16 8 4 8-4" />
        </svg>
      );
    case "chevronLeft":
      return (
        <svg {...props}>
          <path d="m14.5 6.5-5 5 5 5" />
        </svg>
      );
    case "check":
      return (
        <svg {...props}>
          <path d="m6.5 12.5 3.2 3.2 7.8-8.2" />
        </svg>
      );
    case "gift":
      return (
        <svg {...props}>
          <path d="M5 10.5h14V19H5z" />
          <path d="M12 10.5V19" />
          <path d="M4 7.5h16v3H4z" />
          <path d="M9.5 7.5c-1.4 0-2.5-.9-2.5-2.2S8 3 9.2 3c1.7 0 2.8 2 2.8 4.5" />
          <path d="M14.5 7.5c1.4 0 2.5-.9 2.5-2.2S16 3 14.8 3c-1.7 0-2.8 2-2.8 4.5" />
        </svg>
      );
    case "receipt":
      return (
        <svg {...props}>
          <path d="M7 4.5h10v15l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4V4.5Z" />
          <path d="M9.5 8.5h5" />
          <path d="M9.5 11.5h5" />
          <path d="M9.5 14.5h3.5" />
        </svg>
      );
    default:
      return null;
  }
}

export function IconBadge({
  name,
  className = "",
  iconClassName = "h-[18px] w-[18px]",
}: {
  name: IconName;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${className}`}
    >
      <AppIcon name={name} className={iconClassName} />
    </span>
  );
}
