'use client';

import { useState, useEffect } from 'react';
import { Home, User, MapPin, Tag, MoreVertical, Edit, Trash2, Plus, GripVertical, Loader2, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ListingsPage() {
    const router = useRouter();
    const [listings, setListings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [total, setTotal] = useState(0);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [draggingId, setDraggingId] = useState<string | null>(null);

    const fetchListings = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/admin/listings?all=1`);
            const data = await response.json();
            setListings(data.data || []);
            setTotal(data.total || 0);
        } catch (error) {
            console.error('Failed to fetch listings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchListings();
    }, []);

    // Refetch listings when returning from edit/create
    useEffect(() => {
        const handleRouterChange = () => {
            fetchListings();
        };
        
        // Listen for visibility change (when user comes back to this tab/window)
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                fetchListings();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const handleEdit = (id: string) => {
        router.push(`/admin/listings/${id}`);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this listing?')) return;

        setDeletingId(id);
        try {
            const response = await fetch(`/api/admin/listing/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete');

            setListings(prev => prev.filter(l => l.id !== id));
            setOpenMenuId(null);
        } catch (error) {
            console.error('Failed to delete listing:', error);
            alert('Failed to delete listing');
        } finally {
            setDeletingId(null);
        }
    };

    const persistOrder = async (orderedIds: string[]) => {
        setIsSavingOrder(true);
        try {
            const response = await fetch('/api/admin/listings/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderedIds }),
            });
            if (!response.ok) {
                throw new Error('Failed to save listing order');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to save listing order. Refreshing data.');
            await fetchListings();
        } finally {
            setIsSavingOrder(false);
        }
    };

    const moveListing = async (fromId: string, toId: string) => {
        if (!fromId || !toId || fromId === toId) return;
        const fromIndex = listings.findIndex((item) => item.id === fromId);
        const toIndex = listings.findIndex((item) => item.id === toId);
        if (fromIndex < 0 || toIndex < 0) return;

        const reordered = [...listings];
        const [dragged] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, dragged);
        setListings(reordered);
        await persistOrder(reordered.map((item) => item.id));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Listing Management</h1>
                    <p className="text-sm text-slate-500">Monitor and manage property listings. Drag and drop to control display order.</p>
                </div>
                <div className="flex items-center gap-3">
                    {isSavingOrder && (
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                            <Loader2 size={14} className="animate-spin" />
                            Saving order...
                        </div>
                    )}
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-3 py-2 text-xs font-medium ${viewMode === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            Grid
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-2 text-xs font-medium ${viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            List
                        </button>
                    </div>
                    <button
                        onClick={() => router.push('/admin/listings/new')}
                        className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors font-medium shadow-sm"
                    >
                        <Plus size={20} />
                        New Listing
                    </button>
                </div>
            </div>

            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {listings.map((listing) => (
                        <div
                            key={listing.id}
                            draggable
                            onDragStart={() => setDraggingId(listing.id)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={async () => {
                                if (!draggingId || draggingId === listing.id) return;
                                await moveListing(draggingId, listing.id);
                                setDraggingId(null);
                            }}
                            onDragEnd={() => setDraggingId(null)}
                            className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-shadow relative ${
                                draggingId === listing.id ? 'opacity-60' : ''
                            }`}
                        >
                            <div className="relative h-48 overflow-hidden">
                                <img
                                    src={listing.imageSrc}
                                    alt={listing.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm p-2 rounded-lg border border-slate-200 text-slate-600 cursor-grab active:cursor-grabbing shadow-sm">
                                    <GripVertical size={16} />
                                </div>
                                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-slate-900 shadow-sm border border-slate-200">
                                    ${listing.basePricePerNight} / night
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-medium text-slate-900 line-clamp-1">{listing.title}</h3>
                                    <div className="relative">
                                        <button
                                            onClick={() => setOpenMenuId(openMenuId === listing.id ? null : listing.id)}
                                            className="p-1 hover:bg-slate-50 rounded-lg"
                                        >
                                            <MoreVertical size={16} className="text-slate-400" />
                                        </button>

                                        {openMenuId === listing.id && (
                                            <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                                                <button
                                                    onClick={() => {
                                                        router.push(`/admin/listings/${listing.id}/view`);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-200"
                                                >
                                                    <Eye size={16} />
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleEdit(listing.id);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-200"
                                                >
                                                    <Edit size={16} />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(listing.id)}
                                                    disabled={deletingId === listing.id}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                                                >
                                                    <Trash2 size={16} />
                                                    {deletingId === listing.id ? 'Deleting...' : 'Delete'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <MapPin size={14} />
                                        <span>{listing.locationValue}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <Tag size={14} />
                                        <span>{listing.category}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <User size={14} />
                                        <span>Hosted by {listing.user?.name || listing.user?.email || 'Unknown'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                                    <div className="flex gap-3 text-xs font-medium text-slate-400">
                                        <span>{listing.roomCount} Rooms</span>
                                        <span>{listing.guestCount} Guests</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {viewMode === 'list' && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 text-[11px] font-medium text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200">
                        <div className="col-span-4">Property</div>
                        <div className="col-span-2">Location</div>
                        <div className="col-span-2">Pricing</div>
                        <div className="col-span-3">Details</div>
                        <div className="col-span-1 text-right">Actions</div>
                    </div>
                    <div className="divide-y divide-slate-200">
                        {listings.map((listing) => (
                            <div
                                key={listing.id}
                                draggable
                                onDragStart={() => setDraggingId(listing.id)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={async () => {
                                    if (!draggingId || draggingId === listing.id) return;
                                    await moveListing(draggingId, listing.id);
                                    setDraggingId(null);
                                }}
                                onDragEnd={() => setDraggingId(null)}
                                className={`grid grid-cols-12 gap-4 px-6 py-5 items-start ${draggingId === listing.id ? 'opacity-60 bg-slate-50' : ''}`}
                            >
                                <div className="col-span-4 flex gap-4">
                                    <div className="pt-1 text-slate-400 cursor-grab active:cursor-grabbing">
                                        <GripVertical size={16} />
                                    </div>
                                    <img src={listing.imageSrc} alt={listing.title} className="w-24 h-20 rounded-lg object-cover border border-slate-200" />
                                    <div>
                                        <p className="font-medium text-slate-900">{listing.title}</p>
                                        {listing.subtitle && <p className="text-xs text-slate-500 mt-1">{listing.subtitle}</p>}
                                        <p className="text-xs text-slate-500 mt-2 line-clamp-2">{listing.description}</p>
                                    </div>
                                </div>
                                <div className="col-span-2 text-sm text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} />
                                        <span>{listing.locationValue}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                        <Tag size={12} />
                                        <span>{listing.category}</span>
                                    </div>
                                </div>
                                <div className="col-span-2 text-sm text-slate-600">
                                    <div className="font-medium text-slate-900">${listing.basePricePerNight} / night</div>
                                    <div className="text-xs text-slate-500 mt-1">Min stay: {listing.minStayNights || 1} nights</div>
                                </div>
                                <div className="col-span-3 text-xs text-slate-600 space-y-1">
                                    <div>{listing.guestCount} guests · {listing.roomCount} rooms · {listing.bathroomCount} baths</div>
                                    <div>Amenities: {listing.amenities?.length || 0}</div>
                                    <div>Rules: {listing.rules?.length || 0}</div>
                                    <div>Highlights: {listing.highlights?.length || 0}</div>
                                </div>
                                <div className="col-span-1 flex justify-end">
                                    <div className="relative">
                                        <button
                                            onClick={() => setOpenMenuId(openMenuId === listing.id ? null : listing.id)}
                                            className="p-1 hover:bg-slate-50 rounded-lg"
                                        >
                                            <MoreVertical size={16} className="text-slate-400" />
                                        </button>
                                        {openMenuId === listing.id && (
                                            <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                                                <button
                                                    onClick={() => {
                                                        router.push(`/admin/listings/${listing.id}/view`);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-200"
                                                >
                                                    <Eye size={16} />
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleEdit(listing.id);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-200"
                                                >
                                                    <Edit size={16} />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(listing.id)}
                                                    disabled={deletingId === listing.id}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                                                >
                                                    <Trash2 size={16} />
                                                    {deletingId === listing.id ? 'Deleting...' : 'Delete'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {listings.length === 0 && (
                <div className="py-20 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Home size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium mb-4">No listings found yet.</p>
                    <button
                        onClick={() => router.push('/admin/listings/new')}
                        className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors font-medium shadow-sm"
                    >
                        <Plus size={18} />
                        Create Your First Listing
                    </button>
                </div>
            )}

            {total > 0 && (
                <div className="mt-8 flex items-center justify-between">
                    <p className="text-sm text-slate-500">{total} total listings</p>
                </div>
            )}
        </div>
    );
}
