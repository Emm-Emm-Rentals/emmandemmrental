import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { adminAuthOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cancelLodgifyReservationById } from '@/lib/lodgify';
import { logAdminAudit } from '@/lib/admin-audit';

async function requireAdmin() {
  const session = await getServerSession(adminAuthOptions);
  if (!session || (session.user as any).role !== 'ADMIN') return null;
  return session;
}

async function getReservation(id: string) {
  return prisma.reservation.findUnique({
    where: { id },
    include: {
      listing: { select: { id: true, title: true, lodgifyPropertyId: true } },
    },
  });
}

// PATCH — cancel a reservation.
// For Lodgify-synced reservations: declines in Lodgify first, then marks cancelled locally.
// For non-Lodgify reservations: updates local DB only.
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const { id } = await params;
  const adminId = (session.user as any).id as string;

  const reservation = await getReservation(id);
  if (!reservation) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
  }
  if (reservation.paymentStatus === 'cancelled') {
    return NextResponse.json({ error: 'Reservation is already cancelled' }, { status: 409 });
  }

  // If the reservation is synced to Lodgify, cancel it there first so the
  // dates are freed on the Lodgify calendar.
  let lodgifyCancelError: string | null = null;
  if (reservation.lodgifyReservationId) {
    try {
      await cancelLodgifyReservationById(reservation.lodgifyReservationId);
    } catch (err: any) {
      // Non-fatal: log the error but still cancel locally
      lodgifyCancelError = err?.message || 'Lodgify cancel failed';
      console.error('[reservation-cancel] Lodgify cancel failed', {
        reservationId: id,
        lodgifyReservationId: reservation.lodgifyReservationId,
        err,
      });
    }
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: { paymentStatus: 'cancelled' },
    include: {
      listing: { select: { id: true, title: true, subtitle: true, imageSrc: true, locationValue: true, lodgifyPropertyId: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  await logAdminAudit(adminId, 'reservation_cancel', id, 'reservation', {
    listingId: reservation.listing?.id ?? null,
    listingTitle: reservation.listing?.title ?? null,
    previousStatus: reservation.paymentStatus ?? null,
    lodgifyReservationId: reservation.lodgifyReservationId ?? null,
    lodgifyCancelError,
  });

  return NextResponse.json({ reservation: updated, lodgifyCancelError });
}

// DELETE — hard-delete a reservation from the database.
// For Lodgify-synced reservations: declines in Lodgify first, then deletes locally.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const { id } = await params;
  const adminId = (session.user as any).id as string;

  const reservation = await getReservation(id);
  if (!reservation) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
  }

  // Cancel in Lodgify before deleting locally so dates are freed.
  let lodgifyCancelError: string | null = null;
  if (reservation.lodgifyReservationId) {
    try {
      await cancelLodgifyReservationById(reservation.lodgifyReservationId);
    } catch (err: any) {
      lodgifyCancelError = err?.message || 'Lodgify cancel failed';
      console.error('[reservation-delete] Lodgify cancel failed', {
        reservationId: id,
        lodgifyReservationId: reservation.lodgifyReservationId,
        err,
      });
    }
  }

  await prisma.reservation.delete({ where: { id } });

  await logAdminAudit(adminId, 'reservation_delete', id, 'reservation', {
    listingId: reservation.listing?.id ?? null,
    listingTitle: reservation.listing?.title ?? null,
    paymentStatus: reservation.paymentStatus ?? null,
    lodgifyReservationId: reservation.lodgifyReservationId ?? null,
    lodgifyCancelError,
  });

  return NextResponse.json({ success: true, lodgifyCancelError });
}
