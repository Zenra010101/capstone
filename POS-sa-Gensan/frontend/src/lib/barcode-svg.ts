import JsBarcode from "jsbarcode";
import { normalizeScannedBarcode } from "@/lib/barcode-display";

export type BarcodeSvgOptions = {
  height?: number;
  barWidth?: number;
  displayValue?: boolean;
  fontSize?: number;
};

/** Real Code 128 SVG — works without web fonts (print + on-screen). */
export function buildBarcodeSvg(value: string, options: BarcodeSvgOptions = {}): string {
  const code = normalizeScannedBarcode(value);
  if (!code || typeof document === "undefined") return "";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, code, {
    format: "CODE128",
    displayValue: options.displayValue ?? false,
    margin: 4,
    height: options.height ?? 48,
    width: options.barWidth ?? 2,
    fontSize: options.fontSize ?? 12,
    xmlDocument: document,
  });

  return new XMLSerializer().serializeToString(svg);
}
