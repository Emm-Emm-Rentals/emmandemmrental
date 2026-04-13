'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft, Edit, MapPin, Tag, Users, BedDouble, Bath, Clock, DollarSign,
    CheckCircle, XCircle, Star, Image as ImageIcon, Home, Shield, Zap, Info
} from 'lucide-react';
import { AMENITIES_LIST } from '@/lib/amenities';

// amenity items are stored as { id, status, name?, ... }
function resolveAmenityName(item: any): string {
    if (item.name) return item.name;
    const found = AMENITIES_LIST.find((a) => a.id === item.id);
    return found ? found.name : item.id;
}

// highlight items are stored as { title, description } or legacy strings
function resolveHighlight(item: any): { title: string; description?: string } {
    if (typeof item === 'string') return { title: item };
    return { title: item.title || '', description: item.description };
}

export default function ListingViewPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [listing, setListing] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (id) {
            const fetchListing = async () => {
                try {
                    const response = await fetch(`/api/admin/listing?id=${id}`);
                    if (!response.ok) throw new Error('Failed to fetch');
                    const data = await response.json();
                    setListing(data);
                } catch (error) {
                    console.error('Failed to load listing:', error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchListing();
        }
    }, [id]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (!listing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <p className="text-slate-500 font-medium">Listing not found.</p>
                <button onClick={() => router.push('/admin/listings')} className="text-sm text-slate-700 underline">
                    Back to listings
                </button>
            </div>
        );
    }

    const allImages: string[] = [
        listing.imageSrc,
        ...(listing.images?.map((i: any) => i.imageUrl) || []),
    ].filter(Boolean);

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft size={18} />
                    Back to listings
                </button>
                <button
                    onClick={() => router.push(`/admin/listings/${id}`)}
                    className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
                >
                    <Edit size={16} />
                    Edit Listing
                </button>
            </div>

            {/* Title Card */}
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">{listing.title}</h1>
                        {listing.subtitle && <p className="mt-1 text-sm text-slate-500">{listing.subtitle}</p>}
                        <div className="flex flex-wrap gap-3 mt-3">
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                                <MapPin size={12} /> {listing.locationValue}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                                <Tag size={12} /> {listing.category}
                            </span>
                            {listing.comingSoon && (
                                <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                                    Coming Soon
                                </span>
                            )}
                            {listing.instantBook && (
                                <span className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                                    <Zap size={12} /> Instant Book
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <div className="text-2xl font-bold text-slate-900">${listing.basePricePerNight}<span className="text-sm font-normal text-slate-500"> / night</span></div>
                        {listing.minStayNights > 1 && (
                            <div className="text-xs text-slate-500 mt-1">Min stay: {listing.minStayNights} nights</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Images */}
            {allImages.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <ImageIcon size={14} /> Photos ({allImages.length})
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {allImages.map((url, i) => (
                            <div key={i} className={`relative overflow-hidden rounded-xl border border-slate-200 ${i === 0 ? 'col-span-2 row-span-2' : ''}`}>
                                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover aspect-video" />
                                {i === 0 && (
                                    <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">Cover</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Key Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { icon: Users, label: 'Guests', value: listing.guestCount },
                    { icon: BedDouble, label: 'Bedrooms', value: listing.roomCount },
                    { icon: Bath, label: 'Bathrooms', value: listing.bathroomCount },
                    { icon: Users, label: 'Max Guests', value: listing.maxGuestsAllowed || listing.guestCount },
                ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
                        <Icon size={20} className="mx-auto text-slate-400 mb-2" />
                        <div className="text-xl font-bold text-slate-900">{value}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                    </div>
                ))}
            </div>

            {/* Description */}
            {listing.description && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <Info size={14} /> Description
                    </h2>
                    <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{listing.description}</p>
                </div>
            )}

            {/* Pricing */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <DollarSign size={14} /> Pricing
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Base Price / Night', value: listing.basePricePerNight ? `$${listing.basePricePerNight}` : '—' },
                        { label: 'Cleaning Fee', value: listing.cleaningFee ? `$${listing.cleaningFee}` : '—' },
                        { label: 'Service Fee', value: listing.serviceFee ? `$${listing.serviceFee}` : '—' },
                        { label: 'Tax', value: listing.taxPercentage ? `${listing.taxPercentage}%` : '—' },
                    ].map(({ label, value }) => (
                        <div key={label} className="bg-slate-50 rounded-xl p-4">
                            <div className="text-xs text-slate-500 mb-1">{label}</div>
                            <div className="text-lg font-semibold text-slate-900">{value}</div>
                        </div>
                    ))}
                </div>
                {listing.taxProfile && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="text-xs font-medium text-blue-700 mb-2">Tax Profile: {listing.taxProfile.name}</div>
                        {listing.taxProfile.lines?.length > 0 && (
                            <div className="space-y-1">
                                {listing.taxProfile.lines.map((line: any, i: number) => (
                                    <div key={i} className="flex justify-between text-xs text-blue-600">
                                        <span>{line.label}</span>
                                        <span>{line.rate}%</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {Array.isArray(listing.dynamicPricingRules) && listing.dynamicPricingRules.length > 0 && (
                    <div className="mt-4">
                        <div className="text-xs font-medium text-slate-600 mb-2">Dynamic Pricing Rules</div>
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                            {listing.dynamicPricingRules.map((rule: any, i: number) => (
                                <div key={i} className="flex items-center justify-between px-4 py-3 bg-white text-sm">
                                    <span className="text-slate-700 font-medium">{rule.label}</span>
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span>${rule.nightlyPrice} / night</span>
                                        <span>{rule.startDate} → {rule.endDate}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Check-in / Check-out */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Clock size={14} /> Check-in & Check-out
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4">
                        <div className="text-xs text-slate-500 mb-1">Check-in</div>
                        <div className="font-semibold text-slate-900">{listing.checkInTime || '—'}</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                        <div className="text-xs text-slate-500 mb-1">Check-out</div>
                        <div className="font-semibold text-slate-900">{listing.checkOutTime || '—'}</div>
                    </div>
                </div>
                {listing.cancellationPolicy && (
                    <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <div className="text-xs font-medium text-amber-700 mb-1">Cancellation Policy</div>
                        <p className="text-sm text-amber-800 whitespace-pre-line">{listing.cancellationPolicy}</p>
                    </div>
                )}
            </div>

            {/* Amenities */}
            {listing.amenities?.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <CheckCircle size={14} /> Amenities ({listing.amenities.length})
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {listing.amenities.map((a: any, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1.5 text-sm text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full">
                                {resolveAmenityName(a)}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Highlights */}
            {listing.highlights?.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <Star size={14} /> Highlights
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {listing.highlights.map((h: any, i: number) => {
                            const hl = resolveHighlight(h);
                            return (
                                <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                    <Star size={14} className="text-amber-400 mt-0.5 shrink-0" />
                                    <div>
                                        <div>{hl.title}</div>
                                        {hl.description && <div className="text-xs text-slate-500 mt-0.5">{hl.description}</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* House Rules */}
            {(listing.houseRules?.length > 0 || listing.rules?.length > 0) && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <Shield size={14} /> House Rules
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[...(listing.houseRules || []), ...(listing.rules || [])].map((rule: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                                {rule}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sleeping Arrangements */}
            {listing.sleepingArrangements?.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <BedDouble size={14} /> Sleeping Arrangements
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {listing.sleepingArrangements.map((s: string, i: number) => (
                            <span key={i} className="text-sm text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full">{s}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Bedrooms */}
            {listing.bedrooms?.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <BedDouble size={14} /> Bedrooms ({listing.bedrooms.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {listing.bedrooms.map((bed: any, i: number) => (
                            <div key={i} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                                {bed.imageUrl && (
                                    <img src={bed.imageUrl} alt={bed.name} className="w-full h-32 object-cover rounded-lg mb-3 border border-slate-200" />
                                )}
                                <div className="font-medium text-slate-900 text-sm">{bed.name}</div>
                                {bed.type && <div className="text-xs text-slate-500 mt-0.5">{bed.type}</div>}
                                {bed.description && <div className="text-xs text-slate-600 mt-1">{bed.description}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Specifications */}
            {listing.specifications?.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <Info size={14} /> Specifications
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {listing.specifications.map((spec: any, i: number) => (
                            <div key={i} className="border border-slate-200 rounded-xl p-4">
                                <div className="font-medium text-slate-900 text-sm">{spec.title}</div>
                                {spec.description && <div className="text-xs text-slate-600 mt-1">{spec.description}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Advantages */}
            {listing.advantages?.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <Zap size={14} /> Advantages
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {listing.advantages.map((adv: any, i: number) => (
                            <div key={i} className="flex items-start gap-3 border border-slate-200 rounded-xl p-4">
                                {adv.iconUrl && <img src={adv.iconUrl} alt={adv.title} className="w-8 h-8 object-contain shrink-0" />}
                                <div>
                                    <div className="font-medium text-slate-900 text-sm">{adv.title}</div>
                                    {adv.description && <div className="text-xs text-slate-600 mt-0.5">{adv.description}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Gallery Sections */}
            {listing.gallerySections?.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <ImageIcon size={14} /> Gallery Sections
                    </h2>
                    <div className="space-y-6">
                        {listing.gallerySections.map((section: any, i: number) => (
                            <div key={i}>
                                <div className="text-sm font-medium text-slate-700 mb-3">{section.title}</div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {section.images?.map((img: any, j: number) => (
                                        <img key={j} src={img.imageUrl} alt={`${section.title} ${j + 1}`} className="w-full aspect-video object-cover rounded-xl border border-slate-200" />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Host Info */}
            {(listing.user || listing.hostDescription) && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <Home size={14} /> Host
                    </h2>
                    {listing.user && (
                        <div className="text-sm text-slate-700 mb-2">
                            <span className="font-medium">{listing.user.name || listing.user.email}</span>
                            {listing.user.name && <span className="text-slate-400 ml-2">{listing.user.email}</span>}
                        </div>
                    )}
                    {listing.hostDescription && <p className="text-sm text-slate-600 whitespace-pre-line">{listing.hostDescription}</p>}
                </div>
            )}

            {/* Lodgify Integration */}
            {(listing.lodgifyPropertyId || listing.lodgifyRoomTypeId || listing.lodgifyBookingUrl) && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <Zap size={14} /> Lodgify Integration
                    </h2>
                    <div className="space-y-2 text-sm">
                        {listing.lodgifyPropertyId && (
                            <div className="flex gap-2"><span className="text-slate-500 w-40 shrink-0">Property ID:</span><span className="font-mono text-slate-800">{listing.lodgifyPropertyId}</span></div>
                        )}
                        {listing.lodgifyRoomTypeId && (
                            <div className="flex gap-2"><span className="text-slate-500 w-40 shrink-0">Room Type ID:</span><span className="font-mono text-slate-800">{listing.lodgifyRoomTypeId}</span></div>
                        )}
                        {listing.lodgifyBookingUrl && (
                            <div className="flex gap-2"><span className="text-slate-500 w-40 shrink-0">Booking URL:</span><span className="font-mono text-slate-800 break-all">{listing.lodgifyBookingUrl}</span></div>
                        )}
                    </div>
                </div>
            )}

            {/* Map */}
            {listing.mapIframe && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <MapPin size={14} /> Map
                    </h2>
                    <div
                        className="rounded-xl overflow-hidden border border-slate-200"
                        dangerouslySetInnerHTML={{ __html: listing.mapIframe }}
                    />
                </div>
            )}
        </div>
    );
}
