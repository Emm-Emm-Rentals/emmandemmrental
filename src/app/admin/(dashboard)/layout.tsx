import Sidebar from '@/components/admin/Sidebar';
import { Providers } from "@/components/Providers";
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { adminAuthOptions } from '@/lib/auth';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(adminAuthOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
        redirect('/admin/login');
    }

    return (
        <Providers basePath="/api/admin/auth">
            <div className="flex min-h-screen bg-slate-100 overflow-hidden text-slate-900">
                <Sidebar />
                <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>      
        </Providers>
    );
}
