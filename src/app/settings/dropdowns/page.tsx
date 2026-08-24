import { requireAdmin } from "@/lib/rbac-server";
import DropdownsManager from "./dropdowns-manager";

export default async function DropdownsSettingsPage() {
  await requireAdmin();
  return <DropdownsManager />;
}
