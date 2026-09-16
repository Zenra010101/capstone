"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { colHide, type ColHideBreakpoint } from "@/lib/enterprise-ui"

function Table({
  className,
  enterprise = false,
  ...props
}: React.ComponentProps<"table"> & { enterprise?: boolean }) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        "relative w-full overflow-x-auto",
        enterprise && "erp-table"
      )}
    >
      <table
        data-slot="table"
        className={cn(
          "w-full min-w-[640px] caption-bottom text-sm",
          !enterprise && "min-w-0",
          className
        )}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

const ROW_ACTION_SELECTOR =
  "button, a, input, select, textarea, label, [data-row-action], [role='menuitem'], [data-slot='dropdown-menu-trigger']"

function TableRow({
  className,
  onRowClick,
  onClick,
  ...props
}: React.ComponentProps<"tr"> & { onRowClick?: () => void }) {
  const handleClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || !onRowClick) return
    const target = e.target as HTMLElement
    if (target.closest(ROW_ACTION_SELECTOR)) return
    onRowClick()
  }

  return (
    <tr
      data-slot="table-row"
      onClick={onRowClick || onClick ? handleClick : undefined}
      title={onRowClick ? "Click to view details" : undefined}
      className={cn(
        "border-b border-border/50 transition-colors hover:bg-muted/40 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted/60",
        onRowClick && "cursor-pointer",
        className
      )}
      {...props}
    />
  )
}

function TableHead({
  className,
  sticky,
  hideBelow,
  ...props
}: React.ComponentProps<"th"> & {
  sticky?: boolean
  hideBelow?: ColHideBreakpoint
}) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-9 px-3 text-left align-middle text-xs font-semibold whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pr-0",
        sticky && "erp-col-sticky",
        hideBelow && colHide[hideBelow],
        className
      )}
      {...props}
    />
  )
}

function TableCell({
  className,
  sticky,
  hideBelow,
  ...props
}: React.ComponentProps<"td"> & {
  sticky?: boolean
  hideBelow?: ColHideBreakpoint
}) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-2.5 align-middle text-sm [&:has([role=checkbox])]:pr-0",
        sticky && "erp-col-sticky",
        hideBelow && colHide[hideBelow],
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

/** Actions column — clicks here do not trigger row open */
function TableRowActions({
  className,
  ...props
}: React.ComponentProps<"td">) {
  return (
    <TableCell
      data-row-action
      className={cn("text-right", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableRowActions,
  TableCell,
  TableCaption,
}
