"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const CARD_ACTION_SELECTOR =
  "button, a, input, select, textarea, label, [data-card-action], [role='menuitem'], [data-slot='dropdown-menu-trigger']";

type ClickableCardProps = React.ComponentProps<typeof Card> & {
  onCardClick?: () => void;
  contentClassName?: string;
  children: React.ReactNode;
};

/** Card grid item — click opens detail; actions/links use CardActions or data-card-action */
export function ClickableCard({
  onCardClick,
  className,
  contentClassName,
  children,
  onClick,
  ...props
}: ClickableCardProps) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || !onCardClick) return;
    const target = e.target as HTMLElement;
    if (target.closest(CARD_ACTION_SELECTOR)) return;
    onCardClick();
  };

  return (
    <Card
      {...props}
      onClick={onCardClick || onClick ? handleClick : undefined}
      title={onCardClick ? "Click to view details" : undefined}
      className={cn(onCardClick && "cursor-pointer", className)}
    >
      <CardContent className={contentClassName ?? "p-5"}>{children}</CardContent>
    </Card>
  );
}

/** Footer / toolbar on a clickable card — clicks do not open detail */
export function CardActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div data-card-action className={className} {...props} />;
}
