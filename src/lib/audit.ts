import { revalidatePath } from "next/cache";
import { db } from "@/lib/server";
import { ensureUserRow } from "@/lib/user-sync";
import { DEFAULT_WORKSPACE_ID } from "@/lib/presence";

export type AuditAction = "create" | "update" | "delete" | "import";

export type AuditEntity =
  | "creator"
  | "company"
  | "deal"
  | "outreach"
  | "contract"
  | "dropdown_option"
  | "workspace"
  | "user"
  | "custom_filter";

export type AuditLogInput = {
  actorId: string;
  action: AuditAction;
  entityType: AuditEntity;
  entityId?: string | null;
  entityLabel?: string | null;
  workspaceId?: string;
  changes?: Record<string, unknown>;
};

type FieldChange = { from: unknown; to: unknown };

export function diffValues(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown>
): Record<string, FieldChange> {
  const changes: Record<string, FieldChange> = {};
  if (!before) return changes;

  for (const [key, to] of Object.entries(after)) {
    if (key === "updated_at") continue;
    const from = before[key];
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes[key] = { from: from ?? null, to: to ?? null };
    }
  }
  return changes;
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    try {
      await ensureUserRow(input.actorId);
    } catch {
      // The audit entry can still be written with the actor id if sync fails.
    }

    const { data: actor } = await db
      .from("users")
      .select("full_name, email")
      .eq("id", input.actorId)
      .maybeSingle();

    const actorName =
      (actor?.full_name as string | undefined)?.trim() ||
      (actor?.email as string | undefined) ||
      "Unknown user";

    const { error } = await db.from("audit_logs").insert({
      actor_id: input.actorId,
      actor_name: actorName,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      entity_label: input.entityLabel ?? null,
      workspace_id: input.workspaceId ?? DEFAULT_WORKSPACE_ID,
      changes: input.changes ?? {},
    });

    if (error) {
      console.warn("Failed to write audit log:", error.message);
      return;
    }
    revalidatePath("/settings/audit");
  } catch (error) {
    console.warn("Failed to write audit log:", error instanceof Error ? error.message : error);
  }
}
