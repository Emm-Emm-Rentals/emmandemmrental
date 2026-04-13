import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUnifiedReservationsForUser } from '@/lib/lodgify';
import UpcomingTripsClient from '@/components/pages/UpcomingTripsClient';

export const dynamic = 'force-dynamic';

export default async function UpcomingTripsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    redirect('/');
  }

  const now = new Date();

  const bookings = await getUnifiedReservationsForUser(userId, session?.user?.email);
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
        adults: booking.adults,
        children: booking.children,
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
      }))}
    />
  );
}
