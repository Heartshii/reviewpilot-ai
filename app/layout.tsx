import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const premiumParticles = [
  { left: "7%", top: "78%", size: "2px", delay: "0s", duration: "8s", animation: "float-up" },
  { left: "16%", top: "92%", size: "3px", delay: "1s", duration: "10s", animation: "float-diagonal" },
  { left: "27%", top: "84%", size: "2px", delay: "2s", duration: "12s", animation: "float-up" },
  { left: "38%", top: "90%", size: "3px", delay: "3s", duration: "14s", animation: "float-diagonal" },
  { left: "49%", top: "80%", size: "2px", delay: "4s", duration: "16s", animation: "float-up" },
  { left: "58%", top: "88%", size: "3px", delay: "5s", duration: "18s", animation: "float-diagonal" },
  { left: "68%", top: "82%", size: "2px", delay: "6s", duration: "20s", animation: "float-up" },
  { left: "77%", top: "91%", size: "3px", delay: "7s", duration: "11s", animation: "float-diagonal" },
  { left: "87%", top: "79%", size: "2px", delay: "8s", duration: "15s", animation: "float-up" },
  { left: "94%", top: "93%", size: "3px", delay: "2.5s", duration: "13s", animation: "float-diagonal" },
];

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReviewPilot AI",
  description:
    "ReviewPilot AI helps location-based businesses recover unhappy guests, grow reviews, and drive repeat visits with kiosk and SMS automation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          suppressHydrationWarning
          className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} relative antialiased`}
        >
          <div
            className="premium-background-layer"
            aria-hidden="true"
            style={{ zIndex: -1 }}
          >
            {premiumParticles.map((particle, index) => (
              <span
                key={`particle-${index}`}
                className="premium-bg-particle"
                style={
                  {
                    left: particle.left,
                    top: particle.top,
                    width: particle.size,
                    height: particle.size,
                    ["--particle-delay" as string]: particle.delay,
                    ["--particle-duration" as string]: particle.duration,
                    ["--particle-animation" as string]: particle.animation,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <div className="relative">
            <Providers>{children}</Providers>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
