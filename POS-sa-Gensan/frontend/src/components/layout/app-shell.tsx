"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { SidebarProvider, useSidebar } from "@/contexts/sidebar-context";
import { DesktopSidebar, Sidebar } from "./sidebar";
import { TopNavbar } from "./top-navbar";
import { NavigationProgress } from "./navigation-progress";
import { PageContainer } from "@/components/enterprise/page-container";
import { Sheet, SheetContent } from "@/components/ui/sheet";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { mobileOpen, setMobileOpen } = useSidebar();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--surface-page)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Loading workspace…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[var(--surface-page)]">
      <NavigationProgress />
      <DesktopSidebar />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[min(18rem,88vw)] max-w-sm border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        >
          <Sidebar variant="mobile" />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <PageContainer className="px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6">
            {children}
          </PageContainer>
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppShellInner>{children}</AppShellInner>
    </SidebarProvider>
  );
}
