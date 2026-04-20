'use client';

import { useEffect, useState } from 'react';

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

// amountPaid, balanceDueAmount, refundedAmount — stored in cents (from Stripe)
const formatMoney = (cents: number, currency = 'usd') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);

// pricePerNight, totalPrice, cleaningFee, serviceFee, taxAmount — stored in dollars
const formatDollars = (dollars: number, currency = 'usd') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(dollars);

type ReservationStatus = 'Active' | 'Upcoming' | 'Completed' | 'Cancelled' | 'Balance Failed' | 'Pending';

function getStatus(reservation: any): ReservationStatus {
    const now = new Date();
    const start = new Date(reservation.startDate);
    const end = new Date(reservation.endDate);
    const ps = (reservation.paymentStatus || '').toLowerCase();
    const lodgifyStatus = (reservation.lodgifyStatus || '').toLowerCase();

    // Cancelled — check both Lodgify status (matches CANCELED_STATUSES) and local paymentStatus
    if (reservation.isCanceled) return 'Cancelled';
    if (ps === 'canceled' || ps === 'cancelled') return 'Cancelled';
    if (['declined', 'rejected', 'deleted', 'trash', 'trashed'].includes(lodgifyStatus)) return 'Cancelled';

    if (ps === 'balance_failed') return 'Balance Failed';
    if (end < now) return 'Completed';
    if (start <= now && end >= now) return 'Active';
    if (ps === 'paid' || ps === 'succeeded') return 'Upcoming';
    return 'Pending';
}

const STATUS_STYLES: Record<ReservationStatus, string> = {
    Active: 'bg-green-50 text-green-700 border-green-200',
    Upcoming: 'bg-blue-50 text-blue-700 border-blue-200',
    Completed: 'bg-slate-100 text-slate-500 border-slate-200',
    Cancelled: 'bg-red-50 text-red-600 border-red-200',
    'Balance Failed': 'bg-orange-50 text-orange-700 border-orange-200',
    Pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
        <div className="flex gap-2 text-xs">
            <span className="w-24 shrink-0 text-slate-400">{label}</span>
            <span className="text-slate-700 break-all">{value}</span>
        </div>
    );
}

export default function AdminReservationsPage() {
    const [reservations, setReservations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [statusFilter, setStatusFilter] = useState<'all' | 'cancelled'>('all');
    const [refundAmounts, setRefundAmounts] = useState<Record<string, string>>({});
    const [isRefunding, setIsRefunding] = useState<Record<string, boolean>>({});
    const [isSyncing, setIsSyncing] = useState<Record<string, boolean>>({});
    const [isNotifying, setIsNotifying] = useState<Record<string, boolean>>({});
    const [notifyNotes, setNotifyNotes] = useState<Record<string, string>>({});
    const [notifySuccess, setNotifySuccess] = useState<Record<string, boolean>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        const fetchReservations = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(
                    `/api/admin/reservations?page=${page}&pageSize=${pageSize}&status=${statusFilter}`
                );
                if (!response.ok) throw new Error('Failed to fetch reservations');
                const data = await response.json();
                setReservations(data.data || []);
                setTotalPages(data.totalPages || 1);
                setTotal(data.total || 0);
            } catch (error) {
                console.error('Failed to load reservations:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchReservations();
    }, [page, statusFilter]);

    const handleSyncLodgify = async (reservationId: string) => {
        try {
            setIsSyncing((prev) => ({ ...prev, [reservationId]: true }));
            const response = await fetch('/api/admin/reservations/sync-lodgify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reservationId }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Sync failed');
            setReservations((prev) => prev.map((r) => (r.id === reservationId ? { ...r, ...data.reservation } : r)));
        } catch (error: any) {
            alert(error.message || 'Lodgify sync failed');
        } finally {
            setIsSyncing((prev) => ({ ...prev, [reservationId]: false }));
        }
    };

    const handleNotifyRefund = async (reservationId: string) => {
        setIsNotifying((prev) => ({ ...prev, [reservationId]: true }));
        setNotifySuccess((prev) => ({ ...prev, [reservationId]: false }));
        try {
            const response = await fetch(`/api/admin/reservations/${reservationId}/notify-refund`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminNote: notifyNotes[reservationId] || undefined }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to send notification');
            setNotifySuccess((prev) => ({ ...prev, [reservationId]: true }));
            setNotifyNotes((prev) => ({ ...prev, [reservationId]: '' }));
        } catch (error: any) {
            alert(error.message || 'Failed to send refund notification');
        } finally {
            setIsNotifying((prev) => ({ ...prev, [reservationId]: false }));
        }
    };

    const handleRefund = async (reservationId: string, amountCents?: number) => {
        try {
            setIsRefunding((prev) => ({ ...prev, [reservationId]: true }));
            const response = await fetch('/api/admin/refunds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reservationId, amount: amountCents }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Refund failed');
            setReservations((prev) => prev.map((r) => (r.id === reservationId ? data.reservation : r)));
            setRefundAmounts((prev) => ({ ...prev, [reservationId]: '' }));
        } catch (error) {
            console.error('Refund failed:', error);
            alert('Refund failed. Check console for details.');
        } finally {
            setIsRefunding((prev) => ({ ...prev, [reservationId]: false }));
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-100">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Reservations</h1>
                    <p className="text-sm text-slate-500">{total} booking{total !== 1 ? 's' : ''} {statusFilter === 'cancelled' ? 'cancelled' : 'across all properties'}.</p>
                </div>
                <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <button
                        onClick={() => { setStatusFilter('all'); setPage(1); }}
                        className={`px-4 py-2 text-xs font-medium ${statusFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => { setStatusFilter('cancelled'); setPage(1); }}
                        className={`px-4 py-2 text-xs font-medium ${statusFilter === 'cancelled' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        Cancelled
                    </button>
                </div>
            </div>

            {reservations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-20 text-center">
                    <p className="text-sm font-medium text-slate-500">No reservations found yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reservations.map((reservation) => {
                        const status = getStatus(reservation);
                        const isExpanded = expandedId === reservation.id;
                        const nights = reservation.nights || 0;
                        const guestCount = (reservation.adults || 0) + (reservation.children || 0);
                        const isDeposit = reservation.paymentType === 'deposit';

                        const addressParts = [
                            reservation.primaryGuestStreetAddress1,
                            reservation.primaryGuestStreetAddress2,
                            reservation.primaryGuestCity,
                            reservation.primaryGuestState,
                            reservation.primaryGuestPostalCode,
                            reservation.primaryGuestCountryCode,
                        ].filter(Boolean);
                        const fullAddress = addressParts.join(', ') || null;

                        return (
                            <div key={reservation.id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

                                {/* ── Header row ── */}
                                <div className="flex items-start gap-4 p-5">
                                    <img
                                        src={reservation.listing?.imageSrc}
                                        alt={reservation.listing?.title}
                                        className="w-16 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold text-slate-900 truncate">{reservation.listing?.title}</p>
                                            {/* Status badge */}
                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[status]}`}>
                                                {status}
                                            </span>
                                            {/* Payment type badge */}
                                            {isDeposit ? (
                                                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                                    Deposit
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700">
                                                    Fully Paid
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-0.5">{reservation.listing?.locationValue}</p>
                                    </div>
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : reservation.id)}
                                        className="shrink-0 text-xs font-medium text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5"
                                    >
                                        {isExpanded ? 'Collapse' : 'Details'}
                                    </button>
                                </div>

                                {/* ── Summary row — always visible ── */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-5 pb-5 text-sm">
                                    {/* Guest */}
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Guest</p>
                                        <p className="font-medium text-slate-900">{reservation.primaryGuestName || reservation.user?.name || '—'}</p>
                                        <p className="text-xs text-slate-500 truncate">{reservation.primaryGuestEmail || reservation.user?.email || '—'}</p>
                                        {reservation.primaryGuestPhone && (
                                            <p className="text-xs text-slate-500">{reservation.primaryGuestPhone}</p>
                                        )}
                                    </div>

                                    {/* Dates */}
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Stay</p>
                                        <p className="text-slate-900">{formatDate(reservation.startDate)} → {formatDate(reservation.endDate)}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {nights} night{nights !== 1 ? 's' : ''} · {guestCount} guest{guestCount !== 1 ? 's' : ''}
                                            {reservation.pets ? ` · ${reservation.pets} pet${reservation.pets !== 1 ? 's' : ''}` : ''}
                                        </p>
                                    </div>

                                    {/* Payment */}
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Payment</p>
                                        <p className="font-semibold text-slate-900">
                                            {reservation.amountPaid
                                                ? formatMoney(reservation.amountPaid, reservation.paymentCurrency)
                                                : '—'}
                                            {isDeposit && reservation.totalPrice && (
                                                <span className="font-normal text-slate-400">
                                                    {' '}/ {formatDollars(reservation.totalPrice, reservation.paymentCurrency)}
                                                </span>
                                            )}
                                        </p>
                                        {isDeposit && (
                                            reservation.balancePaid ? (
                                                <p className="text-xs font-medium text-green-600 mt-0.5">Balance paid</p>
                                            ) : (
                                                <p className="text-xs text-amber-600 font-medium mt-0.5">
                                                    Balance {reservation.balanceDueAmount ? formatMoney(reservation.balanceDueAmount, reservation.paymentCurrency) : ''} due {reservation.balanceDueDate ? formatDate(reservation.balanceDueDate) : '—'}
                                                </p>
                                            )
                                        )}
                                        <p className="text-xs text-slate-400 mt-0.5 capitalize">{reservation.paymentStatus || 'unpaid'}</p>
                                    </div>

                                    {/* Card */}
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Card</p>
                                        {reservation.cardBrand && reservation.cardLast4 ? (
                                            <>
                                                <p className="text-slate-900">{reservation.cardBrand.toUpperCase()} •••• {reservation.cardLast4}</p>
                                                {reservation.cardExpMonth && reservation.cardExpYear && (
                                                    <p className="text-xs text-slate-400">exp {reservation.cardExpMonth}/{String(reservation.cardExpYear).slice(-2)}</p>
                                                )}
                                            </>
                                        ) : (
                                            <p className="text-xs text-slate-400">No card on file</p>
                                        )}
                                        {reservation.refundedAmount > 0 && (
                                            <p className="text-xs text-rose-500 mt-0.5">
                                                Refunded {formatMoney(reservation.refundedAmount, reservation.paymentCurrency)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* ── Expanded details ── */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Full guest details */}
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Guest details</p>
                                                <div className="space-y-1.5">
                                                    <InfoRow label="Name" value={reservation.primaryGuestName} />
                                                    <InfoRow label="Email" value={reservation.primaryGuestEmail} />
                                                    <InfoRow label="Phone" value={reservation.primaryGuestPhone} />
                                                    <InfoRow label="Address" value={fullAddress} />
                                                    <InfoRow label="Locale" value={reservation.primaryGuestLocale} />
                                                </div>
                                            </div>

                                            {/* Booking meta */}
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Booking details</p>
                                                <div className="space-y-1.5">
                                                    <InfoRow label="Reservation ID" value={reservation.id} />
                                                    <InfoRow label="Booking source" value={reservation.bookingSource} />
                                                    <InfoRow label="Guests" value={[
                                                        reservation.adults && `${reservation.adults} adults`,
                                                        reservation.children && `${reservation.children} children`,
                                                        reservation.infants && `${reservation.infants} infants`,
                                                        reservation.pets && `${reservation.pets} pets`,
                                                    ].filter(Boolean).join(', ')} />
                                                    <InfoRow label="Price/night" value={reservation.pricePerNight ? formatDollars(reservation.pricePerNight, reservation.paymentCurrency) : null} />
                                                    <InfoRow label="Cleaning fee" value={reservation.cleaningFee ? formatDollars(reservation.cleaningFee, reservation.paymentCurrency) : null} />
                                                    <InfoRow label="Service fee" value={reservation.serviceFee ? formatDollars(reservation.serviceFee, reservation.paymentCurrency) : null} />
                                                    <InfoRow label="Tax" value={reservation.taxAmount ? formatDollars(reservation.taxAmount, reservation.paymentCurrency) : null} />
                                                    <InfoRow label="Stripe session" value={reservation.stripeSessionId} />
                                                    {reservation.balancePaidAt && (
                                                        <InfoRow label="Balance paid" value={formatDate(reservation.balancePaidAt)} />
                                                    )}
                                                    <div className="flex gap-2 text-xs items-center">
                                                        <span className="w-24 shrink-0 text-slate-400">Lodgify sync</span>
                                                        <span className={`font-medium ${reservation.lodgifySyncStatus === 'synced' ? 'text-green-600' : reservation.lodgifySyncStatus === 'failed' ? 'text-red-500' : 'text-amber-500'}`}>
                                                            {reservation.lodgifySyncStatus || 'pending'}
                                                        </span>
                                                        {reservation.lodgifyReservationId && (
                                                            <span className="text-slate-400 font-mono">#{reservation.lodgifyReservationId}</span>
                                                        )}
                                                        {reservation.lodgifySyncStatus !== 'synced' && (
                                                            <button
                                                                onClick={() => handleSyncLodgify(reservation.id)}
                                                                disabled={isSyncing[reservation.id]}
                                                                className="ml-1 px-2 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50 text-[10px] font-semibold"
                                                            >
                                                                {isSyncing[reservation.id] ? 'Syncing...' : 'Retry Sync'}
                                                            </button>
                                                        )}
                                                    </div>
                                                    {reservation.lodgifySyncError && (
                                                        <div className="flex gap-2 text-xs">
                                                            <span className="w-24 shrink-0 text-slate-400">Sync error</span>
                                                            <span className="text-red-500 break-all">{reservation.lodgifySyncError}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Policy agreements */}
                                            <div className="md:col-span-2">
                                                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Policy agreements</p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {/* Rental Agreement */}
                                                    <div className={`rounded-lg border px-3 py-2.5 text-xs ${reservation.agreementAcceptedAt ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-100'}`}>
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <span className={`text-base leading-none ${reservation.agreementAcceptedAt ? 'text-green-600' : 'text-slate-400'}`}>
                                                                {reservation.agreementAcceptedAt ? '✓' : '✗'}
                                                            </span>
                                                            <span className="font-semibold text-slate-800">
                                                                {reservation.agreementPolicyTitle || 'Rental Agreement'}
                                                            </span>
                                                            {reservation.agreementPolicyVersion && (
                                                                <span className="text-slate-400">v{reservation.agreementPolicyVersion}</span>
                                                            )}
                                                        </div>
                                                        {reservation.agreementAcceptedAt ? (
                                                            <p className="text-slate-500">Accepted {new Date(reservation.agreementAcceptedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                                        ) : (
                                                            <p className="text-slate-400">Not accepted</p>
                                                        )}
                                                    </div>

                                                    {/* Payment Policy */}
                                                    <div className={`rounded-lg border px-3 py-2.5 text-xs ${reservation.paymentPolicyAcceptedAt ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-100'}`}>
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <span className={`text-base leading-none ${reservation.paymentPolicyAcceptedAt ? 'text-green-600' : 'text-slate-400'}`}>
                                                                {reservation.paymentPolicyAcceptedAt ? '✓' : '✗'}
                                                            </span>
                                                            <span className="font-semibold text-slate-800">
                                                                {reservation.paymentPolicyTitle || 'Payment Policy'}
                                                            </span>
                                                            {reservation.paymentPolicyVersion && (
                                                                <span className="text-slate-400">v{reservation.paymentPolicyVersion}</span>
                                                            )}
                                                        </div>
                                                        {reservation.paymentPolicyAcceptedAt ? (
                                                            <p className="text-slate-500">Accepted {new Date(reservation.paymentPolicyAcceptedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                                        ) : (
                                                            <p className="text-slate-400">Not accepted</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Refund controls */}
                                        {reservation.amountPaid > 0 && (
                                            <div className="pt-3 border-t border-slate-200 space-y-4">
                                                {/* Issue refund via Stripe */}
                                                <div>
                                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Issue refund</p>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            placeholder="Amount (USD)"
                                                            value={refundAmounts[reservation.id] || ''}
                                                            onChange={(e) => setRefundAmounts((prev) => ({ ...prev, [reservation.id]: e.target.value }))}
                                                            className="w-36 h-9 px-3 text-xs border border-slate-200 rounded-lg bg-white focus:border-slate-900 outline-none"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const value = refundAmounts[reservation.id];
                                                                const amountCents = value ? Math.round(Number(value) * 100) : undefined;
                                                                handleRefund(reservation.id, amountCents);
                                                            }}
                                                            disabled={isRefunding[reservation.id]}
                                                            className="h-9 px-4 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700"
                                                        >
                                                            {isRefunding[reservation.id] ? 'Refunding...' : 'Issue Refund'}
                                                        </button>
                                                        {reservation.refundStatus && reservation.refundStatus !== 'none' && (
                                                            <span className="text-xs text-rose-500">
                                                                {reservation.refundStatus} · {formatMoney(reservation.refundedAmount || 0, reservation.paymentCurrency)} refunded
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Notify guest about refund (only if a refund has been issued) */}
                                                {reservation.refundedAmount > 0 && (
                                                    <div>
                                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Notify guest</p>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <input
                                                                type="text"
                                                                placeholder="Optional note to guest…"
                                                                value={notifyNotes[reservation.id] || ''}
                                                                onChange={(e) => setNotifyNotes((prev) => ({ ...prev, [reservation.id]: e.target.value }))}
                                                                className="flex-1 min-w-0 h-9 px-3 text-xs border border-slate-200 rounded-lg bg-white focus:border-slate-900 outline-none"
                                                            />
                                                            <button
                                                                onClick={() => handleNotifyRefund(reservation.id)}
                                                                disabled={isNotifying[reservation.id]}
                                                                className="h-9 px-4 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
                                                            >
                                                                {isNotifying[reservation.id] ? 'Sending...' : 'Send Refund Email'}
                                                            </button>
                                                            {notifySuccess[reservation.id] && (
                                                                <span className="text-xs text-green-600 font-medium">✓ Email sent</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {total > 0 && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-slate-500">Page {page} of {totalPages} · {total} total</p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
