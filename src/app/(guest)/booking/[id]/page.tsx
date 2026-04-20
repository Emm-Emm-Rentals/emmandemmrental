'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ShieldCheck, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useUi } from '@/context/UiContext';
import { calculateStayPricingBreakdown } from '@/lib/pricing';
import Link from 'next/link';

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
    cancellationPolicy?: string | null;
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

type PolicyDoc = {
    id: string;
    policyKey: 'RENTAL_AGREEMENT' | 'PAYMENT_POLICY';
    title: string;
    content: string;
    version: number;
};

const formatMoney = (value: number) => {
    return `$${value.toFixed(2)}`;
};

const COUNTRIES: { code: string; name: string }[] = [
    { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albania' }, { code: 'DZ', name: 'Algeria' },
    { code: 'AR', name: 'Argentina' }, { code: 'AU', name: 'Australia' }, { code: 'AT', name: 'Austria' },
    { code: 'BH', name: 'Bahrain' }, { code: 'BD', name: 'Bangladesh' }, { code: 'BE', name: 'Belgium' },
    { code: 'BR', name: 'Brazil' }, { code: 'BG', name: 'Bulgaria' }, { code: 'KH', name: 'Cambodia' },
    { code: 'CA', name: 'Canada' }, { code: 'CL', name: 'Chile' }, { code: 'CN', name: 'China' },
    { code: 'CO', name: 'Colombia' }, { code: 'HR', name: 'Croatia' }, { code: 'CZ', name: 'Czech Republic' },
    { code: 'DK', name: 'Denmark' }, { code: 'EG', name: 'Egypt' }, { code: 'EE', name: 'Estonia' },
    { code: 'ET', name: 'Ethiopia' }, { code: 'FI', name: 'Finland' }, { code: 'FR', name: 'France' },
    { code: 'DE', name: 'Germany' }, { code: 'GH', name: 'Ghana' }, { code: 'GR', name: 'Greece' },
    { code: 'HK', name: 'Hong Kong' }, { code: 'HU', name: 'Hungary' }, { code: 'IS', name: 'Iceland' },
    { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' }, { code: 'IE', name: 'Ireland' },
    { code: 'IL', name: 'Israel' }, { code: 'IT', name: 'Italy' }, { code: 'JP', name: 'Japan' },
    { code: 'JO', name: 'Jordan' }, { code: 'KE', name: 'Kenya' }, { code: 'KW', name: 'Kuwait' },
    { code: 'LV', name: 'Latvia' }, { code: 'LB', name: 'Lebanon' }, { code: 'LT', name: 'Lithuania' },
    { code: 'MY', name: 'Malaysia' }, { code: 'MV', name: 'Maldives' }, { code: 'MX', name: 'Mexico' },
    { code: 'MA', name: 'Morocco' }, { code: 'NL', name: 'Netherlands' }, { code: 'NZ', name: 'New Zealand' },
    { code: 'NG', name: 'Nigeria' }, { code: 'NO', name: 'Norway' }, { code: 'OM', name: 'Oman' },
    { code: 'PK', name: 'Pakistan' }, { code: 'PE', name: 'Peru' }, { code: 'PH', name: 'Philippines' },
    { code: 'PL', name: 'Poland' }, { code: 'PT', name: 'Portugal' }, { code: 'QA', name: 'Qatar' },
    { code: 'RO', name: 'Romania' }, { code: 'RU', name: 'Russia' }, { code: 'SA', name: 'Saudi Arabia' },
    { code: 'SG', name: 'Singapore' }, { code: 'ZA', name: 'South Africa' }, { code: 'KR', name: 'South Korea' },
    { code: 'ES', name: 'Spain' }, { code: 'LK', name: 'Sri Lanka' }, { code: 'SE', name: 'Sweden' },
    { code: 'CH', name: 'Switzerland' }, { code: 'TW', name: 'Taiwan' }, { code: 'TZ', name: 'Tanzania' },
    { code: 'TH', name: 'Thailand' }, { code: 'TR', name: 'Turkey' }, { code: 'UG', name: 'Uganda' },
    { code: 'UA', name: 'Ukraine' }, { code: 'AE', name: 'United Arab Emirates' },
    { code: 'GB', name: 'United Kingdom' }, { code: 'US', name: 'United States' },
    { code: 'UY', name: 'Uruguay' }, { code: 'VN', name: 'Vietnam' }, { code: 'ZW', name: 'Zimbabwe' },
];

export default function BookingConfirmPage() {
    const params = useParams();
    const id = params?.id as string;
    const searchParams = useSearchParams();
    const router = useRouter();

    const [listing, setListing] = useState<ListingData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [policiesAccepted, setPoliciesAccepted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [payFullAmount, setPayFullAmount] = useState(false); // guest choice: deposit vs full
    const [showPolicyModal, setShowPolicyModal] = useState(false);
    const [policyDocs, setPolicyDocs] = useState<PolicyDoc[]>([]);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [guestDetails, setGuestDetails] = useState({
        primaryGuestName: '',
        primaryGuestEmail: '',
        primaryGuestPhone: '',
        primaryGuestStreetAddress1: '',
        primaryGuestStreetAddress2: '',
        primaryGuestCity: '',
        primaryGuestState: '',
        primaryGuestPostalCode: '',
        primaryGuestCountryCode: '',
    });
    const { data: session } = useSession();
    const { setIsLoginModalOpen, showToast } = useUi();

    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const adults = Number(searchParams.get('adults') || 1);
    const children = Number(searchParams.get('children') || 0);
    const infants = Number(searchParams.get('infants') || 0);
    const pets = Number(searchParams.get('pets') || 0);

    useEffect(() => {
        if (session?.user) {
            setGuestDetails((prev) => ({
                ...prev,
                primaryGuestName: prev.primaryGuestName || session.user?.name || '',
                primaryGuestEmail: prev.primaryGuestEmail || session.user?.email || '',
            }));
        }
    }, [session]);

    useEffect(() => {
        const loadPolicies = async () => {
            try {
                const response = await fetch('/api/policies?keys=RENTAL_AGREEMENT,PAYMENT_POLICY');
                const data = await response.json();
                if (response.ok) {
                    setPolicyDocs(data.policies || []);
                }
            } catch (err) {
                console.error('Failed to load policy documents', err);
            }
        };

        loadPolicies();

        const fetchListing = async () => {
            try {
                const response = await fetch(`/api/listings/${id}`);
                if (!response.ok) throw new Error('Failed to fetch listing');
                const data = await response.json();
                setListing(data);
            } catch (err: any) {
                setError(err.message || 'Failed to load listing');
            } finally {
                setIsLoading(false);
            }
        };
        if (id) fetchListing();
    }, [id]);

    const nights = useMemo(() => {
        if (!startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diff = end.getTime() - start.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }, [startDate, endDate]);

    // Deposit vs full-payment logic (per policy: >60 days out = 50% deposit)
    const DEPOSIT_THRESHOLD_DAYS = 60;
    const daysUntilArrival = useMemo(() => {
        if (!startDate) return 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const arrival = new Date(startDate);
        arrival.setHours(0, 0, 0, 0);
        return Math.floor((arrival.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }, [startDate]);
    const isDepositBooking = daysUntilArrival > DEPOSIT_THRESHOLD_DAYS;
    // True only when the guest is eligible for deposit AND has not opted to pay in full
    const showDepositFlow = isDepositBooking && !payFullAmount;

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

    const cancellationText = useMemo(() => {
        if (!listing?.cancellationPolicy?.trim()) {
            return 'Free cancellation within 24 hours of booking (when booked at least 7 days before check-in), then standard policy windows apply.';
        }
        return listing.cancellationPolicy.trim();
    }, [listing?.cancellationPolicy]);

    const cancellationPreview = useMemo(() => {
        if (cancellationText.length <= 180) return cancellationText;
        return `${cancellationText.slice(0, 180)}...`;
    }, [cancellationText]);
    const hasExtendedCancellationPolicy = cancellationText.length > 180;
    const rentalAgreementPolicy = policyDocs.find((policy) => policy.policyKey === 'RENTAL_AGREEMENT') || null;
    const paymentPolicy = policyDocs.find((policy) => policy.policyKey === 'PAYMENT_POLICY') || null;

    const validateGuestDetails = () => {
        const nextErrors: Record<string, string> = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^[+()\-\d\s]{7,}$/;

        if (!guestDetails.primaryGuestName.trim()) {
            nextErrors.primaryGuestName = 'Guest name is required.';
        }
        if (!guestDetails.primaryGuestEmail.trim()) {
            nextErrors.primaryGuestEmail = 'Guest email is required.';
        } else if (!emailRegex.test(guestDetails.primaryGuestEmail.trim())) {
            nextErrors.primaryGuestEmail = 'Enter a valid email address.';
        }
        if (!guestDetails.primaryGuestPhone.trim()) {
            nextErrors.primaryGuestPhone = 'Phone number is required.';
        } else if (!phoneRegex.test(guestDetails.primaryGuestPhone.trim())) {
            nextErrors.primaryGuestPhone = 'Enter a valid phone number.';
        }
        if (!guestDetails.primaryGuestStreetAddress1.trim()) {
            nextErrors.primaryGuestStreetAddress1 = 'Address line 1 is required.';
        }
        if (!guestDetails.primaryGuestCity.trim()) {
            nextErrors.primaryGuestCity = 'City is required.';
        }
        if (!guestDetails.primaryGuestState.trim()) {
            nextErrors.primaryGuestState = 'State is required.';
        }
        if (!guestDetails.primaryGuestPostalCode.trim()) {
            nextErrors.primaryGuestPostalCode = 'Postal code is required.';
        }
        if (!guestDetails.primaryGuestCountryCode.trim()) {
            nextErrors.primaryGuestCountryCode = 'Country is required.';
        }
        if (!policiesAccepted) {
            nextErrors.policiesAccepted = 'Please accept the terms and policies to continue.';
        }

        setFieldErrors(nextErrors);
        return nextErrors;
    };

    const handlePay = async () => {
        if (!session) {
            showToast('Please log in to complete your booking.', 'info');
            setIsLoginModalOpen(true);
            return;
        }
        const validationErrors = validateGuestDetails();
        if (Object.keys(validationErrors).length > 0) {
            setError('Please complete all traveler details before continuing.');
            return;
        }
        if (!listing || !startDate || !endDate || nights <= 0) return;
        setIsSubmitting(true);
        setError('');
        try {
            const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    listingId: listing.id,
                    startDate,
                    endDate,
                    adults,
                    children,
                    infants,
                    pets,
                    ...guestDetails,
                    agreementPolicyId: rentalAgreementPolicy?.id || null,
                    agreementPolicyVersion: rentalAgreementPolicy?.version || null,
                    agreementPolicyTitle: rentalAgreementPolicy?.title || null,
                    paymentPolicyId: paymentPolicy?.id || null,
                    paymentPolicyVersion: paymentPolicy?.version || null,
                    paymentPolicyTitle: paymentPolicy?.title || null,
                    payFullAmount: isDepositBooking ? payFullAmount : true,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to start payment');
            }
            if (data.url) {
                window.location.href = data.url;
                return;
            }
            throw new Error('Stripe session missing');
        } catch (err: any) {
            setError(err.message || 'Failed to start payment');
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Unavailable</h2>
                    <p className="text-gray-500">{error || 'Missing booking information.'}</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-white pb-24">
            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-10 md:pt-16">
                <div className="flex flex-col lg:flex-row gap-10">
                    <div className="flex-1">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Confirm and pay</h1>
                        <div className="space-y-6">
                            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Traveler details</h3>
                                <p className="text-sm text-gray-500 mb-5">Use the details for the guest who will stay. These can be different from your account.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="space-y-2">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Guest name</span>
                                        <input
                                            value={guestDetails.primaryGuestName}
                                            onChange={(e) => setGuestDetails((prev) => ({ ...prev, primaryGuestName: e.target.value }))}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-black placeholder:text-gray-400 outline-none focus:border-gray-900"
                                            placeholder="John Doe"
                                            required
                                        />
                                        {fieldErrors.primaryGuestName && <p className="text-xs text-red-600">{fieldErrors.primaryGuestName}</p>}
                                    </label>
                                    <label className="space-y-2">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Guest email</span>
                                        <input
                                            type="email"
                                            value={guestDetails.primaryGuestEmail}
                                            onChange={(e) => setGuestDetails((prev) => ({ ...prev, primaryGuestEmail: e.target.value }))}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-black placeholder:text-gray-400 outline-none focus:border-gray-900"
                                            placeholder="guest@example.com"
                                            required
                                        />
                                        {fieldErrors.primaryGuestEmail && <p className="text-xs text-red-600">{fieldErrors.primaryGuestEmail}</p>}
                                    </label>
                                    <label className="space-y-2">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Phone</span>
                                        <input
                                            value={guestDetails.primaryGuestPhone}
                                            onChange={(e) => setGuestDetails((prev) => ({ ...prev, primaryGuestPhone: e.target.value }))}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-black placeholder:text-gray-400 outline-none focus:border-gray-900"
                                            placeholder="+91 98765 43210"
                                            required
                                        />
                                        {fieldErrors.primaryGuestPhone && <p className="text-xs text-red-600">{fieldErrors.primaryGuestPhone}</p>}
                                    </label>
                                    <label className="space-y-2 md:col-span-2">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Address line 1</span>
                                        <input
                                            value={guestDetails.primaryGuestStreetAddress1}
                                            onChange={(e) => setGuestDetails((prev) => ({ ...prev, primaryGuestStreetAddress1: e.target.value }))}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-black placeholder:text-gray-400 outline-none focus:border-gray-900"
                                            placeholder="Street address"
                                            required
                                        />
                                        {fieldErrors.primaryGuestStreetAddress1 && <p className="text-xs text-red-600">{fieldErrors.primaryGuestStreetAddress1}</p>}
                                    </label>
                                    <label className="space-y-2 md:col-span-2">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Address line 2 <span className="normal-case font-normal text-gray-400">(optional)</span>
                                        </span>
                                        <input
                                            value={guestDetails.primaryGuestStreetAddress2}
                                            onChange={(e) => setGuestDetails((prev) => ({ ...prev, primaryGuestStreetAddress2: e.target.value }))}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-black placeholder:text-gray-400 outline-none focus:border-gray-900"
                                            placeholder="Apartment, suite, unit, etc."
                                        />
                                    </label>
                                    <label className="space-y-2">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">City</span>
                                        <input
                                            value={guestDetails.primaryGuestCity}
                                            onChange={(e) => setGuestDetails((prev) => ({ ...prev, primaryGuestCity: e.target.value }))}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-black placeholder:text-gray-400 outline-none focus:border-gray-900"
                                            placeholder="City"
                                            required
                                        />
                                        {fieldErrors.primaryGuestCity && <p className="text-xs text-red-600">{fieldErrors.primaryGuestCity}</p>}
                                    </label>
                                    <label className="space-y-2">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">State</span>
                                        <input
                                            value={guestDetails.primaryGuestState}
                                            onChange={(e) => setGuestDetails((prev) => ({ ...prev, primaryGuestState: e.target.value }))}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-black placeholder:text-gray-400 outline-none focus:border-gray-900"
                                            placeholder="State"
                                            required
                                        />
                                        {fieldErrors.primaryGuestState && <p className="text-xs text-red-600">{fieldErrors.primaryGuestState}</p>}
                                    </label>
                                    <label className="space-y-2">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Postal code</span>
                                        <input
                                            value={guestDetails.primaryGuestPostalCode}
                                            onChange={(e) => setGuestDetails((prev) => ({ ...prev, primaryGuestPostalCode: e.target.value }))}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-black placeholder:text-gray-400 outline-none focus:border-gray-900"
                                            placeholder="Postal code"
                                            required
                                        />
                                        {fieldErrors.primaryGuestPostalCode && <p className="text-xs text-red-600">{fieldErrors.primaryGuestPostalCode}</p>}
                                    </label>
                                    <label className="space-y-2">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Country</span>
                                        <div className="relative">
                                            <select
                                                value={guestDetails.primaryGuestCountryCode}
                                                onChange={(e) => setGuestDetails((prev) => ({ ...prev, primaryGuestCountryCode: e.target.value }))}
                                                className="w-full appearance-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-black bg-white outline-none focus:border-gray-900 cursor-pointer pr-10"
                                                required
                                            >
                                                <option value="" disabled>Select country…</option>
                                                {COUNTRIES.map((c) => (
                                                    <option key={c.code} value={c.code}>{c.name}</option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                        {fieldErrors.primaryGuestCountryCode && <p className="text-xs text-red-600">{fieldErrors.primaryGuestCountryCode}</p>}
                                    </label>
                                </div>
                            </div>

                            {isDepositBooking && (
                                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">Payment option</h3>
                                    <p className="text-sm text-gray-500 mb-4">Your arrival is more than 60 days away — choose how you'd like to pay.</p>
                                    <div className="space-y-3">
                                        <label className={`flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition-colors ${!payFullAmount ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                            <input
                                                type="radio"
                                                name="paymentOption"
                                                checked={!payFullAmount}
                                                onChange={() => setPayFullAmount(false)}
                                                className="mt-0.5"
                                            />
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    Pay 50% deposit now — {formatMoney((pricing?.total || 0) / 2)}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Remaining {formatMoney((pricing?.total || 0) / 2)} auto-charged to your card 60 days before check-in (
                                                    {new Date(new Date(startDate).getTime() - 60 * 24 * 60 * 60 * 1000)
                                                        .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}).
                                                </p>
                                            </div>
                                        </label>
                                        <label className={`flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition-colors ${payFullAmount ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                            <input
                                                type="radio"
                                                name="paymentOption"
                                                checked={payFullAmount}
                                                onChange={() => setPayFullAmount(true)}
                                                className="mt-0.5"
                                            />
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    Pay in full now — {formatMoney(pricing?.total || 0)}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    No future charges. Everything settled today.
                                                </p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Proceed to payment</h3>
                                <p className="text-sm text-gray-500">Secure payment powered by Stripe.</p>
                                <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                    <label className="flex items-start gap-3 text-sm text-gray-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={policiesAccepted}
                                            onChange={(e) => setPoliciesAccepted(e.target.checked)}
                                            className="mt-1 w-4 h-4"
                                        />
                                        <span>
                                            I agree to the{' '}
                                            <Link href="/terms-of-service" className="underline text-gray-900 font-medium">
                                                Rental Agreement
                                            </Link>
                                            {' '}and the{' '}
                                            <Link href="/payment-policy" className="underline text-gray-900 font-medium">
                                                Payment Policy
                                            </Link>
                                            .
                                        </span>
                                    </label>
                                    {fieldErrors.policiesAccepted && (
                                        <p className="text-xs text-red-600 mt-2">{fieldErrors.policiesAccepted}</p>
                                    )}
                                </div>
                                {showDepositFlow && (
                                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 leading-relaxed">
                                        <span className="font-semibold">50% deposit required now.</span> Because your arrival is more than 60 days away, only half the total is due today. The remaining balance of{' '}
                                        <span className="font-semibold">{formatMoney((pricing?.total || 0) / 2)}</span> will be automatically charged to your card 60 days before check-in. By paying, you authorise this future charge per our{' '}
                                        <a href="/payment-policy" className="underline font-medium text-amber-900">Payment Policy</a>.
                                    </div>
                                )}
                                {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
                                <button
                                    onClick={handlePay}
                                    disabled={!policiesAccepted || isSubmitting}
                                    className="mt-6 w-full sm:w-auto bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
                                >
                                    {isSubmitting
                                        ? 'Redirecting…'
                                        : showDepositFlow
                                            ? `Pay 50% Deposit — ${formatMoney((pricing?.total || 0) / 2)}`
                                            : `Pay ${formatMoney(pricing?.total || 0)}`}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="w-full lg:w-[360px]">
                        <div className="border border-gray-200 rounded-2xl p-5 shadow-sm">
                            <div className="flex gap-4 pb-4 border-b border-gray-100">
                                <img src={listing.imageSrc} alt={listing.title} className="w-20 h-20 rounded-xl object-cover" />
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{listing.title}</p>
                                    {listing.subtitle && (
                                        <p className="text-xs text-gray-500 mt-1">{listing.subtitle}</p>
                                    )}
                                </div>
                            </div>

                            <div className="py-4 border-b border-gray-100 space-y-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Check-in</span>
                                    <span className="font-semibold text-gray-900">{startDate}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Check-out</span>
                                    <span className="font-semibold text-gray-900">{endDate}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Guests</span>
                                    <span className="font-semibold text-gray-900">
                                        {adults} Adults{children ? `, ${children} Children` : ''}{infants ? `, ${infants} Infants` : ''}{pets ? `, ${pets} Pets` : ''}
                                    </span>
                                </div>
                            </div>

                            <div className="py-4 text-sm text-black space-y-2 border-b border-gray-100">
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
                                        <span>Pet fee ({pets} pet{pets !== 1 ? 's' : ''} × {pricing.nights} nights)</span>
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

                            <div className="pt-4 pb-2 border-b border-gray-100">
                                <p className="text-xs font-semibold text-gray-900 mb-2">Tax breakdown</p>
                                <div className="space-y-1 text-xs text-gray-600">
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
                                    <div className="flex items-center justify-between font-medium text-gray-800 pt-1">
                                        <span>Total tax</span>
                                        <span>{formatMoney(pricing.taxAmount)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex text-black items-center justify-between font-semibold">
                                <span>Total Price</span>
                                <span>{formatMoney(pricing.total)}</span>
                            </div>

                            {showDepositFlow && (
                                <div className="mt-3 pt-3 border-t border-gray-100 space-y-1 text-sm">
                                    <div className="flex items-center justify-between text-amber-700 font-semibold">
                                        <span>Due today (50% deposit)</span>
                                        <span>{formatMoney(pricing.total / 2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-gray-500">
                                        <span>
                                            Balance due{' '}
                                            {new Date(new Date(startDate).getTime() - 60 * 24 * 60 * 60 * 1000)
                                                .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                        <span>{formatMoney(pricing.total - pricing.total / 2)}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 mb-3">Policies</p>
                            <div className="space-y-2 text-sm">
                                <Link href="/terms-of-service" className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50">
                                    <span className="font-medium text-gray-900">Rental Agreement</span>
                                    <span className="text-xs text-gray-500">v{rentalAgreementPolicy?.version || 1}</span>
                                </Link>
                                <Link href="/payment-policy" className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 hover:bg-gray-50">
                                    <span className="font-medium text-gray-900">Payment Policy</span>
                                    <span className="text-xs text-gray-500">v{paymentPolicy?.version || 1}</span>
                                </Link>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center gap-3 text-xs text-gray-500">
                            <ShieldCheck size={16} className="text-green-600" />
                            US taxes are shown as Sales/Lodging tax. VAT and GST are not applicable.
                        </div>

                        <div className="mt-4 border border-gray-200 rounded-2xl p-4">
                            <p className="text-xs font-semibold text-gray-900 mb-2">Cancellation policy</p>
                            <p className="text-xs text-gray-600 leading-relaxed">{cancellationPreview}</p>
                            {hasExtendedCancellationPolicy && (
                                <button
                                    type="button"
                                    onClick={() => setShowPolicyModal(true)}
                                    className="mt-2 text-xs font-semibold text-gray-900 underline"
                                >
                                    Read more
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showPolicyModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
                    <div className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900">Full cancellation policy</h2>
                            <button
                                type="button"
                                onClick={() => setShowPolicyModal(false)}
                                className="p-2 rounded-lg border border-gray-200 text-gray-700"
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{cancellationText}</p>
                    </div>
                </div>
            )}
        </main>
    );
}
