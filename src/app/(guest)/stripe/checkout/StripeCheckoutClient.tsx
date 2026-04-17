'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Lock, CreditCard, CheckCircle2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useUi } from '@/context/UiContext';
import { calculateStayPricingBreakdown } from '@/lib/pricing';

type ListingData = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageSrc: string;
  basePricePerNight?: number | null;
  price?: number | null;
  cleaningFee?: number | null;
  serviceFee?: number | null;
  petFee?: number | null;
  taxPercentage?: number | null;
  dynamicPricingRules?: unknown[];
  locationValue?: string | null;
  taxProfile?: {
    id: string;
    name: string;
    vatRate?: number;
    gstRate?: number;
    lines?: Array<{
      id: string;
      label: string;
      rate: number;
      appliesTo: "NIGHTLY" | "CLEANING" | "SERVICE" | "ALL";
      order: number;
      isActive: boolean;
    }>;
  } | null;
};

const formatMoney = (value: number) => `$${value.toFixed(2)}`;

export default function StripeCheckoutClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const listingId = searchParams.get('listingId') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const adults = Number(searchParams.get('adults') || 1);
  const children = Number(searchParams.get('children') || 0);
  const infants = Number(searchParams.get('infants') || 0);
  const pets = Number(searchParams.get('pets') || 0);

  const [listing, setListing] = useState<ListingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { data: session } = useSession();
  const { setIsLoginModalOpen, showToast } = useUi();

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const response = await fetch(`/api/listings/${listingId}`);
        if (!response.ok) throw new Error('Failed to fetch listing');
        const data = await response.json();
        setListing(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load listing');
      } finally {
        setIsLoading(false);
      }
    };
    if (listingId) fetchListing();
  }, [listingId]);

  const nights = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, [startDate, endDate]);

  const pricing = useMemo(() => {
    if (!listing) return null;
    const cleaningFee = listing.cleaningFee ?? 0;
    const serviceFee = listing.serviceFee ?? 0;
    const petFeePerPetPerNight = listing.petFee ?? 0;
    const calculated = calculateStayPricingBreakdown({
      startDate,
      endDate,
      basePricePerNight: listing.basePricePerNight ?? listing.price ?? 0,
      cleaningFee,
      serviceFee,
      petFee: petFeePerPetPerNight,
      pets,
      taxPercentage: listing.taxPercentage ?? 0,
      locationValue: listing.locationValue,
      taxProfile: listing.taxProfile || undefined,
      dynamicPricingRules: listing.dynamicPricingRules,
    });
    return { cleaningFee, serviceFee, ...calculated };
  }, [endDate, listing, nights, startDate]);

  const handlePay = async () => {
    if (!session) {
      showToast('Please log in to complete your booking.', 'info');
      setIsLoginModalOpen(true);
      return;
    }
    if (!listingId || !startDate || !endDate) return;
    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          startDate,
          endDate,
          adults,
          children,
          infants,
          pets,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking');
      }

      router.push(`/booking/success?reservationId=${data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </main>
    );
  }

  if (!listing || !pricing) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Checkout unavailable</h2>
          <p className="text-gray-500">{error || 'Missing booking info.'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                    S
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Stripe Checkout (Dummy)</p>
                    <p className="text-xs text-gray-500">Secure payment powered by Stripe</p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Lock size={12} /> Secure
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-2">Card Information</p>
                  <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500">
                    <CreditCard size={16} />
                    4242 4242 4242 4242
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500">12/34</div>
                    <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500">123</div>
                  </div>
                  <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 mt-3">John Doe</div>
                </div>

                <div className="border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-3">Billing Address</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500">United States</div>
                    <div className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500">90210</div>
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  onClick={handlePay}
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing...' : `Pay ${formatMoney(pricing.total)}`}
                </button>

                <p className="text-xs text-gray-400 text-center">This is a dummy checkout UI.</p>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[340px]">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex gap-4 pb-4 border-b border-gray-100">
                <img src={listing.imageSrc} alt={listing.title} className="w-20 h-20 rounded-xl object-cover" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{listing.title}</p>
                  {listing.subtitle && <p className="text-xs text-gray-500 mt-1">{listing.subtitle}</p>}
                </div>
              </div>
              <div className="py-4 text-sm space-y-2 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <span>Stay price</span>
                  <span>{formatMoney(pricing.nightlySubtotal)}</span>
                </div>
                {pricing.cleaningFee > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Cleaning fee</span>
                    <span>{formatMoney(pricing.cleaningFee)}</span>
                  </div>
                )}
                {pricing.serviceFee > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Service fee</span>
                    <span>{formatMoney(pricing.serviceFee)}</span>
                  </div>
                )}
                {pricing.petFeeSubtotal > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Pet fee ({pets} pet{pets !== 1 ? 's' : ''} × {nights} nights)</span>
                    <span>{formatMoney(pricing.petFeeSubtotal)}</span>
                  </div>
                )}
                {pricing.taxLines.map((line) => (
                  <div key={line.code} className="flex items-center justify-between">
                    <span>{line.label} ({line.rate}%)</span>
                    <span>{formatMoney(line.amount)}</span>
                  </div>
                ))}
                {pricing.taxLines.length === 0 && (
                  <div className="flex items-center justify-between">
                    <span>Taxes</span>
                    <span>{formatMoney(0)}</span>
                  </div>
                )}
              </div>
              <div className="pt-4 flex items-center justify-between font-semibold">
                <span>Total</span>
                <span>{formatMoney(pricing.total)}</span>
              </div>
              <div className="mt-3 text-xs text-gray-500 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Taxable amount</span>
                  <span>{formatMoney(pricing.taxableBase)}</span>
                </div>
                {pricing.taxLines.map((line) => (
                  <div key={`formula-${line.code}`} className="flex items-center justify-between">
                    <span>{line.label}: {line.rate}% × {formatMoney(line.taxableBase)}</span>
                    <span>{formatMoney(line.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-xs text-gray-500 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Taxes included.
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
