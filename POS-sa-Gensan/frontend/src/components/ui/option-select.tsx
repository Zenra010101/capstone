"use client";

import { useMemo, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export type OptionSelectItem = { value: string; label: string; searchText?: string };

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  options: OptionSelectItem[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  triggerId?: string;
  emptyMessage?: string;
};

/** Select that always shows human-readable labels (not raw values) with optional search. */
export function OptionSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  searchable = false,
  searchPlaceholder = "Search...",
  disabled,
  className,
  triggerClassName,
  triggerId,
  emptyMessage = "No matches",
}: Props) {
  const [search, setSearch] = useState("");

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label,
    [options, value]
  );

  const filtered = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.searchText ?? o.value).toLowerCase().includes(q)
    );
  }, [options, search, searchable]);

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        onValueChange(v ?? "");
        setSearch("");
      }}
      disabled={disabled}
    >
      <SelectTrigger
        id={triggerId}
        className={cn("w-full min-w-0", triggerClassName)}
        disabled={disabled}
      >
        <span
          className={cn(
            "truncate text-left",
            !selectedLabel && "text-muted-foreground"
          )}
        >
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDownIcon className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </SelectTrigger>
      <SelectContent className={className}>
        {searchable && (
          <div className="sticky top-0 z-10 border-b bg-popover p-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        )}
        {filtered.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">{emptyMessage}</p>
        ) : (
          filtered.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              <span className="flex items-center gap-2">
                {value === o.value && <CheckIcon className="size-3.5 opacity-70" />}
                {o.label}
              </span>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
