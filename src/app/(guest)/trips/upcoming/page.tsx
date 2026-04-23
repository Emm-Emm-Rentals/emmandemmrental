import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUnifiedReservationsForUser } from '@/lib/lodgify';
import { prisma } from '@/lib/prisma';
import UpcomingTripsClient from '@/components/pages/UpcomingTripsClient';

export const dynamic = 'force-dynamic';

export default async function UpcomingTripsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    redirect('/');
  }

  const now = new Date();

  const [bookings, cancellationRequests] = await Promise.all([
    getUnifiedReservationsForUser(userId, session?.user?.email),
    prisma.cancellationRequest.findMany({
      where: { userId, status: { in: ['pending', 'rejected'] } },
      select: {
        reservationId: true,
        lodgifyReservationId: true,
        status: true,
        adminNote: true,
        processedAt: true,
      },
    }),
  ]);

  const pendingSet = new Set<string>();
  const rejectedMap = new Map<string, { adminNote: string | null; processedAt: Date | null }>();
  for (const req of cancellationRequests) {
    const key = req.reservationId || req.lodgifyReservationId;
    if (!key) continue;
    if (req.status === 'pending') pendingSet.add(key);
    else if (req.status === 'rejected') rejectedMap.set(key, { adminNote: req.adminNote, processedAt: req.processedAt });
  }

  const upcomingTrips = bookings.filter(
    (booking) => !booking.isCanceled && new Date(booking.endDate) >= now
  );

  return (
    <UpcomingTripsClient
      bookings={upcomingTrips.map((booking) => ({
        id: booking.id,
        source: booking.source,
        status: booking.status,
        startDate: booking.startDate,
        endDate: booking.endDate,
        nights: booking.nights,
        adults: booking.adults,
        children: booking.children,
        infants: booking.infants,
        pets: booking.pets,
        totalPrice: booking.totalPrice,
        currency: booking.currency,
        listing: {
          title: booking.listing.title,
          imageSrc: booking.listing.imageSrc,
        },
        paymentType: booking.paymentType,
        balancePaid: booking.balancePaid,
        balanceDueAmount: booking.balanceDueAmount,
        balanceDueDate: booking.balanceDueDate,
        hasPendingCancellation: pendingSet.has(booking.id),
        rejectedCancellation: rejectedMap.get(booking.id)
          ? {
              adminNote: rejectedMap.get(booking.id)!.adminNote,
              processedAt: rejectedMap.get(booking.id)!.processedAt?.toISOString() ?? null,
            }
          : null,
      }))}
    />
  );
}
