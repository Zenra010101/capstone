import { formatCurrency } from "@/lib/format";
import { buildBarcodeSvg } from "@/lib/barcode-svg";
import type { Product } from "@/lib/types";

export type LabelSizeKey = "small" | "medium" | "large" | "sheet";

export type BarcodeLabelOptions = {
  size: LabelSizeKey;
  copiesPerProduct: number;
  showName: boolean;
  showSku: boolean;
  showPrice: boolean;
  showCategory: boolean;
  showUnit: boolean;
};

export const LABEL_SIZE_OPTIONS: { value: LabelSizeKey; label: string; hint: string; group: "sheet" | "thermal" }[] = [
  { value: "sheet", label: "Sheet labels — A4 (3×8)", hint: "24 labels per page, office laser/inkjet", group: "sheet" },
  { value: "small", label: "Thermal — 50 × 30 mm", hint: "Compact shelf / bin sticker", group: "thermal" },
  { value: "medium", label: "Thermal — 70 × 40 mm", hint: "Standard warehouse label", group: "thermal" },
  { value: "large", label: "Thermal — 100 × 50 mm", hint: "High-visibility rack label", group: "thermal" },
];

/** Labels per physical page for sheet layout; thermal sizes print one label per page. */
export function estimateLabelPages(labelCount: number, size: LabelSizeKey): number {
  if (labelCount <= 0) return 0;
  if (size === "sheet") return Math.ceil(labelCount / 24);
  return labelCount;
}

export const DEFAULT_LABEL_OPTIONS: BarcodeLabelOptions = {
  size: "sheet",
  copiesPerProduct: 1,
  showName: true,
  showSku: true,
  showPrice: true,
  showCategory: false,
  showUnit: true,
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sizeStyles(size: LabelSizeKey) {
  switch (size) {
    case "small":
      return {
        page: "size: 50mm 30mm; margin: 2mm;",
        label: "width: 46mm; min-height: 26mm; padding: 3mm;",
        name: "font-size: 9px;",
        meta: "font-size: 8px;",
        price: "font-size: 10px;",
        barHeight: 32,
        code: "font-size: 9px;",
        sheet: false,
      };
    case "medium":
      return {
        page: "size: 70mm 40mm; margin: 3mm;",
        label: "width: 64mm; min-height: 34mm; padding: 4mm;",
        name: "font-size: 10px;",
        meta: "font-size: 9px;",
        price: "font-size: 12px;",
        barHeight: 40,
        code: "font-size: 10px;",
        sheet: false,
      };
    case "large":
      return {
        page: "size: 100mm 50mm; margin: 4mm;",
        label: "width: 92mm; min-height: 42mm; padding: 5mm;",
        name: "font-size: 11px;",
        meta: "font-size: 10px;",
        price: "font-size: 14px;",
        barHeight: 48,
        code: "font-size: 11px;",
        sheet: false,
      };
    case "sheet":
    default:
      return {
        page: "size: A4; margin: 8mm;",
        label:
          "width: 100%; min-height: 32mm; padding: 3mm; border: 1px dashed #ccc; border-radius: 2px;",
        name: "font-size: 9px;",
        meta: "font-size: 8px;",
        price: "font-size: 10px;",
        barHeight: 36,
        code: "font-size: 9px;",
        sheet: true,
      };
  }
}

function renderLabel(product: Product, barcode: string, options: BarcodeLabelOptions, styles: ReturnType<typeof sizeStyles>) {
  const lines: string[] = [];

  if (options.showName) {
    lines.push(`<div class="name" style="${styles.name}">${escapeHtml(product.name)}</div>`);
  }
  if (options.showSku) {
    lines.push(`<div class="meta" style="${styles.meta}">SKU: ${escapeHtml(product.sku)}</div>`);
  }
  if (options.showCategory && product.categoryName) {
    lines.push(`<div class="meta" style="${styles.meta}">${escapeHtml(product.categoryName)}</div>`);
  }
  if (options.showUnit) {
    lines.push(`<div class="meta" style="${styles.meta}">Unit: ${escapeHtml(product.unitOfMeasure)}</div>`);
  }
  if (options.showPrice) {
    lines.push(
      `<div class="price" style="${styles.price}">${escapeHtml(formatCurrency(product.unitPrice))}</div>`
    );
  }

  const svg = buildBarcodeSvg(barcode, { height: styles.barHeight, barWidth: 2 });
  lines.push(`<div class="bars">${svg}</div>`);
  lines.push(`<div class="code" style="${styles.code}">${escapeHtml(barcode)}</div>`);

  return `<div class="label" style="${styles.label}">${lines.join("")}</div>`;
}

export function buildBarcodeSheetHtml(products: Product[], options: BarcodeLabelOptions, title: string) {
  const styles = sizeStyles(options.size);
  const copies = Math.min(99, Math.max(1, options.copiesPerProduct));

  const labels: string[] = [];
  for (const product of products) {
    const barcode = product.barcode?.trim();
    if (!barcode) continue;
    for (let i = 0; i < copies; i++) {
      labels.push(renderLabel(product, barcode, options, styles));
    }
  }

  const body = styles.sheet
    ? `<div class="sheet">${labels.join("")}</div>`
    : labels.join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { ${styles.page} }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; margin: 0; color: #111; }
  .sheet {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4mm;
    padding: 2mm;
  }
  .label {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .label:not(.sheet .label) { page-break-after: always; }
  .name { font-weight: 600; line-height: 1.2; margin-bottom: 2px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
  .meta { color: #444; line-height: 1.25; }
  .price { font-weight: 700; margin: 3px 0; }
  .bars { margin-top: 2px; line-height: 0; }
  .bars svg { max-width: 100%; height: auto; }
  .code { letter-spacing: 1px; margin-top: 2px; font-family: ui-monospace, monospace; }
  @media print {
    .no-print { display: none !important; }
  }
</style></head><body>
${body}
<script>
  window.onload = function() {
    /*AUTO_PRINT_PLACEHOLDER*/
  };
</script>
</body></html>`;
}

export function openBarcodePrintWindow(
  products: Product[],
  options: BarcodeLabelOptions,
  mode: "print" | "pdf"
): boolean {
  const withBarcode = products.filter((p) => p.barcode?.trim());
  if (!withBarcode.length) return false;

  const title =
    mode === "pdf"
      ? `Barcode labels — ${withBarcode.length} products`
      : `Print barcodes — ${withBarcode.length} products`;

  const autoPrintScript =
    mode === "print" ? "setTimeout(function() { window.print(); }, 300);" : "";
  const pdfBanner =
    mode === "pdf"
      ? `<div class="no-print" style="padding:10px 14px;background:#fef3c7;border-bottom:1px solid #fcd34d;font-size:13px;">
           Export PDF: open the print dialog and choose <strong>Save as PDF</strong> as the destination.
         </div>`
      : "";
  const html = buildBarcodeSheetHtml(withBarcode, options, title)
    .replace("/*AUTO_PRINT_PLACEHOLDER*/", autoPrintScript)
    .replace("<body>", `<body>${pdfBanner}`);
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return false;

  w.document.write(html);
  w.document.close();
  w.focus();

  return true;
}

export function productsMissingBarcode(products: Product[]) {
  return products.filter((p) => !p.barcode?.trim());
}
