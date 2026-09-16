"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Warehouse,
  Receipt,
  RotateCcw,
  SlidersHorizontal,
  Users,
  Truck,
  Building2,
  UserCircle,
  Wallet,
  FileText,
  Settings,
  LogOut,
  BarChart3,
  Shield,
  ClipboardList,
  Banknote,
  CheckSquare,
  PanelLeftClose,
  PanelLeft,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useSidebar } from "@/contexts/sidebar-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: ("Owner" | "Cashier")[];
};

type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: "Operations",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["Owner", "Cashier"] },
      { href: "/pos", label: "Point of Sale", icon: ShoppingCart, roles: ["Owner", "Cashier"] },
      { href: "/sales", label: "Sales", icon: Receipt, roles: ["Owner", "Cashier"] },
      { href: "/sales-report", label: "Daily sales report", icon: FileText, roles: ["Owner", "Cashier"] },
      { href: "/returns", label: "Returns (GRS)", icon: RotateCcw, roles: ["Owner", "Cashier"] },
    ],
  },
  {
    title: "Inventory",
    items: [
      { href: "/products", label: "Products", icon: Package, roles: ["Owner", "Cashier"] },
      { href: "/categories", label: "Categories", icon: Tags, roles: ["Owner"] },
      { href: "/inventory", label: "Inventory", icon: Warehouse, roles: ["Owner", "Cashier"] },
      { href: "/adjustments", label: "Adjustments", icon: SlidersHorizontal, roles: ["Owner", "Cashier"] },
      { href: "/stock-receiving", label: "Stock receiving", icon: Truck, roles: ["Owner", "Cashier"] },
      { href: "/suppliers", label: "Suppliers", icon: Building2, roles: ["Owner", "Cashier"] },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/receivables", label: "Receivables", icon: Wallet, roles: ["Owner", "Cashier"] },
      { href: "/customers", label: "Customers", icon: UserCircle, roles: ["Owner", "Cashier"] },
      { href: "/ledger", label: "Customer ledger", icon: Receipt, roles: ["Owner", "Cashier"] },
      { href: "/cheques", label: "Cheques / PDC", icon: FileText, roles: ["Owner", "Cashier"] },
      { href: "/expenses", label: "Expenses", icon: Banknote, roles: ["Owner", "Cashier"] },
      { href: "/reports", label: "Reports", icon: BarChart3, roles: ["Owner"] },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/users", label: "Users", icon: Users, roles: ["Owner"] },
      { href: "/approvals", label: "Approval Center", icon: CheckSquare, roles: ["Owner"] },
      { href: "/audit-logs/security", label: "Security log", icon: Shield, roles: ["Owner"] },
      { href: "/audit-logs/operational", label: "Operational log", icon: ClipboardList, roles: ["Owner"] },
      { href: "/settings", label: "Settings", icon: Settings, roles: ["Owner", "Cashier"] },
    ],
  },
];

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary"
        />
      )}
      <Icon className={cn("h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-70")} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

type SidebarProps = {
  variant?: "desktop" | "mobile";
};

export function Sidebar({ variant = "desktop" }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, isRole, user } = useAuth();
  const { collapsed, toggle, setMobileOpen } = useSidebar();
  const isMobile = variant === "mobile";
  const showLabels = isMobile || !collapsed;

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    if (!user) return;
    for (const group of navGroups) {
      for (const item of group.items) {
        if (isRole(...item.roles)) router.prefetch(item.href);
      }
    }
  }, [user, router, isRole]);

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground",
        variant === "desktop" &&
          cn(
            "shrink-0 border-r border-sidebar-border transition-[width] duration-200 ease-out",
            collapsed ? "w-[4.25rem]" : "w-60"
          ),
        isMobile && "w-full"
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-sidebar-border",
          showLabels ? "gap-2.5 px-4" : "justify-center px-2"
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-white">
          <Package className="h-4 w-4" />
        </div>
        {showLabels && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight">GensanPOS</p>
            <p className="truncate text-[11px] text-sidebar-foreground/55">
              Inventory &amp; POS
            </p>
          </div>
        )}
        {isMobile && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-sidebar-foreground/80 hover:bg-sidebar-accent"
            onClick={closeMobile}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        {navGroups.map((group) => {
          const items = group.items.filter((item) => isRole(...item.roles));
          if (!items.length) return null;
          return (
            <div key={group.title} className="mb-4 last:mb-0">
              {showLabels && (
                <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={active}
                      collapsed={!showLabels}
                      onNavigate={isMobile ? closeMobile : undefined}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className={cn("shrink-0 border-t border-sidebar-border p-2", showLabels ? "px-3" : "px-2")}>
        {!isMobile && (
          <>
            <Button
              variant="ghost"
              size={collapsed ? "icon-sm" : "sm"}
              className={cn(
                "w-full text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                !collapsed && "justify-start"
              )}
              onClick={toggle}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <>
                  <PanelLeftClose className="mr-2 h-4 w-4" />
                  Collapse
                </>
              )}
            </Button>
            <Separator className="my-2 bg-sidebar-border" />
          </>
        )}
        <button
          type="button"
          onClick={() => {
            closeMobile();
            logout();
          }}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-full text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            !showLabels && "justify-center px-0"
          )}
          title="Sign out"
        >
          <LogOut className={cn("h-4 w-4", showLabels && "mr-2")} />
          {showLabels && "Sign out"}
        </button>
      </div>
    </div>
  );
}

/** Desktop sidebar — hidden below lg; use mobile drawer instead */
export function DesktopSidebar() {
  return (
    <aside className="hidden h-full shrink-0 lg:flex">
      <Sidebar variant="desktop" />
    </aside>
  );
}
