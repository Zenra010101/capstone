import { AppShell } from "@/components/layout/app-shell";
import { AlertsProvider } from "@/contexts/alerts-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AlertsProvider>
      <AppShell>{children}</AppShell>
    </AlertsProvider>
  );
}
