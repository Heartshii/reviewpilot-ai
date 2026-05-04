"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

function downloadFile(filename: string, url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
}

export function KioskQrCard({
  slug,
  accentColor,
}: {
  slug: string;
  accentColor: string;
}) {
  const [origin] = useState(() =>
    typeof window === "undefined" ? "http://localhost:3000" : window.location.origin
  );
  const [pngUrl, setPngUrl] = useState("");
  const [svgMarkup, setSvgMarkup] = useState("");
  const [copied, setCopied] = useState(false);

  const kioskUrl = useMemo(() => `${origin}/kiosk/${slug}`, [origin, slug]);

  useEffect(() => {
    let cancelled = false;

    const generateQrAssets = async () => {
      const [nextPng, nextSvg] = await Promise.all([
        QRCode.toDataURL(kioskUrl, {
          width: 480,
          margin: 1,
          color: { dark: "#ecfdf5", light: "#0000" },
        }),
        QRCode.toString(kioskUrl, {
          type: "svg",
          width: 480,
          margin: 1,
          color: { dark: "#ecfdf5", light: "#0000" },
        }),
      ]);

      if (!cancelled) {
        setPngUrl(nextPng);
        setSvgMarkup(nextSvg);
      }
    };

    void generateQrAssets();

    return () => {
      cancelled = true;
    };
  }, [kioskUrl]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(kioskUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([svgMarkup], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    downloadFile(`${slug}-kiosk-qr.svg`, url);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Kiosk QR Code</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/45">
            Print or share a scannable QR code that sends customers straight to
            your branded kiosk.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/65 hover:text-white"
          >
            {copied ? "Copied link" : "Copy kiosk link"}
          </button>
          <a
            href={kioskUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-emerald-500/20 bg-emerald-500/12 px-4 py-2 text-sm text-emerald-300"
          >
            Open kiosk
          </a>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[300px_1fr]">
        <div className="rounded-[1.75rem] border border-white/8 bg-[#08111d] p-5">
          <div
            className="rounded-[1.4rem] border border-white/8 p-4"
            style={{
              background:
                "radial-gradient(circle at top, rgba(52, 211, 153, 0.12), rgba(8, 17, 29, 0.92) 60%)",
              borderColor: `${accentColor}33`,
            }}
          >
            {pngUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- QR preview is generated client-side as a data URL
              <img
                src={pngUrl}
                alt="Kiosk QR code"
                className="w-full rounded-2xl bg-white/2 p-3"
              />
            ) : (
              <div className="flex h-[240px] items-center justify-center rounded-2xl border border-white/8 text-sm text-white/40">
                Generating QR...
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-white/30">
              Destination
            </p>
            <p className="mt-3 break-all text-sm text-white/72">{kioskUrl}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => pngUrl && downloadFile(`${slug}-kiosk-qr.png`, pngUrl)}
              className="rounded-[1.35rem] bg-[linear-gradient(135deg,#34d399,#4cc9f0)] px-6 py-4 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(76,201,240,0.18)]"
            >
              Download PNG
            </button>
            <button
              type="button"
              onClick={handleDownloadSvg}
              className="rounded-[1.35rem] border border-white/10 px-6 py-4 text-sm font-semibold text-white/70 hover:text-white"
            >
              Download SVG
            </button>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-sm leading-7 text-white/50">
            Use this on table tents, receipts, front-desk signage, or a printed
            stand next to the tablet so customers can re-open the loyalty flow from
            their own phones.
          </div>
        </div>
      </div>
    </section>
  );
}
