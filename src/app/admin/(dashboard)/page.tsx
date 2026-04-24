'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users, Home, CalendarCheck, DollarSign, CreditCard, RefreshCcw } from 'lucide-react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    BarChart,
    Bar,
} from 'recharts';

const formatMoney = (cents: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((cents || 0) / 100);
};

const formatShortDate = (value: string) => value.slice(5);

export default function AdminDashboard() {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [rangeDays] = useState(30);

    useEffect(() => {
        const load = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`/api/admin/dashboard?range=${rangeDays}`);
                const json = await response.json();
                setData(json);
            } catch (error) {
                console.error('Failed to load dashboard', error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [rangeDays]);

    const series = useMemo(() => data?.series || [], [data]);

    if (isLoading || !data) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    const cards = [
        { label: 'Total Users', value: data.cards.totalUsers, icon: <Users className="text-black" />, tone: 'bg-gray-100' },
        { label: 'Active Users', value: data.cards.activeUsers, icon: <Users className="text-black" />, tone: 'bg-gray-100' },
        { label: 'Active Listings', value: data.cards.activeListings, icon: <Home className="text-black" />, tone: 'bg-gray-100' },
        { label: 'Reservations', value: data.cards.totalReservations, icon: <CalendarCheck className="text-black" />, tone: 'bg-gray-100' },
        { label: 'Revenue', value: formatMoney(data.cards.totalRevenue), icon: <DollarSign className="text-black" />, tone: 'bg-gray-100' },
        { label: 'Refunded', value: formatMoney(data.cards.refundedAmount), icon: <RefreshCcw className="text-black" />, tone: 'bg-gray-100' },
        { label: 'Paid Bookings', value: data.cards.paidCount, icon: <CreditCard className="text-black" />, tone: 'bg-gray-100' },
        { label: 'Refund Count', value: data.cards.refundCount, icon: <RefreshCcw className="text-black" />, tone: 'bg-gray-100' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Dashboard Overview</h1>
                <p className="text-sm text-slate-500">Analytics for the last {rangeDays} days.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {cards.map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`${stat.tone} p-3 rounded-lg`}>
                                {stat.icon}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                            <h3 className="text-2xl font-semibold text-slate-900 mt-1">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-medium text-slate-900">Revenue (last {rangeDays} days)</h3>
                    </div>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={series}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" tickFormatter={formatShortDate} />
                                <YAxis tickFormatter={(v) => formatMoney(v)} />
                                <Tooltip formatter={(v: any) => formatMoney(Number(v))} />
                                <Line type="monotone" dataKey="revenue" stroke="#111827" strokeWidth={2.5} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="font-medium text-slate-900 mb-4">Top Listings by Revenue</h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.topListings || []}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="title" hide />
                                <YAxis tickFormatter={(v) => formatMoney(v)} />
                                <Tooltip formatter={(v: any) => formatMoney(Number(v))} />
                                <Bar dataKey="revenue" fill="#111827" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-slate-900">Bookings (last {rangeDays} days)</h3>
                </div>
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={series}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickFormatter={formatShortDate} />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Line type="monotone" dataKey="bookings" stroke="#111827" strokeWidth={2.5} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
