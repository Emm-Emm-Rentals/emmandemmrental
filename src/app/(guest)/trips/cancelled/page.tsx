import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUnifiedReservationsForUser } from '@/lib/lodgify';

export const dynamic = 'force-dynamic';

export default async function CancelledTripsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    redirect('/');
  }

  const bookings = await getUnifiedReservationsForUser(userId, session?.user?.email);
  const cancelledTrips = bookings.filter((booking) => booking.isCanceled);

  return (
    <main className="min-h-screen bg-white pb-24">
      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-10 md:pt-14">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Cancelled Trips</h1>
          <p className="text-gray-500">Reservations that were declined or cancelled.</p>
        </div>

        {cancelledTrips.length === 0 ? (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-sm text-gray-500">
            No cancelled trips yet.
          </div>
        ) : (
          <div className="space-y-4">
            {cancelledTrips.map((booking) => (
              <div
                key={booking.id}
                className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 shadow-sm"
              >
                <img
                  src={booking.listing?.imageSrc || '/banner.png'}
                  alt={booking.listing?.title || 'Listing'}
                  className="w-full md:w-24 h-20 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{booking.listing?.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(booking.startDate).toLocaleDateString()} {' -> '}{' '}
                    {new Date(booking.endDate).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Guests: {booking.adults} Adults
                    {booking.children ? `, ${booking.children} Children` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {booking.currency} {booking.totalPrice.toFixed(2)}
                  </div>
                  <div className="mt-1 inline-flex rounded-full bg-rose-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-rose-600">
                    {booking.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8">
          <Link href="/profile" className="text-sm font-semibold text-gray-900 underline">
            Back to Profile
          </Link>
        </div>
      </div>
    </main>
  );
}
