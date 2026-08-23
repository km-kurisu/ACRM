import { db } from "./server";

export const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

export type PresenceStatus = "active" | "inactive" | "offline" | "invisible";

export type UserPresence = {
  user_id: string;
  workspace_id: string;
  status_override: string | null;
  last_active_at: string;
  is_online: boolean;
};

export async function getUserStatus(
  userId: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID
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
