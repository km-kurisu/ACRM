import { db } from "./server";
import { ensureUserRow } from "./user-sync";

export type PresenceStatus = "active" | "inactive" | "offline" | "invisible";

export type UserPresence = {
  user_id: string;
  workspace_id: string;
  status_override: string | null;
  last_active_at: string;
  is_online: boolean;
};

export function getEffectiveStatus(
  statusOverride: string | null,
  currentUserId: string,
  viewerUserId: string
): PresenceStatus {
  if (statusOverride === "invisible") {
    return currentUserId === viewerUserId ? "active" : "offline";
  }
  if (statusOverride === "active" || statusOverride === "inactive" || statusOverride === "offline") {
    return statusOverride;
  }
  return "active";
}

export async function getUserStatus(
  userId: string,
  workspaceId: string = "00000000-0000-0000-0000-000000000001"
): Promise<UserPresence | null> {
  const { data, error } = await db
    .from("user_status")
    .select("*")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .single();

  if (error || !data) return null;
  return data as UserPresence;
}

export async function updateUserStatus(
  userId: string,
  statusOverride: string | null,
  workspaceId: string = "00000000-0000-0000-0000-000000000001"
): Promise<void> {
  await ensureUserRow(userId);
  const { error } = await db
    .from("user_status")
    .upsert({
      user_id: userId,
      workspace_id: workspaceId,
      status_override: statusOverride,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,workspace_id" });

  if (error) throw new Error(error.message);
}

export async function updateLastActive(
  userId: string,
  workspaceId: string = "00000000-0000-0000-0000-000000000001"
): Promise<void> {
  await ensureUserRow(userId);
  const { error } = await db
    .from("user_status")
    .upsert({
      user_id: userId,
      workspace_id: workspaceId,
      last_active_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,workspace_id" });

  if (error) throw new Error(error.message);
}
