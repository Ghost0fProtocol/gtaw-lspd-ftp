import {
  AuditCategory,
  writeAuditLog,
} from "./auditLog";

type AuditActionOptions<T> = {
  user: {
    id: string;
    name?: string | null;
    role?: string | null;
  };

  action: string;
  category: AuditCategory;

  entityType?: string;
  entityId?: string;
  targetName?: string;

  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;

  reason?: string;

  execute: () => Promise<T>;
};

export async function auditAction<T>(
  options: AuditActionOptions<T>
): Promise<T> {
  const result =
    await options.execute();

  await writeAuditLog({
    actorId:
      options.user.id,

    actorName:
      options.user.name,

    actorRole:
      options.user.role,

    action:
      options.action,

    category:
      options.category,

    entityType:
      options.entityType,

    entityId:
      options.entityId,

    targetName:
      options.targetName,

    oldData:
      options.oldData,

    newData:
      options.newData,

    reason:
      options.reason,
  });

  return result;
}