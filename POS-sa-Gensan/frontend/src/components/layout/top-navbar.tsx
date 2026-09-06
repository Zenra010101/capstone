"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Package, SlidersHorizontal, Truck } from "lucide-react";
import { GlobalSearch } from "./global-search";
import { useAuth } from "@/contexts/auth-context";
import { useSidebar } from "@/contexts/sidebar-context";
import { useAlerts } from "@/contexts/alerts-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { statusBadge } from "@/lib/enterprise-ui";
import { cn } from "@/lib/utils";

function TopAlert({
  href,
  label,
  shortLabel,
  tone,
  icon: Icon,
}: {
  href: string;
  label: string;
  shortLabel: string;
  tone: keyof typeof statusBadge;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors hover:opacity-90",
        statusBadge[tone]
      )}
      title={label}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{shortLabel}</span>
    </Link>
  );
}

export function TopNavbar() {
  const { user } = useAuth();
  const { setMobileOpen } = useSidebar();
  const { alerts } = useAlerts();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const isOwner = user?.role === "Owner";

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-border bg-card/95 shadow-erp backdrop-blur-sm">
      <div className="flex h-14 min-w-0 items-center gap-1.5 px-2 sm:gap-3 sm:px-4 lg:px-6">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="shrink-0 lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <GlobalSearch />

        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
          <div className="flex max-w-[min(42vw,12rem)] items-center gap-1 overflow-x-auto sm:max-w-none md:overflow-visible">
            {isOwner && (alerts?.pendingReceivingsCount ?? 0) > 0 && (
              <TopAlert
                href="/stock-receiving?status=0"
                label={`${alerts?.pendingReceivingsCount} receiving`}
                shortLabel={`${alerts?.pendingReceivingsCount} RCV`}
                tone="warning"
                icon={Truck}
              />
            )}
            {isOwner && (alerts?.pendingAdjustmentsCount ?? 0) > 0 && (
              <TopAlert
                href="/adjustments?status=0"
                label={`${alerts?.pendingAdjustmentsCount} adjustments`}
                shortLabel={`${alerts?.pendingAdjustmentsCount} adj`}
                tone="info"
                icon={SlidersHorizontal}
              />
            )}
            {(alerts?.lowStockCount ?? 0) > 0 && (
              <TopAlert
                href="/inventory"
                label={`${alerts?.lowStockCount} low stock`}
                shortLabel={`${alerts?.lowStockCount} low`}
                tone="danger"
                icon={Package}
              />
            )}
          </div>

          <div className="hidden h-5 w-px shrink-0 bg-border sm:block" />

          <time
            className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block"
            dateTime={now.toISOString()}
          >
            {now.toLocaleDateString("en-PH", {
              timeZone: "Asia/Manila",
              weekday: "short",
              month: "short",
              day: "numeric",
            })}{" "}
            <span className="text-foreground/80">
              {now.toLocaleTimeString("en-PH", {
                timeZone: "Asia/Manila",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </time>

          <div className="flex shrink-0 items-center gap-1 border-l border-border/60 pl-1 sm:gap-2 sm:pl-2 md:pl-3">
            <div className="hidden min-w-0 text-right md:block">
              <p className="max-w-[120px] truncate text-xs font-medium leading-tight lg:max-w-[140px]">
                {user?.fullName}
              </p>
              <p className="max-w-[120px] truncate text-[10px] text-muted-foreground lg:max-w-[140px]">
                {user?.email}
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "h-5 shrink-0 text-[10px] font-semibold uppercase tracking-wide",
                isOwner ? statusBadge.info : statusBadge.neutral
              )}
            >
              {user?.role}
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
}
