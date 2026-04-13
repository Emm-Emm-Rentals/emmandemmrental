'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUi } from '@/context/UiContext';
import { X } from 'lucide-react';

type UpcomingBooking = {
  id: string;
  source: 'lodgify' | 'local';
  status: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  totalPrice: number;
  currency: string;
  listing: {
    title: string;
    imageSrc: string;
  };
  paymentType?: string;
  balancePaid?: boolean;
  balanceDueAmount?: number | null;
  balanceDueDate?: string | null;
};

const getCancellationBlockMessage = (booking: UpcomingBooking) => {
  const normalizedStatus = booking.status.trim().toLowerCase();

  if (booking.source === 'lodgify' && normalizedStatus.includes('quote')) {
    return 'This reservation is still in a Lodgify quote workflow. Please contact the admin to cancel it.';
  }

  return null;
};

export default function UpcomingTripsClient({
  bookings,
}: {
  bookings: UpcomingBooking[];
}) {
  const router = useRouter();
  const { showToast } = useUi();
  const [activeCancellationId, setActiveCancellationId] = useState<string | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<UpcomingBooking | null>(null);
  const [payingBalanceId, setPayingBalanceId] = useState<string | null>(null);

  const handlePayBalance = async (booking: UpcomingBooking) => {
    setPayingBalanceId(booking.id);
    try {
      const response = await fetch(`/api/reservations/${booking.id}/pay-balance`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to start payment');
      if (data.url) window.location.href = data.url;
    } catch (error: any) {
      showToast(error.message || 'Failed to start balance payment', 'error');
      setPayingBalanceId(null);
    }
  };

  const handleCancel = async (booking: UpcomingBooking) => {
    setActiveCancellationId(booking.id);
    try {
      const response = await fetch(`/api/reservations/${booking.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        const apiError = data.error || 'Failed to cancel reservation';
        if (
          typeof apiError === 'string' &&
          apiError.includes('Quote Workflow which is not finalized')
        ) {
          throw new Error(
            'This reservation is still in an unfinished Lodgify quote workflow. Please contact the admin to cancel it.'
          );
        }
        throw new Error(apiError);
      }

      showToast(data.message || 'Reservation cancelled successfully.', 'success');
      setBookingToCancel(null);
      router.refresh();
    } catch (error: any) {
      showToast(error.message || 'Failed to cancel reservation', 'error');
    } finally {
      setActiveCancellationId(null);
    }
  };

  return (
    <main className="min-h-screen bg-white pb-24">
      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-10 md:pt-14">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Upcoming Trips</h1>
          <p className="text-gray-500">Your upcoming reservations.</p>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-sm text-gray-500">
            No upcoming trips yet.
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
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
                <div className="md:text-right flex flex-col items-start md:items-end gap-2">
                  <div className="text-sm font-semibold text-gray-900">
                    {booking.currency} {booking.totalPrice.toFixed(2)}
                  </div>

                  {/* Balance due badge */}
                  {booking.paymentType === 'deposit' && booking.balancePaid === false && (
                    <div className="text-[11px] leading-relaxed text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-left md:text-right">
                      <span className="font-semibold">Balance due:</span>{' '}
                      {booking.currency} {((booking.balanceDueAmount || 0) / 100).toFixed(2)}
                      {booking.balanceDueDate && (
                        <span className="block text-amber-600">
                          by {new Date(booking.balanceDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  )}

                  {booking.paymentType === 'deposit' && booking.balancePaid === true && (
                    <div className="text-[11px] text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-1.5 font-semibold">
                      Fully paid
                    </div>
                  )}

                  {getCancellationBlockMessage(booking) && (
                    <div className="max-w-[260px] text-[11px] leading-relaxed text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                      {getCancellationBlockMessage(booking)}
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {booking.source === 'lodgify' && (
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        {booking.status}
                      </div>
                    )}

                    {/* Pay balance button — shown when deposit booking has outstanding balance */}
                    {booking.source === 'local' &&
                      booking.paymentType === 'deposit' &&
                      booking.balancePaid === false && (
                        <button
                          type="button"
                          onClick={() => handlePayBalance(booking)}
                          disabled={payingBalanceId === booking.id}
                          className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {payingBalanceId === booking.id ? 'Redirecting…' : 'Pay Balance'}
                        </button>
                      )}

                    <button
                      type="button"
                      onClick={() => setBookingToCancel(booking)}
                      disabled={
                        activeCancellationId === booking.id ||
                        Boolean(getCancellationBlockMessage(booking))
                      }
                      className="rounded-xl bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {activeCancellationId === booking.id ? 'Cancelling...' : 'Cancel Reservation'}
                    </button>
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

      {bookingToCancel && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-xl relative">
            <button
              onClick={() => setBookingToCancel(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Cancel reservation?</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              This will attempt to cancel your reservation for{' '}
              <span className="font-semibold text-gray-900">
                {bookingToCancel.listing.title}
              </span>
              .
            </p>
            <p className="text-xs text-gray-500 mt-3">
              Reservation dates: {new Date(bookingToCancel.startDate).toLocaleDateString()} {' -> '}{' '}
              {new Date(bookingToCancel.endDate).toLocaleDateString()}
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setBookingToCancel(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Keep Reservation
              </button>
              <button
                type="button"
                onClick={() => handleCancel(bookingToCancel)}
                disabled={activeCancellationId === bookingToCancel.id}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {activeCancellationId === bookingToCancel.id ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
