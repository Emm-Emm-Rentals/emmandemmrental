import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { adminAuthOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAdminAudit } from '@/lib/admin-audit';

async function requireAdmin() {
  const session = await getServerSession(adminAuthOptions);
  if (!session || (session.user as any).role !== 'ADMIN') return null;
  return session;
}

// PATCH — approve or reject a refund request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const { id } = await params;
  const adminId = (session.user as any).id as string;
  const body = await request.json().catch(() => ({}));
  const action: 'approve' | 'reject' = body.action;
  const adminNote: string | undefined = body.adminNote?.trim() || undefined;

  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
  }

  const existing = await prisma.refundRequest.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Refund request not found' }, { status: 404 });
  }
  if (existing.status !== 'pending') {
    return NextResponse.json({ error: 'Refund request has already been processed' }, { status: 409 });
  }

  const updated = await prisma.refundRequest.update({
    where: { id },
    data: {
      status: action === 'approve' ? 'approved' : 'rejected',
      adminNote: adminNote ?? null,
      processedAt: new Date(),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      reservation: {
        select: {
          id: true,
          paymentStatus: true,
          amountPaid: true,
          paymentCurrency: true,
          lodgifyReservationId: true,
        },
      },
    },
  });

  await logAdminAudit(adminId, `refund_request_${action}`, id, 'refund_request', {
    reservationId: existing.reservationId ?? null,
    listingTitle: existing.listingTitle,
    userId: existing.userId,
    adminNote: adminNote ?? null,
  });

  return NextResponse.json({ request: updated });
}
