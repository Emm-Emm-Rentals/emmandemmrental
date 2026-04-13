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
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Payments</h1>
                <p className="text-sm text-slate-500">Track Stripe payments, card details, and refunds.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <input
                        value={filters.q}
                        onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                        placeholder="Search by guest, listing, or Payment Intent"
                        className="flex-1 h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 outline-none"
                    />
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                        className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                    >
                        <option value="">Payment status</option>
                        <option value="succeeded">succeeded</option>
                        <option value="paid">paid</option>
                        <option value="processing">processing</option>
                        <option value="requires_payment_method">requires_payment_method</option>
                        <option value="canceled">canceled</option>
                    </select>
                    <select
                        value={filters.refundStatus}
                        onChange={(e) => setFilters((prev) => ({ ...prev, refundStatus: e.target.value }))}
                        className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                    >
                        <option value="">Refund status</option>
                        <option value="none">none</option>
                        <option value="partially_refunded">partially_refunded</option>
                        <option value="refunded">refunded</option>
                    </select>
                    <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                        className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                    />
                    <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                        className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                    />
                    <button
                        onClick={handleExport}
                        className="h-11 px-4 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            {payments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-20 text-center">
                    <p className="text-sm font-medium text-slate-500">No payments found.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {payments.map((payment) => (
                        <div key={payment.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                <div className="flex items-center gap-4">
                                    <img src={payment.listing?.imageSrc} alt={payment.listing?.title} className="w-20 h-16 rounded-lg object-cover" />
                                    <div>
                                        <p className="font-medium text-slate-900">{payment.listing?.title}</p>
                                        <p className="text-xs text-slate-500">{payment.listing?.locationValue}</p>
                                        <p className="text-xs text-slate-400 mt-1">{formatDate(payment.createdAt)}</p>
                                    </div>
                                </div>
                                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-xs text-slate-500">Guest</p>
                                        <p className="font-medium text-slate-900">{payment.user?.name || 'Guest'}</p>
                                        <p className="text-xs text-slate-500">{payment.user?.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Payment</p>
                                        <p className="font-medium text-slate-900">
                                            {payment.amountPaid ? formatMoney(payment.amountPaid, payment.paymentCurrency) : `$${payment.totalPrice.toFixed(2)}`}
                                        </p>
                                        <p className="text-xs text-slate-500">{payment.paymentStatus || 'unpaid'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Card</p>
                                        <p className="text-sm text-slate-900">
                                            {payment.cardBrand && payment.cardLast4
                                                ? `${payment.cardBrand.toUpperCase()} •••• ${payment.cardLast4}`
                                                : 'Unavailable'}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {payment.cardExpMonth && payment.cardExpYear ? `exp ${payment.cardExpMonth}/${String(payment.cardExpYear).slice(-2)}` : ''}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Refunds</p>
                                        <p className="text-sm text-slate-900">{payment.refundStatus || 'none'}</p>
                                        <p className="text-xs text-slate-500">
                                            {payment.refundedAmount ? formatMoney(payment.refundedAmount, payment.paymentCurrency) : ''}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {payment.refundHistory?.length > 0 && (
                                <div className="mt-5 border-t border-slate-200 pt-4">
                                    <p className="text-[11px] font-medium text-slate-500 uppercase tracking-[0.18em] mb-3">Refund History</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {payment.refundHistory.map((refund: any) => (
                                            <div key={refund.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                                                <p className="font-medium text-slate-900">{refund.id}</p>
                                                <p className="text-xs text-slate-500">Amount: {formatMoney(refund.amount, refund.currency)}</p>
                                                <p className="text-xs text-slate-500">Status: {refund.status}</p>
                                                <p className="text-xs text-slate-400">Date: {formatDate(new Date(refund.created * 1000).toISOString())}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {total > 0 && (
                <div className="mt-8 flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                        Showing page {page} of {totalPages} · {total} total payments
                    </p>
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
