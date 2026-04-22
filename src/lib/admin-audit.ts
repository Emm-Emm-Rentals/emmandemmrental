import { prisma } from '@/lib/prisma';

export async function logAdminAudit(
  adminId: string,
  action: string,
  targetId: string,
  targetType: string,
  metadata?: Record<string, unknown>
) {
  if (!adminId) {
    console.error('[admin-audit] skipped — adminId is missing', { action, targetId, targetType });
    return;
  }

  // JSON.parse(JSON.stringify(...)) strips undefined values so Prisma's JSON
  // serializer never receives them (it throws on undefined, not null).
  const safeMetadata = metadata
    ? (JSON.parse(JSON.stringify(metadata)) as Record<string, unknown>)
    : undefined;

  try {
    await prisma.adminAuditLog.create({
      data: { adminId, action, targetId, targetType, metadata: safeMetadata as any },
    });
  } catch (err) {
    console.error('[admin-audit] failed to write log', { action, targetId, targetType, adminId, err });
  }
}
