'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ListingForm from '@/components/admin/ListingForm';
import { ArrowLeft } from 'lucide-react';

export default function ListingPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [listing, setListing] = useState(null);
    const [isLoading, setIsLoading] = useState(!!id);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        if (id) {
            const fetchListing = async () => {
                try {
                    const response = await fetch(`/api/admin/listing?id=${id}`);
                    if (!response.ok) throw new Error('Failed to fetch');
                    const data = await response.json();
                    setListing(data);
                } catch (error) {
                    console.error('Failed to load listing:', error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchListing();
        }
    }, [id]);


    const handleSubmit = async (data: any) => {
        setIsSaving(true);
        setSaveError('');
        try {
            const payload = {
                ...data,
                ...(id && { id }),
            };

            const response = await fetch('/api/admin/listing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorPayload = await response.json().catch(() => null);
                throw new Error(errorPayload?.error || 'Failed to save');
            }

            const savedListing = await response.json();
            router.push(`/admin/listings`);
        } catch (error) {
            console.error('Failed to save listing:', error);
            setSaveError(error instanceof Error ? error.message : 'Failed to save listing');
            throw error;
        } finally {
            setIsSaving(false);
        }
    };


    if (isLoading && id) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-6 flex items-center justify-between gap-4">
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <ArrowLeft size={18} />
                    Back to listings
                </button>
                <div className="hidden sm:flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Admin editor
                </div>
            </div>

            <div className="mb-8 rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
                <h1 className="text-2xl font-semibold text-gray-900">
                    {id ? 'Edit listing' : 'Create listing'}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    {id
                        ? 'Update property details, pricing, and Lodgify settings.'
                        : 'Add a new property with pricing, amenities, and booking settings.'
                    }
                </p>
            </div>

            {saveError && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {saveError}
                </div>
            )}

            <ListingForm
                initialData={listing}
                onSubmit={handleSubmit}
                isLoading={isSaving}
            />
        </div>
    );
}
