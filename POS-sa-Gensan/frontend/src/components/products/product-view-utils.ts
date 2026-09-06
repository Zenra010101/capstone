import { formatProductSpec } from "@/lib/format";
import type { Product, ProductMovement } from "@/lib/types";

/** Build scannable specification pills from product fields. */
export function getProductSpecPills(product: Product): string[] {
  if (product.specification?.trim()) {
    const split = product.specification
      .split(/\s*[·•|]\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (split.length > 1) return split;
    if (split.length === 1) return split;
  }

  const pills: string[] = [];
  if (product.grade?.trim()) pills.push(product.grade.trim());
  if (product.materialType?.trim() && !product.grade?.trim()) {
    pills.push(product.materialType.trim());
  }
  if (product.thickness?.trim()) pills.push(product.thickness.trim());
  if (product.schedule?.trim()) pills.push(product.schedule.trim());
  if (product.diameter?.trim()) {
    pills.push(
      product.diameter.trim().startsWith("Ø")
        ? product.diameter.trim()
        : `Ø${product.diameter.trim()}`
    );
  }
  if (product.size?.trim()) pills.push(product.size.trim());
  if (product.width?.trim() || product.height?.trim()) {
    const wh = [product.width, product.height].filter(Boolean).join(" × ");
    if (wh) pills.push(wh);
  }
  if (product.length?.trim()) {
    pills.push(
      product.length.trim().startsWith("L")
        ? product.length.trim()
        : product.length.trim()
    );
  }

  if (pills.length) return pills;

  const fallback = formatProductSpec(product);
  if (!fallback) return [];
  return fallback.split(/\s*[·•|]\s*/).map((s) => s.trim()).filter(Boolean);
}

export type ProductActivitySummary = {
  lastReceived?: string;
  lastSold?: string;
  lastAdjustment?: string;
};

export function summarizeProductActivity(
  movements: ProductMovement[]
): ProductActivitySummary {
  let lastReceived: string | undefined;
  let lastSold: string | undefined;
  let lastAdjustment: string | undefined;

  for (const m of movements) {
    const type = m.movementType.toLowerCase();
    if (!lastReceived && (type.includes("receiving") || type.includes("purchase"))) {
      lastReceived = m.createdAt;
    }
    if (!lastSold && type === "sale") {
      lastSold = m.createdAt;
    }
    if (
      !lastAdjustment &&
      (type.includes("adjustment") ||
        type.includes("correction") ||
        type.includes("manual"))
    ) {
      lastAdjustment = m.createdAt;
    }
  }

  return { lastReceived, lastSold, lastAdjustment };
}
