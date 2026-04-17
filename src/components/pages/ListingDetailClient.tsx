'use client';

import { useState } from 'react';
import Amenities from '@/components/Amenities';
import BookingBar from '@/components/BookingBar';
import LocationMap from '@/components/LocationMap';
import Reviews from '@/components/Reviews';
import ImportantThingsToKnow from '@/components/RulesAndPolicy';
import SleepingArrangements from '@/components/SleepingArrangements';
import AboutSpace from '@/components/AboutSpace';
import { ChevronLeft, ChevronRight, Star, X } from 'lucide-react';
import Link from 'next/link';
import ReviewForm from '@/components/ReviewForm';

type Highlight = string | { title: string; description?: string };

type ListingDetail = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  imageSrc: string;
  locationValue: string;
  guestCount: number;
  roomCount: number;
  bathroomCount: number;
  amenities: unknown[];
  rules: string[];
  cancellationPolicy?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  mapIframe?: string | null;
  reviews: Array<{
    id: string;
    user: { name: string; image?: string | null };
    comment: string;
    rating: number;
    createdAt: string;
  }>;
  highlights: Highlight[];
  bedrooms: Array<{
    id: string;
    name: string;
    description: string;
    type: string;
    imageUrl: string | null;
    order: number;
    listingId: string;
    createdAt: string;
  }>;
  advantages: Array<{
    id: string;
    title: string;
    description: string | null;
    iconUrl: string | null;
    order: number;
    listingId: string;
  }>;
  basePricePerNight?: number | null;
  cleaningFee?: number | null;
  serviceFee?: number | null;
  petFee?: number | null;
  taxPercentage?: number | null;
  minStayNights?: number | null;
  dynamicPricingRules?: unknown[];
  lodgifyPropertyId?: string | null;
  lodgifyBookingUrl?: string | null;
  lodgifyWidgetEmbed?: string | null;
  taxProfile?: {
    id: string;
    name: string;
    vatRate?: number | null;
    gstRate?: number | null;
    lines?: Array<{
      id?: string;
      label: string;
      rate: number;
      appliesTo: 'NIGHTLY' | 'CLEANING' | 'SERVICE' | 'ALL';
      order?: number;
      isActive?: boolean;
    }>;
  } | null;
  images: Array<{ id: string; imageUrl: string }>;
};

export default function ListingDetailClient({
  listing,
  userId,
}: {
  listing: ListingDetail;
  userId?: string;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);

  const displayImages = listing.images.length > 0
    ? listing.images.map((img) => img.imageUrl)
    : [listing.imageSrc];

  const avgRating = listing.reviews.length > 0
    ? (listing.reviews.reduce((sum, r) => sum + r.rating, 0) / listing.reviews.length).toFixed(1)
    : '5.0';

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = 'unset';
  };

  const prevImage = () => setLightboxIndex((i) => (i > 0 ? i - 1 : i));
  const nextImage = () => setLightboxIndex((i) => (i < displayImages.length - 1 ? i + 1 : i));

  return (
    <main className="min-h-screen bg-white pb-40 md:pb-32">
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-8">
        <h1 className="text-xl md:text-3xl font-bold text-center text-gray-900 mb-6 md:mb-8 px-2 leading-tight">
          {listing.title}
        </h1>

        <div className="mb-8 grid h-[320px] grid-cols-2 grid-rows-2 gap-2 md:h-[520px] md:grid-cols-12 md:grid-rows-6">
          {displayImages.slice(0, 4).map((img, idx) => {
            const gridClass =
              idx === 0
                ? 'md:col-span-6 md:row-span-6'
                : idx === 1
                ? 'md:col-span-6 md:row-span-4'
                : 'md:col-span-3 md:row-span-2';

            return (
              <div
                key={idx}
                className={`relative overflow-hidden rounded-2xl bg-gray-50 cursor-zoom-in ${gridClass}`}
                onClick={() => openLightbox(idx)}
              >
                <img
                  src={img}
                  alt={`${listing.title} ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            );
          })}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="w-full">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4 px-1">
              {listing.subtitle}
            </h2>
            <div className="flex flex-wrap gap-2">
              {[
                `${listing.guestCount} Guests`,
                `${listing.roomCount} Bedroom${listing.roomCount > 1 ? 's' : ''}`,
                `${listing.roomCount + 1} Beds`,
                `${listing.bathroomCount} Bathroom${listing.bathroomCount > 1 ? 's' : ''}`,
              ].map((tag) => (
                <span key={tag} className="bg-zinc-900 text-white px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-2 md:mt-0 flex flex-row md:flex-col justify-between md:items-end items-center w-full md:w-auto gap-2 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
            <Link
              href={`/listing/${listing.id}/photos`}
              className="text-xs md:text-sm text-black font-semibold underline"
            >
              View All Photos
            </Link>
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1 text-xs md:text-sm font-medium shadow-sm">
              <Star size={14} className="text-green-600 fill-green-600 md:w-4 md:h-4" />
              <span className="text-black">{avgRating}</span>
              <span className="text-gray-400">|</span>
              <span className="text-black">{listing.reviews.length} Reviews</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 p-6 md:p-8 bg-white border border-gray-100 rounded-2xl md:rounded-3xl shadow-sm mb-12">
          {listing.highlights?.map((highlight, idx) => {
            const title = typeof highlight === 'string' ? highlight : highlight.title;
            const description = typeof highlight === 'string' ? '' : (highlight.description || '');
            return (
              <div key={idx} className="flex gap-4 items-start">
                <div className="bg-amber-50 p-3 md:p-4 rounded-xl md:rounded-2xl shrink-0">
                  <Star className="text-amber-600" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm md:text-base">{title}</h3>
                  {description && (
                    <p className="text-xs md:text-sm text-gray-500 leading-relaxed mt-1">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <AboutSpace description={listing.description} title={listing.title} />
        <Amenities amenities={listing.amenities} />
        <SleepingArrangements bedrooms={listing.bedrooms} />
        <Reviews reviews={listing.reviews} totalRating={parseFloat(avgRating)} />

        <ReviewForm
          listingId={listing.id}
          userId={userId}
        />

        <LocationMap
          mapIframe={listing.mapIframe || undefined}
          listingId={listing.id}
          locationLabel={listing.locationValue}
        />
        <ImportantThingsToKnow
          rules={listing.rules}
          cancellationPolicy={listing.cancellationPolicy}
          checkInTime={listing.checkInTime}
          checkOutTime={listing.checkOutTime}
          maxGuests={listing.guestCount}
          selectedCheckInDate={selectedStartDate}
        />
        <BookingBar
          listingId={listing.id}
          basePricePerNight={listing.basePricePerNight}
          cleaningFee={listing.cleaningFee}
          serviceFee={listing.serviceFee}
          petFee={listing.petFee}
          taxPercentage={listing.taxPercentage}
          locationValue={listing.locationValue}
          taxProfile={listing.taxProfile}
          minStayNights={listing.minStayNights}
          dynamicPricingRules={listing.dynamicPricingRules}
          maxGuests={listing.guestCount}
          lodgifyPropertyId={listing.lodgifyPropertyId}
          lodgifyBookingUrl={listing.lodgifyBookingUrl}
          lodgifyWidgetEmbed={listing.lodgifyWidgetEmbed}
          onDateChange={({ startDate }) => {
            setSelectedStartDate(startDate);
          }}
        />
      </div>

      {lightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
          >
            <X size={22} />
          </button>

          <button
            onClick={prevImage}
            disabled={lightboxIndex === 0}
            className="absolute left-4 md:left-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition disabled:opacity-40"
          >
            <ChevronLeft size={26} />
          </button>

          <img
            src={displayImages[lightboxIndex]}
            alt="Photo"
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
          />

          <button
            onClick={nextImage}
            disabled={lightboxIndex === displayImages.length - 1}
            className="absolute right-4 md:right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition disabled:opacity-40"
          >
            <ChevronRight size={26} />
          </button>
        </div>
      )}
    </main>
  );
}
