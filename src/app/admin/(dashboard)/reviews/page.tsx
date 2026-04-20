'use client';

import { useEffect, useState, useCallback } from 'react';
import { Star, Trash2, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';

type Review = {
    id: string;
    userId: string | null;
    rating: number;
    comment: string;
    guestName: string | null;
    createdAt: string;
    user: { id: string; name: string | null; email: string | null; image: string | null } | null;
    listing: { id: string; title: string };
};

type Listing = { id: string; title: string };

const EMPTY_FORM = { listingId: '', guestName: '', rating: 5, comment: '' };

export default function AdminReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [listings, setListings] = useState<Listing[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formError, setFormError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const limit = 20;

    const load = useCallback(async (p: number) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/reviews?page=${p}&limit=${limit}`);
            const data = await res.json();
            setReviews(data.reviews || []);
            setTotal(data.total || 0);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadListings = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/listings?all=1');
            const data = await res.json();
            setListings((data.data || []).map((l: any) => ({ id: l.id, title: l.title })));
        } catch {
            // silently fail
        }
    }, []);

    useEffect(() => { load(page); }, [page, load]);
    useEffect(() => { loadListings(); }, [loadListings]);

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this review? This cannot be undone.')) return;
        setDeletingId(id);
        try {
            await fetch('/api/admin/reviews', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            load(page);
        } finally {
            setDeletingId(null);
        }
    };

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormError('');
        if (!form.listingId) { setFormError('Please select a listing'); return; }
        if (!form.guestName.trim()) { setFormError('Guest name is required'); return; }
        if (!form.comment.trim() || form.comment.trim().length < 10) { setFormError('Comment must be at least 10 characters'); return; }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/admin/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create review');
            setShowModal(false);
            setForm(EMPTY_FORM);
            load(1);
            setPage(1);
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalPages = Math.ceil(total / limit);

    const displayName = (review: Review) =>
        review.guestName || review.user?.name || 'Anonymous';

    const displayInitial = (review: Review) =>
        (review.guestName || review.user?.name || 'A').charAt(0).toUpperCase();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Reviews</h1>
                    <p className="text-sm text-slate-500 mt-1">{total} total guest reviews</p>
                </div>
                <button
                    onClick={() => { setShowModal(true); setForm(EMPTY_FORM); setFormError(''); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
                >
                    <Plus size={16} />
                    Add Review
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center min-h-[300px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
                </div>
            ) : reviews.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500 text-sm">
                    No reviews yet.
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <div key={review.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0 text-sm">
                                        {displayInitial(review)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="font-semibold text-slate-900 text-sm">{displayName(review)}</span>
                                            {review.user?.email && (
                                                <span className="text-xs text-slate-400">{review.user.email}</span>
                                            )}
                                            {!review.userId && (
                                                <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Admin added</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <Star key={s} size={13} className={s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'} />
                                                ))}
                                            </div>
                                            <span className="text-xs font-medium text-slate-500">{review.rating}/5</span>
                                        </div>
                                        <p className="text-sm text-slate-700 leading-relaxed mb-3">{review.comment}</p>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                            <span className="bg-slate-100 rounded-full px-2.5 py-1 font-medium text-slate-600">{review.listing.title}</span>
                                            <span>{new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(review.id)}
                                    disabled={deletingId === review.id}
                                    className="shrink-0 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                                    title="Delete review"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
                    <div className="flex gap-2">
                        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors">
                            <ChevronLeft size={15} /> Prev
                        </button>
                        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors">
                            Next <ChevronRight size={15} />
                        </button>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl relative">
                        <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                            <X size={18} />
                        </button>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Add Custom Review</h3>
                        <p className="text-xs text-slate-500 mb-5">Manually add a guest review to a listing.</p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Listing</label>
                                <div className="relative mt-2">
                                    <select
                                        value={form.listingId}
                                        onChange={(e) => setForm((f) => ({ ...f, listingId: e.target.value }))}
                                        className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-colors cursor-pointer"
                                    >
                                        <option value="" disabled>Select a listing…</option>
                                        {listings.map((l) => (
                                            <option key={l.id} value={l.id}>{l.title}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Guest Name</label>
                                <input
                                    type="text"
                                    value={form.guestName}
                                    onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))}
                                    placeholder="e.g. Sarah M."
                                    className="w-full mt-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rating</label>
                                <div className="flex items-center gap-2 mt-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button key={star} type="button" onClick={() => setForm((f) => ({ ...f, rating: star }))}>
                                            <Star size={24} className={star <= form.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Comment</label>
                                <textarea
                                    value={form.comment}
                                    onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                                    placeholder="Write the guest's review (min 10 characters)…"
                                    className="w-full mt-2 border border-slate-200 rounded-xl px-4 py-3 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-slate-200"
                                />
                            </div>

                            {formError && <p className="text-sm text-red-600">{formError}</p>}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-slate-900 text-white py-3 rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
                            >
                                {isSubmitting ? 'Adding…' : 'Add Review'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
