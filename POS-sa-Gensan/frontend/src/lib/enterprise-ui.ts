/**
 * Industrial enterprise UI tokens — neutral base, controlled accents.
 */

export const statusBadge = {
  success: "border-green-200 bg-green-100 text-green-700",
  warning: "border-amber-200 bg-amber-100 text-amber-800",
  danger: "border-red-200 bg-red-100 text-red-700",
  info: "border-slate-200 bg-slate-100 text-info",
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
  primary: "border-primary/25 bg-primary/10 text-primary",
} as const;

export type StatusBadgeTone = keyof typeof statusBadge;

export const textAccent = {
  positive: "text-success",
  negative: "text-destructive",
  warning: "text-warning",
  muted: "text-muted-foreground",
} as const;

export const alertSurface = {
  warning: "border-amber-200/80 bg-amber-50/70 text-amber-900",
  danger: "border-red-200/80 bg-red-50/60 text-red-800",
  info: "border-slate-200/80 bg-slate-50/80 text-info",
  neutral: "border-border bg-muted/30 text-foreground",
} as const;

export const softBadge = {
  warning: statusBadge.warning,
  success: statusBadge.success,
  danger: statusBadge.danger,
  info: statusBadge.info,
  neutral: statusBadge.neutral,
  preferred: "border-slate-200 bg-slate-100 text-primary",
} as const;

/** Hide table columns below breakpoint (desktop-first) */
export const colHide = {
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
} as const;

export type ColHideBreakpoint = keyof typeof colHide;
