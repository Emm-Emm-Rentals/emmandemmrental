'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUi } from '@/context/UiContext';
import { X, Calendar, Users, CreditCard } from 'lucide-react';

type UpcomingBooking = {
  id: string;
  source: 'lodgify' | 'local';
  status: string;
  startDate: string;
  endDate: string;
  nights: number;
  adults: number;
  children: number;
  infants: number;
  pets: number;
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
  hasPendingCancellation?: boolean;
};

const formatShortDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const formatMoney = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount);

const getCancellationBlockMessage = (booking: UpcomingBooking) => {
  const normalizedStatus = booking.status.trim().toLowerCase();
  if (booking.source === 'lodgify' && normalizedStatus.includes('quote')) {
    return 'This reservation is still in a Lodgify quote workflow. Please contact the admin to cancel it.';
  }
  return null;
};

// ─── Booking Detail Modal ─────────────────────────────────────────────────────

function BookingDetailModal({
  booking,
  onClose,
  onCancelRequest,
  onPayBalance,
  onRefundRequest,
  isCancelling,
  isPayingBalance,
  isRequestingRefund,
  cancelReason,
  setCancelReason,
}: {
  booking: UpcomingBooking;
  onClose: () => void;
  onCancelRequest: (booking: UpcomingBooking) => void;
  onPayBalance: (booking: UpcomingBooking) => void;
  onRefundRequest: (booking: UpcomingBooking, reason: string) => void;
  isCancelling: boolean;
  isPayingBalance: boolean;
  isRequestingRefund: boolean;
  cancelReason: string;
  setCancelReason: (v: string) => void;
}) {
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const blockMessage = getCancellationBlockMessage(booking);
  const isDeposit = booking.paymentType === 'deposit';
  const nights = booking.nights || Math.round(
    (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / 86400000
  );
  const guestCount = (booking.adults || 0) + (booking.children || 0) + (booking.infants || 0);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal — bottom sheet on mobile, centered on desktop */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center md:p-4">
        <div className="bg-white w-full md:max-w-lg md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] md:max-h-[88vh]">

          {/* Hero image */}
          <div className="relative shrink-0 h-52 md:h-56">
            <img
              src={booking.listing.imageSrc || '/banner.png'}
              alt={booking.listing.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow-md transition-colors"
            >
              <X size={16} />
            </button>
            <div className="absolute bottom-0 left-0 px-5 pb-4">
              <h2 className="text-white font-bold text-xl leading-tight drop-shadow-md">{booking.listing.title}</h2>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${
                  booking.source === 'lodgify'
                    ? 'bg-white/20 text-white border-white/30'
                    : isDeposit && !booking.balancePaid
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-green-50 text-green-700 border-green-200'
                }`}>
                  {booking.source === 'lodgify' ? booking.status : isDeposit && !booking.balancePaid ? 'Balance Due' : 'Confirmed'}
                </span>
                {booking.hasPendingCancellation && (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-orange-50 text-orange-700 border border-orange-200">
                    Cancel Pending
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

            {/* Dates row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Check-in</p>
                <p className="text-sm font-semibold text-gray-900">{formatShortDate(booking.startDate)}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {new Date(booking.startDate).toLocaleDateString('en-US', { weekday: 'long' })}
                </p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Check-out</p>
                <p className="text-sm font-semibold text-gray-900">{formatShortDate(booking.endDate)}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {new Date(booking.endDate).toLocaleDateString('en-US', { weekday: 'long' })}
                </p>
              </div>
            </div>

            {/* Stay summary */}
            <div className="flex items-center gap-6 px-1">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={15} className="text-gray-400" />
                <span>{nights} night{nights !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users size={15} className="text-gray-400" />
                <span>
                  {guestCount} guest{guestCount !== 1 ? 's' : ''}
                  {booking.pets ? `, ${booking.pets} pet${booking.pets !== 1 ? 's' : ''}` : ''}
                </span>
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Price */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Price summary</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{formatMoney(booking.totalPrice / nights, booking.currency)} × {nights} night{nights !== 1 ? 's' : ''}</span>
                  <span className="font-semibold text-gray-900">{formatMoney(booking.totalPrice, booking.currency)}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold border-t border-gray-100 pt-2 mt-2">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">{formatMoney(booking.totalPrice, booking.currency)}</span>
                </div>
              </div>
            </div>

            {/* Deposit / balance info */}
            {isDeposit && (
              <div className={`rounded-2xl px-4 py-3 border ${booking.balancePaid ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                <div className="flex items-center gap-2">
                  <CreditCard size={14} className={booking.balancePaid ? 'text-green-600' : 'text-amber-600'} />
                  {booking.balancePaid ? (
                    <p className="text-sm font-semibold text-green-700">Fully paid</p>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-amber-800">
                        Balance due: {formatMoney((booking.balanceDueAmount || 0) / 100, booking.currency)}
                      </p>
                      {booking.balanceDueDate && (
                        <p className="text-xs text-amber-600 mt-0.5">
                          by {new Date(booking.balanceDueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pending cancellation notice */}
            {booking.hasPendingCancellation && (
              <div className="rounded-2xl px-4 py-3 bg-orange-50 border border-orange-100 text-sm text-orange-700">
                Your cancellation request is under review. An admin will get back to you shortly.
              </div>
            )}

            {/* Block message */}
            {blockMessage && (
              <div className="rounded-2xl px-4 py-3 bg-amber-50 border border-amber-100 text-sm text-amber-700">
                {blockMessage}
              </div>
            )}

            {/* Cancel form */}
            {showCancelForm && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 space-y-3">
                <p className="text-sm font-semibold text-rose-700">Request cancellation</p>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation (optional)…"
                  className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-rose-400 focus:outline-none resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowCancelForm(false); setCancelReason(''); }}
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Go back
                  </button>
                  <button
                    type="button"
                    onClick={() => onCancelRequest(booking)}
                    disabled={isCancelling}
                    className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {isCancelling ? 'Submitting…' : 'Submit Request'}
                  </button>
                </div>
              </div>
            )}

            {/* Refund request form */}
            {showRefundForm && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4 space-y-3">
                <p className="text-sm font-semibold text-blue-800">Request a refund</p>
                <p className="text-xs text-blue-600">Describe why you are requesting a refund. Our team will review and respond.</p>
                <textarea
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Reason for refund request (optional)…"
                  className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowRefundForm(false); setRefundReason(''); }}
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Go back
                  </button>
                  <button
                    type="button"
                    onClick={() => onRefundRequest(booking, refundReason)}
                    disabled={isRequestingRefund}
                    className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isRequestingRefund ? 'Submitting…' : 'Submit Request'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sticky action footer */}
          {!showCancelForm && !showRefundForm && (
            <div className="shrink-0 px-5 py-4 border-t border-gray-100 bg-white flex flex-col gap-2">
              <div className="flex items-center gap-3">
                {booking.source === 'local' && isDeposit && !booking.balancePaid && (
                  <button
                    type="button"
                    onClick={() => onPayBalance(booking)}
                    disabled={isPayingBalance}
                    className="flex-1 rounded-2xl bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPayingBalance ? 'Redirecting…' : 'Pay Balance'}
                  </button>
                )}
                {!blockMessage && !booking.hasPendingCancellation && (
                  <button
                    type="button"
                    onClick={() => setShowCancelForm(true)}
                    className="flex-1 rounded-2xl border border-rose-200 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    Cancel Reservation
                  </button>
                )}
                {booking.hasPendingCancellation && (
                  <div className="flex-1 rounded-2xl border border-orange-200 py-3 text-sm font-semibold text-orange-600 text-center bg-orange-50 cursor-default">
                    Cancellation Pending
                  </div>
                )}
              </div>
              {booking.source === 'local' && (
                <button
                  type="button"
                  onClick={() => setShowRefundForm(true)}
                  className="w-full rounded-2xl border border-blue-200 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                >
                  Request Refund
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UpcomingTripsClient({
  bookings,
}: {
  bookings: UpcomingBooking[];
}) {
  const router = useRouter();
  const { showToast } = useUi();
  const [activeCancellationId, setActiveCancellationId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [payingBalanceId, setPayingBalanceId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<UpcomingBooking | null>(null);
  const [refundRequestId, setRefundRequestId] = useState<string | null>(null);

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

  const handleRefundRequest = async (booking: UpcomingBooking, reason: string) => {
    setRefundRequestId(booking.id);
    try {
      const response = await fetch(`/api/reservations/${booking.id}/refund-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit refund request');
      showToast(data.message || 'Refund request submitted. An admin will review it shortly.', 'success');
      setSelectedBooking(null);
    } catch (error: any) {
      showToast(error.message || 'Failed to submit refund request', 'error');
    } finally {
      setRefundRequestId(null);
    }
  };

  const handleCancel = async (booking: UpcomingBooking) => {
    setActiveCancellationId(booking.id);
    try {
      const response = await fetch(`/api/reservations/${booking.id}/cancel-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit cancellation request');

      showToast(data.message || 'Cancellation request submitted. An admin will review it shortly.', 'success');
      setSelectedBooking(null);
      setCancelReason('');
      router.refresh();
    } catch (error: any) {
      showToast(error.message || 'Failed to submit cancellation request', 'error');
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
            {bookings.map((booking) => {
              const nights = booking.nights || Math.round(
                (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / 86400000
              );
              const isDeposit = booking.paymentType === 'deposit';

              return (
                <button
                  key={booking.id}
                  type="button"
                  onClick={() => setSelectedBooking(booking)}
                  className="w-full text-left bg-white border border-gray-100 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 shadow-sm hover:border-gray-300 hover:shadow-md transition-all duration-150 group"
                >
                  <img
                    src={booking.listing?.imageSrc || '/banner.png'}
                    alt={booking.listing?.title || 'Listing'}
                    className="w-full md:w-24 h-20 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{booking.listing?.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(booking.startDate).toLocaleDateString()} {' → '}{' '}
                      {new Date(booking.endDate).toLocaleDateString()}
                      {' · '}{nights} night{nights !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {booking.adults} Adult{booking.adults !== 1 ? 's' : ''}
                      {booking.children ? `, ${booking.children} Children` : ''}
                    </p>
                  </div>
                  <div className="md:text-right flex flex-col items-start md:items-end gap-2">
                    <div className="text-sm font-semibold text-gray-900">
                      {booking.currency} {booking.totalPrice.toFixed(2)}
                    </div>

                    {/* Balance due badge */}
                    {isDeposit && booking.balancePaid === false && (
                      <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-1.5 font-medium">
                        Balance due
                      </div>
                    )}
                    {isDeposit && booking.balancePaid === true && (
                      <div className="text-[11px] text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-1.5 font-semibold">
                        Fully paid
                      </div>
                    )}

                    {booking.hasPendingCancellation && (
                      <div className="text-[11px] text-orange-700 bg-orange-50 border border-orange-100 rounded-xl px-3 py-1.5 font-medium">
                        Cancel pending
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
                      <span>View details</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-8">
          <Link href="/profile" className="text-sm font-semibold text-gray-900 underline">
            Back to Profile
          </Link>
        </div>
      </div>

      {/* Detail modal */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => { setSelectedBooking(null); setCancelReason(''); }}
          onCancelRequest={handleCancel}
          onPayBalance={handlePayBalance}
          onRefundRequest={handleRefundRequest}
          isCancelling={activeCancellationId === selectedBooking.id}
          isPayingBalance={payingBalanceId === selectedBooking.id}
          isRequestingRefund={refundRequestId === selectedBooking.id}
          cancelReason={cancelReason}
          setCancelReason={setCancelReason}
        />
      )}
    </main>
  );
}
