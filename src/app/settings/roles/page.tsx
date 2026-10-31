import { requireAdmin } from "@/lib/rbac-server";
import { listCustomRoles, listWorkspaces } from "@/actions";
import { RolesManager } from "./roles-manager";

export default async function RolesPage() {
  await requireAdmin();
  const [roles, workspaces] = await Promise.all([listCustomRoles(), listWorkspaces()]);
  return <RolesManager initialRoles={roles} workspaces={workspaces} />;
}
