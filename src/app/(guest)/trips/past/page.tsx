import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import PastTripsClient from '@/components/pages/PastTripsClient';
import { getUnifiedReservationsForUser } from '@/lib/lodgify';

export const dynamic = 'force-dynamic';

export default async function PastTripsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    redirect('/');
  }

  const reservations = await getUnifiedReservationsForUser(userId, session?.user?.email);
  const now = new Date();

  const bookings = reservations
    .filter((booking) => !booking.isCanceled && new Date(booking.endDate) < now)
    .map((booking) => ({
      id: booking.id,
      listingId: booking.listingId,
      startDate: booking.startDate,
      endDate: booking.endDate,
      hasReview: booking.hasReview,
      reviewable: booking.reviewable,
      source: booking.source,
      listing: {
        title: booking.listing.title || 'Listing',
        imageSrc: booking.listing.imageSrc || '',
      },
    }));

  return <PastTripsClient bookings={bookings} userId={userId} />;
}
