import { supabase } from "./supabase";

export type AuditCategory =
  | "Intakes"
  | "Probationers"
  | "Permissions"
  | "Settings"
  | "DORs"
  | "PPOWERs"
  | "Notebook"
  | "FTP Files"
  | "Imports"
  | "Orientations";

export type AuditLogInput = {
  actorId: string;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  category: AuditCategory;
  entityType?: string | null;
  entityId?: string | null;
  targetName?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  reason?: string | null;
  correlationId?: string | null;
};

export async function writeAuditLog(
  input: AuditLogInput
): Promise<void> {
  const { error } = await supabase
    .from("audit_logs")
    .insert({
      actor_id: input.actorId,
      actor_name: input.actorName ?? null,
      actor_role: input.actorRole ?? null,
      action: input.action,
      category: input.category,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      target_name: input.targetName ?? null,
      old_data: input.oldData ?? null,
      new_data: input.newData ?? null,
      reason: input.reason?.trim() || null,
      correlation_id:
        input.correlationId ?? undefined,
      user_agent:
        typeof navigator !== "undefined"
          ? navigator.userAgent
          : null,
    });

  if (error) {
    console.error(
      "AUDIT LOG ERROR",
      error
    );
  }
}