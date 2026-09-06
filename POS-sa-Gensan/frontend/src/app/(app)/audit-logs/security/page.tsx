"use client";

import {
  AuditLogsView,
  SECURITY_ACTIONS,
  SECURITY_ENTITIES,
} from "@/components/audit/audit-logs-view";
import { AuditLogCategory } from "@/lib/types";

export default function SecurityAuditLogsPage() {
  return (
    <AuditLogsView
      category={AuditLogCategory.Security}
      title="Security log"
      description="Login, logout, failed attempts, role changes, and account lock events"
      actions={SECURITY_ACTIONS}
      entities={SECURITY_ENTITIES}
      exportPrefix="security"
    />
  );
}
