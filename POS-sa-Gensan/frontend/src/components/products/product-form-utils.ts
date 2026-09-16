import type { Category } from "@/lib/types";
import type { ProductFormState } from "./product-form-fields";

export type CategorySpecProfile = "pipe" | "sheet" | "hardware" | "general";

export type SpecFieldKey =
  | "grade"
  | "materialType"
  | "thickness"
  | "schedule"
  | "diameter"
  | "size"
  | "width"
  | "height"
  | "length";

const PROFILE_FIELDS: Record<CategorySpecProfile, SpecFieldKey[]> = {
  pipe: ["grade", "materialType", "schedule", "diameter", "size", "length"],
  sheet: ["grade", "materialType", "thickness", "width", "length"],
  hardware: ["size", "materialType"],
  general: [
    "grade",
    "materialType",
    "thickness",
    "schedule",
    "diameter",
    "size",
    "width",
    "height",
    "length",
  ],
};

export function getCategorySpecProfile(categoryName?: string): CategorySpecProfile {
  const name = (categoryName ?? "").toLowerCase();
  if (/pipe|tube|tubing/.test(name)) return "pipe";
  if (/sheet|plate|flat/.test(name)) return "sheet";
  if (/hardware|accessor|fastener|bolt|nut|screw|abrasive|tool/.test(name)) return "hardware";
  return "general";
}

export function isSpecFieldVisible(
  field: SpecFieldKey,
  profile: CategorySpecProfile
): boolean {
  return PROFILE_FIELDS[profile].includes(field);
}

function slugPart(value: string): string {
  return value
    .trim()
    .replace(/[^\w./"]+/g, "-")
    .replace(/"/g, "")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
}

function categoryCode(categoryName?: string): string {
  const profile = getCategorySpecProfile(categoryName);
  if (profile === "pipe") return "PIPE";
  if (profile === "sheet") return "SHEET";
  if (profile === "hardware") return "HW";
  const token = (categoryName ?? "GEN").split(/\s+/)[0] ?? "GEN";
  return slugPart(token).slice(0, 8) || "GEN";
}

export function generateProductSku(
  form: ProductFormState,
  categoryName?: string
): string {
  const parts = ["SS", categoryCode(categoryName)];
  if (form.size.trim()) parts.push(slugPart(form.size));
  if (form.schedule.trim()) {
    const sch = form.schedule.trim().toUpperCase().replace(/^SCH\s*/i, "SCH");
    parts.push(slugPart(sch.startsWith("SCH") ? sch : `SCH${sch}`));
  } else if (form.diameter.trim()) {
    parts.push(slugPart(form.diameter));
  } else if (form.thickness.trim()) {
    parts.push(slugPart(form.thickness));
  } else if (form.width.trim() && form.length.trim()) {
    parts.push(`${slugPart(form.width)}X${slugPart(form.length)}`);
  }
  return parts.filter(Boolean).join("-");
}

export function generateClientBarcode(seed: string): string {
  let hash = 0;
  const text = seed.trim() || `new-${Date.now()}`;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  const suffix = Math.abs(hash).toString().padStart(8, "0").slice(0, 8);
  return `GSP${suffix}`;
}

export function buildProductSummaryPreview(
  form: ProductFormState,
  categoryName?: string
): { title: string; lines: string[] } {
  const title = form.name.trim() || "New product preview";
  const lines: string[] = [];

  if (categoryName) lines.push(categoryName);
  if (form.grade.trim()) lines.push(`${form.grade.trim()} stainless`);
  if (form.materialType.trim() && !form.grade.trim()) lines.push(form.materialType.trim());

  const specParts: string[] = [];
  if (form.schedule.trim()) specParts.push(form.schedule.trim());
  if (form.diameter.trim()) {
    specParts.push(
      form.diameter.trim().startsWith("Ø")
        ? form.diameter.trim()
        : `Ø${form.diameter.trim()}`
    );
  }
  if (form.size.trim()) specParts.push(form.size.trim());
  if (form.thickness.trim()) specParts.push(form.thickness.trim());
  if (form.width.trim() || form.height.trim()) {
    const wh = [form.width, form.height].filter(Boolean).join(" × ");
    if (wh) specParts.push(wh);
  }
  if (form.length.trim()) {
    specParts.push(
      form.length.trim().toLowerCase().startsWith("l")
        ? form.length.trim()
        : `Length: ${form.length.trim()}`
    );
  }
  if (specParts.length) lines.push(specParts.join(" · "));

  if (form.unitOfMeasure) lines.push(`Unit: ${form.unitOfMeasure}`);
  if (form.sku.trim()) lines.push(`SKU: ${form.sku.trim()}`);

  return { title, lines };
}

export function findCategoryName(
  categories: Category[],
  categoryId: string
): string | undefined {
  return categories.find((c) => c.id === categoryId)?.name;
}
