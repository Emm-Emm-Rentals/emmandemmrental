import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { adminAuthOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(adminAuthOptions);
  if (!session || (session.user as any).role !== 'ADMIN') return null;
  return session;
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const params = request.nextUrl.searchParams;
  const statusFilter = params.get('status') || 'pending';
  const page = Math.max(parseInt(params.get('page') || '1', 10), 1);
  const pageSize = Math.min(Math.max(parseInt(params.get('pageSize') || '20', 10), 1), 100);
  const skip = (page - 1) * pageSize;

  const where = statusFilter === 'all' ? {} : { status: statusFilter };

  const [total, data] = await Promise.all([
    prisma.refundRequest.count({ where }),
    prisma.refundRequest.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}
