'use client';

import { useEffect, useMemo, useState } from 'react';

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

const formatMoney = (cents: number, currency = 'usd') => {
    const amount = cents / 100;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
    }).format(amount);
};

const STATUS_STYLES: Record<string, string> = {
    succeeded: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    processing: 'bg-amber-50 text-amber-700 border border-amber-200',
    requires_payment_method: 'bg-rose-50 text-rose-700 border border-rose-200',
    canceled: 'bg-slate-100 text-slate-600 border border-slate-200',
};

const REFUND_STYLES: Record<string, string> = {
    none: 'bg-slate-100 text-slate-500 border border-slate-200',
    partially_refunded: 'bg-amber-50 text-amber-700 border border-amber-200',
    refunded: 'bg-rose-50 text-rose-700 border border-rose-200',
};

function StatusBadge({ value, map }: { value: string; map: Record<string, string> }) {
    const label = value.replace(/_/g, ' ');
    const cls = map[value] ?? 'bg-slate-100 text-slate-500 border border-slate-200';
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${cls}`}>
            {label}
        </span>
    );
}

export default function AdminPaymentsPage() {
    const [payments, setPayments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        q: '',
        status: '',
        refundStatus: '',
        dateFrom: '',
        dateTo: '',
    });
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const queryString = useMemo(() => {
        const params = new URLSearchParams();
        if (filters.q) params.set('q', filters.q);
        if (filters.status) params.set('status', filters.status);
        if (filters.refundStatus) params.set('refundStatus', filters.refundStatus);
        if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.set('dateTo', filters.dateTo);
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
        return params.toString();
    }, [filters, page, pageSize]);

    useEffect(() => {
        const fetchPayments = async () => {
            try {
                const response = await fetch(`/api/admin/payments${queryString ? `?${queryString}` : ''}`);
                if (!response.ok) throw new Error('Failed to fetch payments');
                const data = await response.json();
                setPayments(data.data || []);
                setTotalPages(data.totalPages || 1);
                setTotal(data.total || 0);
            } catch (error) {
                console.error('Failed to load payments:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPayments();
    }, [queryString]);

    useEffect(() => {
        setPage(1);
    }, [filters.q, filters.status, filters.refundStatus, filters.dateFrom, filters.dateTo]);

    const handleExport = () => {
        const url = `/api/admin/payments/export${queryString ? `?${queryString}` : ''}`;
        window.location.href = url;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Payments</h1>
                    <p className="mt-1 text-sm text-slate-500">Track Stripe payments, card details, and refunds.</p>
                </div>
                <button
                    onClick={handleExport}
                    className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12v9m0 0l-3-3m3 3l3-3M12 3v9" />
                    </svg>
                    Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                    <div className="xl:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Search</label>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                            </svg>
                            <input
                                value={filters.q}
                                onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                                placeholder="Guest, listing, or Payment Intent…"
                                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 outline-none transition-colors"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Payment Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                            className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:bg-white focus:border-slate-400 outline-none transition-colors"
                        >
                            <option value="">All statuses</option>
                            <option value="succeeded">Succeeded</option>
                            <option value="paid">Paid</option>
                            <option value="processing">Processing</option>
                            <option value="requires_payment_method">Requires payment</option>
                            <option value="canceled">Canceled</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Refund Status</label>
                        <select
                            value={filters.refundStatus}
                            onChange={(e) => setFilters((prev) => ({ ...prev, refundStatus: e.target.value }))}
                            className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:bg-white focus:border-slate-400 outline-none transition-colors"
                        >
                            <option value="">All refunds</option>
                            <option value="none">None</option>
                            <option value="partially_refunded">Partial</option>
                            <option value="refunded">Refunded</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Date Range</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                                className="flex-1 h-9 rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm text-slate-900 focus:bg-white focus:border-slate-400 outline-none transition-colors"
                            />
                            <span className="text-slate-400 text-xs shrink-0">to</span>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                                className="flex-1 h-9 rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm text-slate-900 focus:bg-white focus:border-slate-400 outline-none transition-colors"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment List */}
            {payments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-20 text-center">
                    <svg className="mx-auto mb-3 w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                    <p className="text-sm font-medium text-slate-500">No payments found.</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your filters.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {payments.map((payment) => (
                        <div key={payment.id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            {/* Card top: listing info */}
                            <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100">
                                <img
                                    src={payment.listing?.imageSrc}
                                    alt={payment.listing?.title}
                                    className="w-14 h-11 rounded-lg object-cover shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-900 text-sm truncate">{payment.listing?.title}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{payment.listing?.locationValue}</p>
                                </div>
                                <p className="text-xs text-slate-400 shrink-0">{formatDate(payment.createdAt)}</p>
                            </div>

                            {/* Card body: data grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
                                {/* Guest */}
                                <div className="px-5 py-4">
                                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">Guest</p>
                                    <p className="text-sm font-medium text-slate-900 truncate">{payment.user?.name || 'Guest'}</p>
                                    <p className="text-xs text-slate-500 truncate">{payment.user?.email}</p>
                                </div>

                                {/* Payment */}
                                <div className="px-5 py-4">
                                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">Amount</p>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {payment.amountPaid
                                            ? formatMoney(payment.amountPaid, payment.paymentCurrency)
                                            : `$${payment.totalPrice?.toFixed(2)}`}
                                    </p>
                                    <div className="mt-1">
                                        <StatusBadge value={payment.paymentStatus || 'unpaid'} map={STATUS_STYLES} />
                                    </div>
                                </div>

                                {/* Card */}
                                <div className="px-5 py-4">
                                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">Card</p>
                                    <p className="text-sm text-slate-900">
                                        {payment.cardBrand && payment.cardLast4
                                            ? `${payment.cardBrand.toUpperCase()} •••• ${payment.cardLast4}`
                                            : <span className="text-slate-400">Unavailable</span>}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {payment.cardExpMonth && payment.cardExpYear
                                            ? `Exp ${payment.cardExpMonth}/${String(payment.cardExpYear).slice(-2)}`
                                            : ''}
                                    </p>
                                </div>

                                {/* Refund */}
                                <div className="px-5 py-4">
                                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">Refund</p>
                                    <div className="mb-1">
                                        <StatusBadge value={payment.refundStatus || 'none'} map={REFUND_STYLES} />
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        {payment.refundedAmount
                                            ? formatMoney(payment.refundedAmount, payment.paymentCurrency)
                                            : ''}
                                    </p>
                                </div>
                            </div>

                            {/* Refund history (collapsible section) */}
                            {payment.refundHistory?.length > 0 && (
                                <div className="px-5 pb-4 border-t border-slate-100 pt-4 bg-slate-50/60">
                                    <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-3">Refund History</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {payment.refundHistory.map((refund: any) => (
                                            <div key={refund.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                                                <p className="font-mono text-xs text-slate-600 truncate mb-1">{refund.id}</p>
                                                <div className="flex items-center justify-between text-xs text-slate-500">
                                                    <span>{formatMoney(refund.amount, refund.currency)}</span>
                                                    <span className="capitalize">{refund.status}</span>
                                                    <span>{formatDate(new Date(refund.created * 1000).toISOString())}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {total > 0 && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-slate-500">
                        Page <span className="font-medium text-slate-700">{page}</span> of <span className="font-medium text-slate-700">{totalPages}</span>
                        <span className="text-slate-400"> · {total} payments</span>
                    </p>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                            Prev
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
