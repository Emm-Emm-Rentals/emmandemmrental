'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

type CancellationRequest = {
    id: string;
    reservationId: string | null;
    lodgifyReservationId: string | null;
    listingTitle: string;
    startDate: string;
    endDate: string;
    reason: string | null;
    status: 'pending' | 'approved' | 'rejected';
    adminNote: string | null;
    createdAt: string;
    processedAt: string | null;
    user: { id: string; name: string | null; email: string | null };
    reservation: {
        paymentStatus: string | null;
        amountPaid: number | null;
        paymentCurrency: string | null;
        lodgifyReservationId: string | null;
    } | null;
};

const STATUS_STYLES = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-600 border-red-200',
};

const formatDate = (v: string) =>
    new Date(v).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

export default function CancellationRequestsPage() {
    const [requests, setRequests] = useState<CancellationRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/cancellation-requests?status=${statusFilter}`);
            const data = await res.json();
            setRequests(data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchRequests(); }, [statusFilter]);

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        setProcessingId(id);
        try {
            const res = await fetch(`/api/admin/cancellation-requests/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, adminNote: adminNotes[id] }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to process request');
            setRequests((prev) =>
                prev.map((r) => (r.id === id ? { ...r, ...data.request } : r))
            );
        } catch (err: any) {
            alert(err.message || 'Failed to process request');
        } finally {
            setProcessingId(null);
        }
    };

    const pending = requests.filter((r) => r.status === 'pending');
    const others = requests.filter((r) => r.status !== 'pending');

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Cancellation Requests</h1>
                    <p className="text-sm text-slate-500">Review and process guest cancellation requests.</p>
                </div>
                <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <button
                        onClick={() => setStatusFilter('pending')}
                        className={`px-4 py-2 text-xs font-medium ${statusFilter === 'pending' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        Pending {pending.length > 0 && statusFilter === 'pending' ? `(${pending.length})` : ''}
                    </button>
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-4 py-2 text-xs font-medium ${statusFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        All
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center min-h-[300px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
                </div>
            ) : requests.length === 0 ? (
                <div className="py-20 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <CheckCircle size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">
                        {statusFilter === 'pending' ? 'No pending cancellation requests.' : 'No cancellation requests found.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((req) => (
                        <div key={req.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-5">
                                <div className="flex flex-wrap items-start gap-3 justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-slate-900">{req.listingTitle}</h3>
                                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[req.status]}`}>
                                                {req.status === 'pending' && <Clock size={10} />}
                                                {req.status === 'approved' && <CheckCircle size={10} />}
                                                {req.status === 'rejected' && <XCircle size={10} />}
                                                {req.status}
                                            </span>
                                            {(req.reservationId || req.lodgifyReservationId) && (
                                                <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                                    {req.lodgifyReservationId || req.reservation?.lodgifyReservationId ? 'Lodgify' : 'Local'}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {formatDate(req.startDate)} → {formatDate(req.endDate)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-slate-900">{req.user.name || req.user.email}</p>
                                        <p className="text-xs text-slate-400">{req.user.email}</p>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            Requested {new Date(req.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>

                                {/* Reason */}
                                {req.reason && (
                                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Guest reason</p>
                                        <p className="text-sm text-slate-700">{req.reason}</p>
                                    </div>
                                )}

                                {/* Payment info */}
                                {req.reservation?.amountPaid ? (
                                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                        <AlertCircle size={14} />
                                        <span>
                                            Amount paid: {new Intl.NumberFormat('en-US', { style: 'currency', currency: (req.reservation.paymentCurrency || 'usd').toUpperCase() }).format(req.reservation.amountPaid / 100)}
                                            {' '} — consider issuing a refund from the Reservations page if approving.
                                        </span>
                                    </div>
                                ) : null}

                                {/* Admin note (read-only after processing) */}
                                {req.status !== 'pending' && req.adminNote && (
                                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Admin note</p>
                                        <p className="text-sm text-slate-700">{req.adminNote}</p>
                                    </div>
                                )}

                                {/* Actions (only for pending) */}
                                {req.status === 'pending' && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-3 items-start md:items-center">
                                        <input
                                            type="text"
                                            placeholder="Optional admin note to guest..."
                                            value={adminNotes[req.id] || ''}
                                            onChange={(e) => setAdminNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                                            className="flex-1 h-9 px-3 text-xs border border-slate-200 rounded-lg bg-white focus:border-slate-900 outline-none"
                                        />
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleAction(req.id, 'reject')}
                                                disabled={processingId === req.id}
                                                className="h-9 px-4 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                            >
                                                {processingId === req.id ? '...' : 'Reject'}
                                            </button>
                                            <button
                                                onClick={() => handleAction(req.id, 'approve')}
                                                disabled={processingId === req.id}
                                                className="h-9 px-4 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                                            >
                                                {processingId === req.id ? 'Processing...' : 'Approve & Cancel'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
