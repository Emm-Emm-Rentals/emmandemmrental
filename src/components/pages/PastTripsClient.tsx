'use client';

import { useState } from 'react';
import { Star, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type PastBooking = {
  id: string;
  listingId: string | null;
  startDate: string;
  endDate: string;
  hasReview: boolean;
  reviewable: boolean;
  source?: 'lodgify' | 'local';
  listing: {
    title: string;
    imageSrc: string;
  };
};

export default function PastTripsClient({
  bookings,
  userId,
}: {
  bookings: PastBooking[];
  userId: string;
}) {
  const router = useRouter();
  const [reviewBooking, setReviewBooking] = useState<PastBooking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  const handleOpenReview = (booking: PastBooking) => {
    setReviewBooking(booking);
    setReviewRating(5);
    setReviewComment('');
    setReviewError('');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBooking?.listingId) return;
    setReviewError('');

    if (!reviewComment.trim() || reviewComment.trim().length < 10) {
      setReviewError('Comment must be at least 10 characters');
      return;
    }

    setIsReviewSubmitting(true);
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: reviewBooking.listingId,
          userId,
          rating: reviewRating,
          comment: reviewComment.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setReviewBooking(null);
      setReviewComment('');
      router.refresh();
    } catch (error: any) {
      setReviewError(error.message);
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white pb-24">
      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-10 md:pt-14">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Past Trips</h1>
          <p className="text-gray-500">Review completed stays.</p>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-sm text-gray-500">
            No past trips yet.
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 shadow-sm">
                <img src={booking.listing?.imageSrc || '/banner.png'} alt={booking.listing?.title} className="w-full md:w-24 h-20 rounded-xl object-cover" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{booking.listing?.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(booking.startDate).toLocaleDateString()}{' -> '}{new Date(booking.endDate).toLocaleDateString()}
                  </p>
                </div>
                {booking.hasReview ? (
                  <div className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-2 rounded-full">Reviewed</div>
                ) : !booking.reviewable ? (
                  <div className="text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-2 rounded-full">
                    {booking.source === 'lodgify' ? 'External booking' : 'Not reviewable'}
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenReview(booking)}
                    className="text-xs font-semibold text-white bg-gray-900 px-4 py-2 rounded-xl hover:bg-gray-800"
                  >
                    Add Review
                  </button>
                )}
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

      {reviewBooking && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl relative">
            <button onClick={() => setReviewBooking(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Leave a Review</h3>
            <p className="text-xs text-gray-500 mb-4">{reviewBooking.listing?.title}</p>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rating</label>
                <div className="flex items-center gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1"
                    >
                      <Star size={22} className={star <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Comment</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm min-h-[120px]"
                  placeholder="Share your experience..."
                />
              </div>

              {reviewError && <div className="text-sm text-red-600">{reviewError}</div>}

              <button
                type="submit"
                disabled={isReviewSubmitting}
                className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
              >
                {isReviewSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
