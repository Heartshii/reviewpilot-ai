import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ReviewPilot Owner Hub",
    short_name: "ReviewPilot",
    description:
      "Mobile-friendly owner hub for approvals, alerts, loyalty claims, and review recovery.",
    start_url: "/owner",
    display: "standalone",
    background_color: "#07111d",
    theme_color: "#10b981",
  };
}
