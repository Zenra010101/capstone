"use client";

type LockedPrintStampProps = {
  label: string;
  className?: string;
};

/** Read-only server timestamp for printed documents. */
export function LockedPrintStamp({ label, className = "" }: LockedPrintStampProps) {
  return (
    <p
      className={`print-stamp-locked text-[9px] text-slate-600 ${className}`}
      data-server-stamp="true"
    >
      {label}
    </p>
  );
}
