import { cookies } from "next/headers";
import { db } from "./server";
import { DEFAULT_WORKSPACE_ID } from "./presence";

export const WORKSPACE_COOKIE = "active_workspace";

export type WorkspaceOption = {
  id: string;
  name: string;
};

async function fetchWorkspaces(ids: string[]): Promise<WorkspaceOption[]> {
  if (ids.length === 0) return [];
  const { data, error } = await db
    .from("workspaces")
    .select("id, name")
    .in("id", ids)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as WorkspaceOption[];
}

export async function listWorkspacesForUser(userId: string): Promise<WorkspaceOption[]> {
  const { data, error } = await db
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  const ids = [...new Set((data ?? []).map((row) => (row as { workspace_id: string }).workspace_id))];
  if (ids.length === 0) ids.push(DEFAULT_WORKSPACE_ID);

  let workspaces = await fetchWorkspaces(ids);
  if (workspaces.length === 0) workspaces = await fetchWorkspaces([DEFAULT_WORKSPACE_ID]);
  return workspaces;
}

export async function getActiveWorkspaceId(userId: string): Promise<string> {
  const workspaces = await listWorkspacesForUser(userId);
  const cookieStore = await cookies();
  const requested = cookieStore.get(WORKSPACE_COOKIE)?.value;

  if (requested && workspaces.some((workspace) => workspace.id === requested)) {
    return requested;
  }
  return workspaces[0]?.id ?? DEFAULT_WORKSPACE_ID;
}
