import { requireAdmin } from "@/lib/rbac-server";
import { AuditLogViewer } from "./audit-log-viewer";

export default async function AuditLogPage() {
  await requireAdmin();
  return <AuditLogViewer />;
}
