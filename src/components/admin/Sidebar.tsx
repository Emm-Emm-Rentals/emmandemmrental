'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
    LayoutDashboard,
    Users,
    Home,
    CalendarCheck,
    CreditCard,
    FileText,
    ScrollText,
    Receipt,
    Settings,
    Menu,
    X,
    CircleOff
} from 'lucide-react';
import { useState } from 'react';

const Sidebar = () => {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(true);

    const navItems = [
        { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={20} /> },
        { label: 'Users', href: '/admin/users', icon: <Users size={20} /> },
        { label: 'Listings', href: '/admin/listings', icon: <Home size={20} /> },
        { label: 'Reservations', href: '/admin/reservations', icon: <CalendarCheck size={20} /> },
        { label: 'Payments', href: '/admin/payments', icon: <CreditCard size={20} /> },
        { label: 'Policies', href: '/admin/policies', icon: <FileText size={20} /> },
        { label: 'Tax Profiles', href: '/admin/tax-profiles', icon: <Receipt size={20} /> },
        { label: 'Cancellations', href: '/admin/cancellation-requests', icon: <CircleOff size={20} /> },
        { label: 'Audit Logs', href: '/admin/audit-logs', icon: <ScrollText size={20} /> },
    ];

    return (
        <>
            {/* Mobile Toggle */}
            <button
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg border border-slate-200 bg-white shadow-sm text-slate-900"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Sidebar */}
            <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 text-slate-200 border-r border-slate-800 transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-y-0
      `}>
                {/* Fixed Header */}
                <div className="p-6 border-b border-slate-800 flex-shrink-0">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Emm Admin</p>
                    <h1 className="mt-2 text-xl font-semibold text-white">Property Management</h1>
                    <p className="text-xs text-slate-400 mt-1">Operations, bookings, and finance.</p>
                </div>

                {/* Scrollable Navigation Content */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border
                    ${isActive
                                        ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                                        : 'text-slate-300 border-transparent hover:bg-slate-900 hover:text-white hover:border-slate-800'}
                  `}
                            >
                                {item.icon}
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Fixed Footer */}
                <div className="p-4 border-t border-slate-800 space-y-1 flex-shrink-0">
                        <Link
                            href="/"
                            className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-900 rounded-xl transition-all border border-transparent hover:border-slate-800"
                        >
                            <Settings size={20} />
                            <span className="font-medium">Return to Site</span>
                        </Link>
                        <button
                            onClick={() => signOut({ callbackUrl: '/admin/login' })}
                            className="w-full flex items-center gap-3 px-4 py-3 text-red-300 hover:bg-red-950/40 rounded-xl transition-all border border-transparent hover:border-red-900/50"
                        >
                            <X size={20} />
                            <span className="font-medium">Log Out</span>
                        </button>
                    </div>
                </div>
            </>
        );
    };

export default Sidebar;
