import Link from "next/link";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { buttonVariants } from "@/components/ui/button";

import { alertSurface, type StatusBadgeTone } from "@/lib/enterprise-ui";



type Tone = StatusBadgeTone | "neutral";



const tones: Record<Tone, string> = {

  warning: alertSurface.warning,

  danger: alertSurface.danger,

  info: alertSurface.info,

  neutral: alertSurface.neutral,

  success: alertSurface.neutral,

  primary: alertSurface.neutral,

};



export function AlertBanner({

  message,

  href,

  actionLabel = "View",

  icon: Icon,

  tone = "warning",

  className,

}: {

  message: React.ReactNode;

  href?: string;

  actionLabel?: string;

  icon?: LucideIcon;

  tone?: Tone;

  className?: string;

}) {

  return (

    <div

      className={cn(

        "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-erp",

        tones[tone],

        className

      )}

    >

      <p className="flex items-center gap-2 font-medium">

        {Icon && <Icon className="h-4 w-4 shrink-0 opacity-75" />}

        {message}

      </p>

      {href && (

        <Link

          href={href}

          className={cn(

            buttonVariants({ variant: "outline", size: "sm" }),

            "border-border/80 bg-card hover:bg-muted"

          )}

        >

          {actionLabel}

        </Link>

      )}

    </div>

  );

}

