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

  const [bookings, pendingRequests] = await Promise.all([
    getUnifiedReservationsForUser(userId, session?.user?.email),
    prisma.cancellationRequest.findMany({
      where: { userId, status: 'pending' },
      select: { reservationId: true, lodgifyReservationId: true },
    }),
  ]);

  // Build a set of reservation IDs that already have a pending request
  const pendingSet = new Set<string>();
  for (const req of pendingRequests) {
    if (req.reservationId) pendingSet.add(req.reservationId);
    if (req.lodgifyReservationId) pendingSet.add(req.lodgifyReservationId);
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
      }))}
    />
  );
}
