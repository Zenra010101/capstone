import type { Paged } from "@/lib/types";

export type ListResponse<T> = T[] | Partial<Paged<T>>;

export function asList<T>(value: ListResponse<T> | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return Array.isArray(value?.items) ? value.items : [];
}
