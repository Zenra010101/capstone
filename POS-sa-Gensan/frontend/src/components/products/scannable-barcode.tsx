"use client";

import { useMemo } from "react";
import { normalizeScannedBarcode } from "@/lib/barcode-display";
import { buildBarcodeSvg } from "@/lib/barcode-svg";

export function ScannableBarcode({
  value,
  size = "md",
  showHumanReadable = true,
  className,
}: {
  value: string;
  size?: "sm" | "md" | "lg";
  showHumanReadable?: boolean;
  className?: string;
}) {
  const code = normalizeScannedBarcode(value);
  const height = size === "sm" ? 36 : size === "lg" ? 64 : 48;

  const svgHtml = useMemo(
    () => (code ? buildBarcodeSvg(code, { height, barWidth: 2 }) : ""),
    [code, height]
  );

  if (!code || !svgHtml) return null;

  return (
    <div className={className}>
      <div
        className="flex justify-center rounded border border-border/60 bg-white px-3 py-2"
        title="Scannable Code 128 barcode"
      >
        <div
          className="max-w-full [&_svg]:h-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      </div>
      {showHumanReadable ? (
        <p className="mt-1 text-center font-mono text-sm tracking-widest">{code}</p>
      ) : null}
    </div>
  );
}
