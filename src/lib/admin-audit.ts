import { prisma } from '@/lib/prisma';

export async function logAdminAudit(
  adminId: string,
  action: string,
  targetId: string,
  targetType: string,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.adminAuditLog.create({
      data: { adminId, action, targetId, targetType, metadata: metadata as any },
    });
  } catch (err) {
    // Audit failure must never break the main operation
    console.error('[admin-audit] failed to write log', { action, targetId, targetType, err });
  }
}
