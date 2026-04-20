'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import Image from 'next/image';

const defaultCategories = [
  { label: 'Cleanliness', score: 5.0 },
  { label: 'Accuracy', score: 4.5 },
  { label: 'Check-in', score: 4.0 },
  { label: 'Communication', score: 4.8 },
  { label: 'Location', score: 4.8 },
  { label: 'Value', score: 4.8 },
];

const defaultReviews = [
  {
    name: 'Mathew',
    location: 'Navarre, Florida',
    initial: 'M',
    color: 'bg-sky-100 text-sky-700',
    date: 'Dec 20, 2026',
    rating: 5,
    text: 'Home in Marathon Hosted by Coco Plum is an amazing property! The property is your own private resort in a vacation home rental. There is so much to do: large swimming pool, volleyball court, practice putting',
  },
  {
    name: 'Jennifer',
    location: 'Boulder, Colorado',
    initial: 'J',
    color: 'bg-pink-100 text-pink-700',
    date: 'Dec 20, 2026',
    rating: 5,
    text: "Home in Marathon Hosted by Coco Plum is an amazing property! The property is your own private resort in a vacation home rental. There is so much to do: large swimming pool, volleyball court, practice putting green, fire pit, tiki bar, hammocks, air hockey, and best of all ocean front! Kitchen is well equipped, laundry on site, outdoor kitchen, in a quiet neighborhood makes this a property you'll want to return to in the future. A+ rental!",
  },
];

const colors = [
  'bg-sky-100 text-sky-700',
  'bg-pink-100 text-pink-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-yellow-100 text-yellow-700',
  'bg-red-100 text-red-700',
];

interface ReviewData {
  id: string;
  user?: {
    name: string;
    image?: string | null;
  } | null;
  guestName?: string | null;
  comment: string;
  rating: number;
  createdAt: string;
}

interface ReviewsProps {
  reviews?: ReviewData[];
  totalRating?: number;
}

const INITIAL_VISIBLE = 4;

const Reviews = ({ reviews = [], totalRating }: ReviewsProps) => {
  const [showAll, setShowAll] = useState(false);

  const hasReviews = reviews && reviews.length > 0;
  const avgRating = totalRating
    ? totalRating.toFixed(1)
    : hasReviews
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  const renderCategoryStars = (score: number) => (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, idx) => {
        const filled = idx + 1 <= Math.round(score);
        return (
          <Star
            key={idx}
            size={14}
            className={filled ? 'fill-yellow-500 text-yellow-500' : 'text-zinc-300'}
          />
        );
      })}
    </div>
  );

  const allDisplayReviews = hasReviews
    ? reviews.map((rev, idx) => {
        const date = new Date(rev.createdAt);
        const formattedDate = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        return {
          name: rev.guestName || rev.user?.name || 'Anonymous',
          location: '',
          initial: (rev.guestName || rev.user?.name || 'A').charAt(0).toUpperCase(),
          color: colors[idx % colors.length],
          date: formattedDate,
          rating: rev.rating,
          text: rev.comment,
        };
      })
    : defaultReviews;

  const displayReviews = showAll ? allDisplayReviews : allDisplayReviews.slice(0, INITIAL_VISIBLE);
  const hasMore = allDisplayReviews.length > INITIAL_VISIBLE;

  // Build rating distribution from real data
  const ratingCounts = hasReviews
    ? [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter((r) => r.rating === star).length,
      }))
    : [5, 4, 3, 2, 1].map((star) => ({ star, count: star === 5 ? 1 : 0 }));
  const maxCount = Math.max(...ratingCounts.map((r) => r.count), 1);

  return (
    <section className="py-16 max-w-7xl mx-auto px-6 border-t border-gray-100 mt-12">
      {/* Hero Header */}
      <div className="flex flex-col items-center text-center mb-16">
        <div className="relative mb-4">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg relative">
              <Image src="/award.png" className="fill-zinc-800 text-zinc-800" width={80} height={80} alt="Review" />
            </div>
            <span className="text-7xl font-bold text-zinc-900">{avgRating}</span>
          </div>
        </div>
        <h3 className="text-xl font-bold text-zinc-900">Guest Favourite</h3>
        <p className="text-gray-500 max-w-sm mt-2 text-sm leading-relaxed">
          This space is a guest favourite based on ratings, reviews and reliability
        </p>
      </div>

      {/* Rating Breakdown Grid */}
      <div className="flex flex-col lg:flex-row gap-12 mb-16 items-start lg:items-stretch">
        {/* Left: Overall Bars */}
        <div className="w-full lg:w-1/3">
          <div className="inline-flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1 text-sm font-semibold mb-6">
            <span className="text-green-600">{avgRating}</span>
            <span className="text-gray-300">|</span>
            <span>{hasReviews ? `${reviews.length} Review${reviews.length !== 1 ? 's' : ''}` : '4 Reviews'}</span>
          </div>

          <h4 className="font-bold text-gray-900 mb-6">Overall rating</h4>
          <div className="space-y-2">
            {ratingCounts.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-4 text-xs font-bold text-gray-700">
                <span className="w-4">{star}.0</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600 rounded-full transition-all duration-500"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                {hasReviews && <span className="w-4 text-gray-400">{count}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Categories */}
        <div className="hidden lg:block w-px bg-gray-200 self-stretch" />

        <div className="w-full lg:flex-1">
          <h4 className="font-bold text-gray-900 mb-6">Category ratings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            {defaultCategories.map((cat) => (
              <div key={cat.label} className="flex items-center justify-between gap-4 pb-3 border-b border-gray-100">
                <span className="text-sm font-medium text-zinc-900">{cat.label}</span>
                <div className="flex items-center gap-3">
                  {renderCategoryStars(cat.score)}
                  <span className="text-sm font-bold text-zinc-900 w-8 text-right">{cat.score.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Individual Reviews */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12 border-t border-gray-100 pt-12">
        {displayReviews.map((rev, i) => (
          <div key={i} className="flex flex-col">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${rev.color}`}>
                {rev.initial}
              </div>
              <div>
                <h4 className="font-bold text-zinc-900">{rev.name}</h4>
                {rev.location && <p className="text-xs text-gray-500 font-medium">{rev.location}</p>}
              </div>
            </div>

            <p className="text-zinc-800 text-[15px] leading-relaxed mb-4">{rev.text}</p>

            <div className="flex items-center gap-3 mt-auto">
              <div className="flex gap-1">
                {[...Array(5)].map((_, idx) => (
                  <Star
                    key={idx}
                    size={12}
                    className={idx < rev.rating ? 'fill-green-600 text-green-600' : 'text-gray-200'}
                  />
                ))}
              </div>
              <span className="text-gray-400 text-xs">|</span>
              <span className="text-xs text-zinc-800 font-bold">{rev.date}</span>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-16">
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-sm font-bold underline text-zinc-900 hover:text-zinc-600 transition underline-offset-4"
          >
            {showAll ? 'Show Fewer Reviews' : `Show All ${allDisplayReviews.length} Reviews`}
          </button>
        </div>
      )}
    </section>
  );
};

export default Reviews;
