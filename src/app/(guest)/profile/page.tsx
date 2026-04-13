import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ProfileClient from '@/components/pages/ProfileClient';
import { getUnifiedReservationsForUser } from '@/lib/lodgify';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    redirect('/');
  }

  const bookings = await getUnifiedReservationsForUser(userId, session?.user?.email);

  return (
    <ProfileClient
      user={{
        name: session?.user?.name,
        email: session?.user?.email,
        image: session?.user?.image,
      }}
      bookings={bookings
        .filter((booking) => !booking.isCanceled)
        .map((booking) => ({
        id: booking.id,
        source: booking.source,
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
      }))}
    />
  );
}
