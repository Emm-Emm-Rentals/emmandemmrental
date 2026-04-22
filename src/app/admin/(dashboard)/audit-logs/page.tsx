'use client';

import { useEffect, useMemo, useState } from 'react';

const TARGET_TYPE_COLORS: Record<string, string> = {
    user: 'bg-blue-50 text-blue-700',
    listing: 'bg-violet-50 text-violet-700',
    reservation: 'bg-amber-50 text-amber-700',
    cancellation_request: 'bg-red-50 text-red-700',
    review: 'bg-green-50 text-green-700',
    policy: 'bg-slate-100 text-slate-600',
    tax_profile: 'bg-orange-50 text-orange-700',
    refund_request: 'bg-sky-50 text-sky-700',
};

const formatDateTime = (value: string) =>
    new Date(value).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AdminAuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({ q: '', action: '', dateFrom: '', dateTo: '' });
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const queryString = useMemo(() => {
        const params = new URLSearchParams();
        if (filters.q) params.set('q', filters.q);
        if (filters.action) params.set('action', filters.action);
        if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.set('dateTo', filters.dateTo);
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
        return params.toString();
    }, [filters, page, pageSize]);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await fetch(`/api/admin/audit-logs${queryString ? `?${queryString}` : ''}`);
                if (!response.ok) throw new Error('Failed to fetch logs');
                const data = await response.json();
                setLogs(data.data || []);
                setTotalPages(data.totalPages || 1);
                setTotal(data.total || 0);
            } catch (error) {
                console.error('Failed to load audit logs:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLogs();
    }, [queryString]);

    useEffect(() => {
        setPage(1);
    }, [filters.q, filters.action, filters.dateFrom, filters.dateTo]);

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
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Audit Logs</h1>
                <p className="text-sm text-slate-500">Track administrative actions for accountability.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <input
                        value={filters.q}
                        onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                        placeholder="Search by admin email, target ID, or action"
                        className="flex-1 h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 outline-none"
                    />
                    <select
                        value={filters.action}
                        onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value }))}
                        className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                    >
                        <option value="">All Actions</option>
                        <optgroup label="User">
                            <option value="set_role">set_role</option>
                            <option value="deactivate">deactivate</option>
                            <option value="reactivate">reactivate</option>
                            <option value="soft_delete">soft_delete</option>
                            <option value="hard_delete">hard_delete</option>
                            <option value="revoke_sessions">revoke_sessions</option>
                            <option value="reset_password">reset_password</option>
                        </optgroup>
                        <optgroup label="Listing">
                            <option value="listing_create">listing_create</option>
                            <option value="listing_update">listing_update</option>
                            <option value="listing_delete">listing_delete</option>
                            <option value="listing_reorder">listing_reorder</option>
                        </optgroup>
                        <optgroup label="Reservation">
                            <option value="cancellation_approve">cancellation_approve</option>
                            <option value="cancellation_reject">cancellation_reject</option>
                            <option value="reservation_cancel">reservation_cancel</option>
                            <option value="reservation_delete">reservation_delete</option>
                            <option value="refund_issue">refund_issue</option>
                            <option value="refund_notify">refund_notify</option>
                            <option value="reservation_sync_lodgify">reservation_sync_lodgify</option>
                        </optgroup>
                        <optgroup label="Refund Requests">
                            <option value="refund_request_approve">refund_request_approve</option>
                            <option value="refund_request_reject">refund_request_reject</option>
                        </optgroup>
                        <optgroup label="Content">
                            <option value="review_create">review_create</option>
                            <option value="review_delete">review_delete</option>
                            <option value="policy_update">policy_update</option>
                            <option value="tax_profile_create">tax_profile_create</option>
                            <option value="tax_profile_update">tax_profile_update</option>
                            <option value="tax_profile_delete">tax_profile_delete</option>
                        </optgroup>
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
                </div>
            </div>

            {logs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-20 text-center">
                    <p className="text-sm font-medium text-slate-500">No audit logs found.</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="grid grid-cols-12 gap-4 border-b border-slate-200 px-6 py-4 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                        <div className="col-span-3">Admin</div>
                        <div className="col-span-3">Action</div>
                        <div className="col-span-3">Target</div>
                        <div className="col-span-3">Time</div>
                    </div>
                    <div className="divide-y divide-slate-200">
                        {logs.map((log) => (
                            <div key={log.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                                <div className="col-span-3 text-sm text-slate-700">
                                    <p className="font-medium text-slate-900">{log.admin?.name || 'Admin'}</p>
                                    <p className="text-xs text-slate-500">{log.admin?.email}</p>
                                </div>
                                <div className="col-span-3 text-sm text-slate-700">
                                    <p className="font-medium text-slate-900">{log.action}</p>
                                    {log.targetType && (
                                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${TARGET_TYPE_COLORS[log.targetType] || 'bg-slate-100 text-slate-500'}`}>
                                            {log.targetType}
                                        </span>
                                    )}
                                </div>
                                <div className="col-span-3 text-xs text-slate-600">
                                    {log.targetUser ? (
                                        <div>
                                            <p className="font-medium text-slate-900">{log.targetUser.name || 'User'}</p>
                                            <p className="text-xs text-slate-500">{log.targetUser.email || ''}</p>
                                            <p className="text-[10px] text-slate-400">{log.targetId}</p>
                                        </div>
                                    ) : (
                                        <span className="text-slate-500">{log.targetId || '—'}</span>
                                    )}
                                </div>
                                <div className="col-span-3 text-xs text-slate-500">
                                    {formatDateTime(log.createdAt)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {total > 0 && (
                <div className="mt-8 flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                        Showing page {page} of {totalPages} · {total} total logs
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
