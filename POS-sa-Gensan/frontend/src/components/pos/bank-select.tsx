"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  isListedPhilippineBank,
  OTHER_BANK_OPTION,
  PHILIPPINE_BANKS,
} from "@/lib/philippine-banks";

type BankSelectProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  otherPlaceholder?: string;
  triggerClassName?: string;
};

export function BankSelect({
  value,
  onChange,
  placeholder = "Select bank",
  otherPlaceholder = "Type bank name if not listed above",
  triggerClassName = "h-11 w-full",
}: BankSelectProps) {
  const trimmed = value.trim();
  const [otherSelected, setOtherSelected] = useState(
    () => trimmed.length > 0 && !isListedPhilippineBank(trimmed)
  );

  useEffect(() => {
    const t = value.trim();
    if (t.length > 0 && !isListedPhilippineBank(t)) {
      setOtherSelected(true);
    } else if (t.length > 0 && isListedPhilippineBank(t)) {
      setOtherSelected(false);
    }
  }, [value]);

  const selectKey = otherSelected
    ? OTHER_BANK_OPTION
    : trimmed.length > 0
      ? trimmed
      : null;

  const displayLabel = otherSelected
    ? trimmed || "Other bank"
    : trimmed || null;

  return (
    <div className="space-y-2">
      <Select
        value={selectKey}
        onValueChange={(next) => {
          if (next === OTHER_BANK_OPTION) {
            setOtherSelected(true);
            onChange("");
            return;
          }
          setOtherSelected(false);
          onChange(next ?? "");
        }}
      >
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={placeholder}>{displayLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PHILIPPINE_BANKS.map((bank) => (
            <SelectItem key={bank} value={bank}>
              {bank}
            </SelectItem>
          ))}
          <SelectItem value={OTHER_BANK_OPTION}>
            Other bank (not listed)
          </SelectItem>
        </SelectContent>
      </Select>

      {otherSelected && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Bank name
          </Label>
          <Input
            className="h-11"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={otherPlaceholder}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Enter the full bank name if it is not in the list.
          </p>
        </div>
      )}
    </div>
  );
}
