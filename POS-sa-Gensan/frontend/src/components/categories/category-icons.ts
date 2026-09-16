import {
  Box,
  Circle,
  Cog,
  Layers,
  Package,
  Pipette,
  Settings2,
  Shapes,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICON_OPTIONS = [
  { value: "Package", label: "Package", Icon: Package },
  { value: "Layers", label: "Layers", Icon: Layers },
  { value: "Pipette", label: "Pipe", Icon: Pipette },
  { value: "Circle", label: "Round stock", Icon: Circle },
  { value: "Wrench", label: "Hardware", Icon: Wrench },
  { value: "Cog", label: "Parts", Icon: Cog },
  { value: "Settings2", label: "Fittings", Icon: Settings2 },
  { value: "Shapes", label: "Sheet", Icon: Shapes },
  { value: "Box", label: "Boxed", Icon: Box },
] as const;

export const CATEGORY_COLOR_OPTIONS = [
  { value: "slate", label: "Slate", className: "border-l-slate-400", swatch: "bg-slate-400" },
  { value: "blue", label: "Blue", className: "border-l-blue-500", swatch: "bg-blue-500" },
  { value: "emerald", label: "Emerald", className: "border-l-emerald-500", swatch: "bg-emerald-500" },
  { value: "amber", label: "Amber", className: "border-l-amber-500", swatch: "bg-amber-500" },
  { value: "violet", label: "Violet", className: "border-l-violet-500", swatch: "bg-violet-500" },
  { value: "rose", label: "Rose", className: "border-l-rose-500", swatch: "bg-rose-500" },
] as const;

export function getCategoryIcon(name?: string | null): LucideIcon {
  const found = CATEGORY_ICON_OPTIONS.find((o) => o.value === name);
  return found?.Icon ?? Package;
}

export function getCategoryAccentClass(accent?: string | null): string {
  const found = CATEGORY_COLOR_OPTIONS.find((o) => o.value === accent);
  return found?.className ?? "border-l-slate-300";
}
