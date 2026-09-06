"use client";

import {
  AuditLogsView,
  OPERATIONAL_ACTIONS,
  OPERATIONAL_ENTITIES,
} from "@/components/audit/audit-logs-view";
import { AuditLogCategory } from "@/lib/types";

export default function OperationalAuditLogsPage() {
  return (
    <AuditLogsView
      category={AuditLogCategory.Operational}
      title="Operational log"
      description="Sales, payments, inventory, products, customers, cheques, and other business activity"
      actions={OPERATIONAL_ACTIONS}
      entities={OPERATIONAL_ENTITIES}
      exportPrefix="operational"
    />
  );
}
