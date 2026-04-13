'use client';

import { useState, useRef, memo, useEffect } from 'react';
import { 
    Upload, X, ChevronUp, ChevronDown, AlertCircle, Save, 
    Image as ImageIcon, MapPin, DollarSign, Users, Bed, Bath, 
    Calendar, FileText, Shield, Star, Settings, ChevronRight, 
    ChevronLeft, Plus, Trash2, Clock, Percent, Info, Loader2,
    Home
} from 'lucide-react';
import { AMENITIES_LIST, AMENITY_CATEGORIES, getAmenityIcon } from '@/lib/amenities';
import { DynamicPricingRule, normalizeDynamicPricingRules } from '@/lib/pricing';

// --- CONSTANTS ---
const CATEGORIES = ['Apartment', 'House', 'Room', 'Condo', 'Villa', 'Penthouse', 'Cabin', 'Cottage', 'Houseboat'];
const LOCATIONS = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'];
const PREDEFINED_RULES = ['No Smoking', 'No Pets', 'No Parties', 'Quiet Hours', 'No Short Term Rentals', 'Minimum Stay'];
const AMENITY_ICON_OPTIONS = Array.from(new Set(AMENITIES_LIST.map(a => a.icon)));

type TaxProfileOption = {
    id: string;
    name: string;
    country?: string;
    state?: string | null;
    city?: string | null;
};

type GalleryDragItem = {
    sourceSectionIndex: number;
    sourceImageIndex: number;
    imageUrl: string;
};

type EditableDynamicPricingRule = DynamicPricingRule;

// --- HELPER COMPONENTS (DEFINED OUTSIDE TO PREVENT FOCUS LOSS) ---

const FormSection = memo(({ title, icon: Icon, children }: any) => (
    <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm mb-5 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                {Icon ? <Icon size={20} /> : <div className="w-1.5 h-4 bg-slate-500 rounded-full" />}
            </div>
            <h2 className="text-lg font-semibold text-slate-900 tracking-tight">{title}</h2>
        </div>
        {children}
    </div>
));
FormSection.displayName = 'FormSection';

const ModernInput = memo(({ label, icon: Icon, ...props }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.18em] ml-0.5">{label}</label>
        <div className="relative group">
            {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-700 transition-colors" size={17} />}
            <input 
                {...props} 
                className={`w-full ${Icon ? 'pl-11' : 'pl-4'} pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 outline-none transition-colors`} 
            />
        </div>
    </div>
));
ModernInput.displayName = 'ModernInput';

const TagInput = memo(({ items, setItems, placeholder, bgColor = "bg-rose-50", textColor = "text-rose-600" }: any) => {
    const [val, setVal] = useState('');
    const handleAdd = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && val.trim()) {
            e.preventDefault();
            setItems([...items, val.trim()]);
            setVal('');
        }
    };
    return (
        <div className="space-y-4">
            <input 
                className="w-full px-4 py-3 bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:border-slate-900 outline-none text-slate-900"
                placeholder={placeholder}
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={handleAdd}
            />
            <div className="flex flex-wrap gap-2">
                {items.map((item: string, i: number) => (
                    <div key={i} className={`flex items-center gap-2 ${bgColor} ${textColor} px-3 py-2 rounded-md text-xs font-medium border border-transparent hover:border-current transition-all`}>
                        {item} <X size={14} className="cursor-pointer" onClick={() => setItems(items.filter((_: any, j: number) => i !== j))} />
                    </div>
                ))}
            </div>
        </div>
    );
});
TagInput.displayName = 'TagInput';

// --- MAIN COMPONENT ---

export default function ListingForm({ initialData, onSubmit, isLoading = false }: any) {
    const [step, setStep] = useState(1);
    
    // --- EVERY SINGLE STATE VARIABLE FROM YOUR ORIGINAL FILE ---
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        subtitle: initialData?.subtitle || '',
        description: initialData?.description || '',
        category: initialData?.category || '',
        price: initialData?.price || '',
        roomCount: initialData?.roomCount || 1,
        bathroomCount: initialData?.bathroomCount || 1,
        guestCount: initialData?.guestCount || 1,
        locationValue: initialData?.locationValue || '',
        mapIframe: initialData?.mapIframe || '',
        checkInTime: initialData?.checkInTime || '3:00 PM',
        checkOutTime: initialData?.checkOutTime || '11:00 AM',
        hostDescription: initialData?.hostDescription || '',
        basePricePerNight: initialData?.basePricePerNight || '',
        cleaningFee: initialData?.cleaningFee || '',
        serviceFee: initialData?.serviceFee || '',
        taxPercentage: initialData?.taxPercentage || '10',
        taxProfileId: initialData?.taxProfileId || '',
        minStayNights: initialData?.minStayNights || '1',
        maxGuestsAllowed: initialData?.maxGuestsAllowed || '',
        instantBook: initialData?.instantBook || false,
        comingSoon: initialData?.comingSoon || false,
        cancellationPolicy: initialData?.cancellationPolicy || '',
        lodgifyPropertyId: initialData?.lodgifyPropertyId || '',
        lodgifyRoomTypeId: initialData?.lodgifyRoomTypeId || '',
        lodgifyBookingUrl: initialData?.lodgifyBookingUrl || '',
        lodgifyWidgetEmbed: initialData?.lodgifyWidgetEmbed || '',
    });
    const [dynamicPricingRules, setDynamicPricingRules] = useState<EditableDynamicPricingRule[]>(
        normalizeDynamicPricingRules(initialData?.dynamicPricingRules || [])
    );

    const [images, setImages] = useState<string[]>(initialData?.images?.map((img: any) => img.imageUrl) || []);
    const [gallerySections, setGallerySections] = useState<any[]>(
        initialData?.gallerySections?.map((section: any) => ({
            title: section.title || '',
            images: (section.images || []).map((img: any) => img.imageUrl),
        })) || []
    );
    const normalizeAmenities = (data: any[]) => {
        if (!Array.isArray(data)) return [];
        const byName = new Map(AMENITIES_LIST.map(a => [a.name.toLowerCase(), a.id]));
        return data.map((item) => {
            if (!item) return null;
            if (typeof item === 'string') {
                const matchId = byName.get(item.toLowerCase());
                return { id: matchId || item, status: 'included' };
            }
            if (item.id && item.status) {
                return { id: item.id, status: item.status, description: item.description, name: item.name, icon: item.icon, category: item.category, custom: item.custom };
            }
            if (item.id) {
                return { id: item.id, status: 'included', description: item.description, name: item.name, icon: item.icon, category: item.category, custom: item.custom };
            }
            if (item.name) {
                const matchId = byName.get(String(item.name).toLowerCase());
                if (matchId) return { id: matchId, status: 'included' };
                return { id: `custom-${Math.random().toString(36).slice(2, 9)}`, status: 'included', name: item.name, description: item.description, icon: item.icon, category: item.category, custom: true };
            }
            return null;
        }).filter(Boolean);
    };

    const [selectedAmenities, setSelectedAmenities] = useState<any[]>(normalizeAmenities(initialData?.amenities || []));
    const [selectedRules, setSelectedRules] = useState<string[]>(initialData?.rules || []);
    const [sleepingArrangements, setSleepingArrangements] = useState<string[]>(initialData?.sleepingArrangements || []);
    const normalizeHighlights = (data: any) => {
        if (!Array.isArray(data)) return [];
        return data.map((item) => {
            if (typeof item === 'string') return { title: item, description: '' };
            return {
                title: item?.title || '',
                description: item?.description || '',
            };
        });
    };

    const [highlights, setHighlights] = useState<any[]>(normalizeHighlights(initialData?.highlights));
    const [houseRules, setHouseRules] = useState<string[]>(initialData?.houseRules || []);
    const [specifications, setSpecifications] = useState<any[]>(initialData?.specifications || []);
    const [advantages, setAdvantages] = useState<any[]>(initialData?.advantages || []);
    const [bedrooms, setBedrooms] = useState<any[]>(initialData?.bedrooms || []);
    const [uploadingCount, setUploadingCount] = useState(0);
    const [uploadMessage, setUploadMessage] = useState('');
    const [taxProfiles, setTaxProfiles] = useState<TaxProfileOption[]>([]);
    const [draggedGalleryImage, setDraggedGalleryImage] = useState<GalleryDragItem | null>(null);
    const [dropTarget, setDropTarget] = useState<{ sectionIndex: number; imageIndex: number | null } | null>(null);
    const isUploading = uploadingCount > 0;
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchTaxProfiles = async () => {
            try {
                const response = await fetch('/api/admin/tax-profiles');
                if (!response.ok) return;
                const data = await response.json();
                if (Array.isArray(data)) {
                    setTaxProfiles(data);
                }
            } catch (error) {
                console.error('Failed to fetch tax profiles:', error);
            }
        };
        fetchTaxProfiles();
    }, []);

    useEffect(() => {
        if (!initialData) return;

        setFormData({
            title: initialData?.title || '',
            subtitle: initialData?.subtitle || '',
            description: initialData?.description || '',
            category: initialData?.category || '',
            price: initialData?.price || '',
            roomCount: initialData?.roomCount || 1,
            bathroomCount: initialData?.bathroomCount || 1,
            guestCount: initialData?.guestCount || 1,
            locationValue: initialData?.locationValue || '',
            mapIframe: initialData?.mapIframe || '',
            checkInTime: initialData?.checkInTime || '3:00 PM',
            checkOutTime: initialData?.checkOutTime || '11:00 AM',
            hostDescription: initialData?.hostDescription || '',
            basePricePerNight: initialData?.basePricePerNight || '',
            cleaningFee: initialData?.cleaningFee || '',
            serviceFee: initialData?.serviceFee || '',
            taxPercentage: initialData?.taxPercentage || '10',
            taxProfileId: initialData?.taxProfileId || '',
            minStayNights: initialData?.minStayNights || '1',
            maxGuestsAllowed: initialData?.maxGuestsAllowed || '',
            instantBook: initialData?.instantBook || false,
            comingSoon: initialData?.comingSoon || false,
            cancellationPolicy: initialData?.cancellationPolicy || '',
            lodgifyPropertyId: initialData?.lodgifyPropertyId || '',
            lodgifyRoomTypeId: initialData?.lodgifyRoomTypeId || '',
            lodgifyBookingUrl: initialData?.lodgifyBookingUrl || '',
            lodgifyWidgetEmbed: initialData?.lodgifyWidgetEmbed || '',
        });
        setDynamicPricingRules(normalizeDynamicPricingRules(initialData?.dynamicPricingRules || []));
        setImages(initialData?.images?.map((img: any) => img.imageUrl) || []);
        setGallerySections(
            initialData?.gallerySections?.map((section: any) => ({
                title: section.title || '',
                images: (section.images || []).map((img: any) => img.imageUrl),
            })) || []
        );
        setSelectedAmenities(normalizeAmenities(initialData?.amenities || []));
        setSelectedRules(initialData?.rules || []);
        setSleepingArrangements(initialData?.sleepingArrangements || []);
        setHighlights(normalizeHighlights(initialData?.highlights));
        setHouseRules(initialData?.houseRules || []);
        setSpecifications(initialData?.specifications || []);
        setAdvantages(initialData?.advantages || []);
        setBedrooms(initialData?.bedrooms || []);
    }, [initialData]);

    // --- LOGIC HANDLERS (ALL ORIGINAL FUNCTIONS) ---
    const handleFieldChange = (field: string, value: any) => setFormData(p => ({ ...p, [field]: value }));
    const addDynamicPricingRule = () => {
        setDynamicPricingRules((prev) => [
            ...prev,
            {
                id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                label: '',
                startDate: '',
                endDate: '',
                nightlyPrice: Number(formData.basePricePerNight) || 0,
                priority: prev.length,
                active: true,
            },
        ]);
    };
    const updateDynamicPricingRule = (id: string, updates: Partial<EditableDynamicPricingRule>) => {
        setDynamicPricingRules((prev) => prev.map((rule) => rule.id === id ? { ...rule, ...updates } : rule));
    };
    const removeDynamicPricingRule = (id: string) => {
        setDynamicPricingRules((prev) => prev.filter((rule) => rule.id !== id));
    };
    const updateAmenitySelection = (id: string, updates: any) => {
        setSelectedAmenities(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    };
    const addCustomAmenity = (category: string = 'essentials') => {
        setSelectedAmenities(prev => [
            ...prev,
            {
                id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                status: 'included',
                name: '',
                description: '',
                icon: 'wifi',
                category,
                custom: true,
            },
        ]);
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'icon' | 'bedroom' | 'gallery', index?: number) => {
        const files = e.target.files;
        if (!files) return;
        const fd = new FormData();
        Array.from(files).forEach(f => fd.append('files', f));

        const uploadLabel =
            type === 'main' ? 'Uploading listing photos...' :
            type === 'gallery' ? 'Uploading section photos...' :
            type === 'bedroom' ? 'Uploading bedroom photo...' :
            'Uploading image...';

        setUploadMessage(uploadLabel);
        setUploadingCount((c) => c + 1);

        try {
            const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
            if (!res.ok) {
                throw new Error('Image upload failed');
            }
            const data = await res.json();
            const urls = data.map((f: any) => f.url);

            if (type === 'main') setImages(p => [...p, ...urls]);
            if (type === 'icon' && index !== undefined) {
                const u = [...advantages]; u[index].iconUrl = urls[0]; setAdvantages(u);
            }
            if (type === 'bedroom' && index !== undefined) {
                const u = [...bedrooms]; u[index].imageUrl = urls[0]; setBedrooms(u);
            }
            if (type === 'gallery' && index !== undefined) {
                const u = [...gallerySections];
                u[index].images = [...(u[index].images || []), ...urls];
                setGallerySections(u);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Image upload failed. Please try again.');
        } finally {
            setUploadingCount((c) => Math.max(0, c - 1));
            setUploadMessage('');
            e.target.value = '';
        }
    };

    const moveImage = (index: number, direction: 'up' | 'down') => {
        const newImages = [...images];
        if (direction === 'up' && index > 0) [newImages[index], newImages[index - 1]] = [newImages[index - 1], newImages[index]];
        else if (direction === 'down' && index < newImages.length - 1) [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
        setImages(newImages);
    };

    const handleGalleryImageDrop = (targetSectionIndex: number, targetImageIndex: number | null = null) => {
        if (!draggedGalleryImage) return;

        setGallerySections((prev) => {
            const updated = [...prev];
            const sourceSection = updated[draggedGalleryImage.sourceSectionIndex];
            const targetSection = updated[targetSectionIndex];
            if (!sourceSection || !targetSection) return prev;

            const sourceImages = [...(sourceSection.images || [])];
            const [movedImage] = sourceImages.splice(draggedGalleryImage.sourceImageIndex, 1);
            if (!movedImage) return prev;
            updated[draggedGalleryImage.sourceSectionIndex] = { ...sourceSection, images: sourceImages };

            const destinationImages = [...(updated[targetSectionIndex].images || [])];
            let insertionIndex = targetImageIndex === null ? destinationImages.length : targetImageIndex;

            if (
                draggedGalleryImage.sourceSectionIndex === targetSectionIndex &&
                targetImageIndex !== null &&
                draggedGalleryImage.sourceImageIndex < targetImageIndex
            ) {
                insertionIndex -= 1;
            }

            insertionIndex = Math.max(0, Math.min(insertionIndex, destinationImages.length));
            destinationImages.splice(insertionIndex, 0, movedImage);
            updated[targetSectionIndex] = { ...updated[targetSectionIndex], images: destinationImages };

            return updated;
        });

        setDraggedGalleryImage(null);
        setDropTarget(null);
    };

    const handleFinalSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            dynamicPricingRules,
            images,
            gallerySections,
            amenities: selectedAmenities,
            rules: selectedRules,
            sleepingArrangements,
            highlights,
            houseRules,
            specifications,
            advantages,
            bedrooms,
            price: parseInt(formData.price as string) || 0
        });
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-100">
            {/* PROGRESS HEADER */}
            <div className="sticky top-0 z-[70] bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-sm">
                            <Home size={20} />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-lg font-semibold text-slate-900 leading-tight">Listing editor</h1>
                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.18em]">Step {step} of 5</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className={`h-1.5 w-8 sm:w-12 rounded-full transition-all duration-700 ${step >= i ? 'bg-slate-900' : 'bg-slate-200'}`} />
                        ))}
                    </div>
                </div>
            </div>

            <main className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-8 pb-48">
                
                {/* STEP 1: BASICS */}
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-5">
                        <FormSection title="Listing Basics" icon={FileText}>
                            <div className="space-y-6">
                                <ModernInput label="Listing Title" placeholder="e.g. Modern Penthouse with City View" value={formData.title} onChange={(e: any) => handleFieldChange('title', e.target.value)} />
                                <ModernInput label="Subtitle" placeholder="A short, catchy tagline" value={formData.subtitle} onChange={(e: any) => handleFieldChange('subtitle', e.target.value)} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.18em] ml-0.5">Property Category</label>
                                        <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-colors appearance-none" value={formData.category} onChange={(e) => handleFieldChange('category', e.target.value)}>
                                            <option value="">Select Category</option>
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <ModernInput label="Location / City" icon={MapPin} list="locs" value={formData.locationValue} onChange={(e: any) => handleFieldChange('locationValue', e.target.value)} />
                                    <datalist id="locs">{LOCATIONS.map(l => <option key={l} value={l} />)}</datalist>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.18em] ml-0.5">Detailed Description</label>
                                    <textarea className="w-full p-4 bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:border-slate-900 outline-none transition-colors text-slate-900 min-h-[200px]" value={formData.description} onChange={(e) => handleFieldChange('description', e.target.value)} placeholder="Describe the space, the vibe, and the neighborhood..." />
                                </div>
                            </div>
                        </FormSection>
                    </div>
                )}

                {/* STEP 2: CAPACITY & BEDROOMS */}
                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                        <FormSection title="Space & Capacity" icon={Users}>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <ModernInput label="Max Guests" type="number" icon={Users} value={formData.guestCount} onChange={(e: any) => handleFieldChange('guestCount', e.target.value)} />
                                <ModernInput label="Total Bedrooms" type="number" icon={Bed} value={formData.roomCount} onChange={(e: any) => handleFieldChange('roomCount', e.target.value)} />
                                <ModernInput label="Total Bathrooms" type="number" icon={Bath} value={formData.bathroomCount} onChange={(e: any) => handleFieldChange('bathroomCount', e.target.value)} />
                            </div>
                        </FormSection>

                        <FormSection title="Bedroom Gallery" icon={ImageIcon}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                {bedrooms.map((bed, idx) => (
                                    <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 relative group shadow-sm transition-colors hover:border-slate-300">
                                        <button onClick={() => setBedrooms(bedrooms.filter((_, i) => i !== idx))} className="absolute top-4 right-4 p-2 bg-white rounded-full text-slate-400 hover:text-red-500 z-10 shadow-sm border border-slate-200"><Trash2 size={16}/></button>
                                        <div className="aspect-video bg-slate-50 rounded-xl mb-6 overflow-hidden border border-dashed border-slate-200 flex items-center justify-center relative">
                                            {bed.imageUrl ? <img src={bed.imageUrl} className="w-full h-full object-cover" /> : (
                                                <label className="cursor-pointer flex flex-col items-center">
                                                    <Upload className="text-slate-300 mb-2" />
                                                    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-[0.16em]">{isUploading ? 'Uploading...' : 'Upload photo'}</span>
                                                    {isUploading && <Loader2 size={14} className="mt-2 text-slate-700 animate-spin" />}
                                                    <input type="file" className="hidden" onChange={(e) => handleUpload(e, 'bedroom', idx)} />
                                                </label>
                                            )}
                                        </div>
                                        <div className="space-y-4 px-2">
                                            <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900" placeholder="Bedroom name" value={bed.name} onChange={(e) => { const u = [...bedrooms]; u[idx].name = e.target.value; setBedrooms(u); }} />
                                            <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-slate-900" placeholder="Bed configuration (e.g. 1 Queen)" value={bed.type} onChange={(e) => { const u = [...bedrooms]; u[idx].type = e.target.value; setBedrooms(u); }} />
                                            <textarea className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none min-h-[72px] focus:border-slate-900" placeholder="Brief description..." value={bed.description} onChange={(e) => { const u = [...bedrooms]; u[idx].description = e.target.value; setBedrooms(u); }} />
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={() => setBedrooms([...bedrooms, { name: '', type: '', description: '', imageUrl: '' }])} className="aspect-video border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 hover:text-slate-700 transition-colors gap-2 bg-white">
                                    <Plus size={32} />
                                    <span className="font-medium uppercase tracking-[0.16em] text-xs">Add bedroom</span>
                                </button>
                            </div>
                        </FormSection>
                    </div>
                )}

                {/* STEP 3: AMENITIES & HIGHLIGHTS */}
                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                        <FormSection title="Amenities" icon={Star}>
                            <button
                                type="button"
                                onClick={() => addCustomAmenity('essentials')}
                                className="w-full py-4 bg-white border border-dashed border-slate-300 rounded-xl font-medium text-xs uppercase tracking-[0.16em] text-slate-500 hover:text-slate-800 hover:border-slate-400 transition-colors mb-6"
                            >
                                + Add Custom Amenity
                            </button>

                            {Object.entries(AMENITY_CATEGORIES).map(([catKey, catName]) => {
                                const categoryAmenities = AMENITIES_LIST.filter(a => a.category === catKey);
                                const customCategoryAmenities = selectedAmenities.filter((a: any) => a.custom && (a.category || 'essentials') === catKey);
                                if (categoryAmenities.length === 0 && customCategoryAmenities.length === 0) return null;
                                return (
                                <div key={catKey} className="mb-10 last:mb-0">
                                    <div className="mb-6 flex items-center justify-between gap-4">
                                        <h3 className="text-[11px] font-semibold text-slate-700 uppercase tracking-[0.18em] flex items-center gap-2">
                                            <div className="w-4 h-[2px] bg-slate-400 rounded-full" /> {catName}
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => addCustomAmenity(catKey)}
                                            className="px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-[0.16em] border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-400 transition-colors"
                                        >
                                            + Add Custom In This Section
                                        </button>
                                    </div>

                                    {customCategoryAmenities.length > 0 && (
                                        <div className="mb-5 space-y-3">
                                            {customCategoryAmenities.map((amenity: any) => (
                                                <div
                                                    key={amenity.id}
                                                    className={`p-5 border rounded-xl transition-colors ${
                                                        amenity.status === 'included'
                                                            ? 'border-slate-300 bg-slate-50'
                                                            : amenity.status === 'not_included'
                                                            ? 'border-slate-200 bg-white'
                                                            : 'border-slate-200 bg-white'
                                                    }`}
                                                >
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <input
                                                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 focus:border-slate-900 outline-none transition-colors"
                                                            placeholder="Amenity name"
                                                            value={amenity.name || ''}
                                                            onChange={(e) => updateAmenitySelection(amenity.id, { name: e.target.value })}
                                                        />
                                                        <select
                                                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 focus:border-slate-900 outline-none transition-colors"
                                                            value={amenity.icon || 'wifi'}
                                                            onChange={(e) => updateAmenitySelection(amenity.id, { icon: e.target.value })}
                                                        >
                                                            {AMENITY_ICON_OPTIONS.map(icon => (
                                                                <option key={icon} value={icon}>{icon}</option>
                                                            ))}
                                                        </select>
                                                        <input
                                                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700 focus:border-slate-900 outline-none transition-colors md:col-span-2"
                                                            placeholder="Description (optional)"
                                                            value={amenity.description || ''}
                                                            onChange={(e) => updateAmenitySelection(amenity.id, { description: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateAmenitySelection(amenity.id, { status: amenity.status === 'included' ? 'not_included' : 'included' })}
                                                            className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-[0.16em] transition-colors ${amenity.status === 'included' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                                                        >
                                                            {amenity.status === 'included' ? 'Included' : 'Not Included'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedAmenities(selectedAmenities.filter(a => a.id !== amenity.id))}
                                                            className="px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-[0.16em] text-slate-500 hover:text-red-600 transition-colors"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {categoryAmenities.map(amenity => {
                                            const Icon = getAmenityIcon(amenity.icon);
                                            const current = selectedAmenities.find(a => a.id === amenity.id);
                                            const status = current?.status || 'unset';
                                            return (
                                                <div key={amenity.id} className={`p-5 border rounded-xl transition-colors ${status === 'included' ? 'border-slate-300 bg-slate-50' : status === 'not_included' ? 'border-slate-200 bg-white' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className={`p-2 rounded-lg ${status === 'included' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                            <Icon size={18} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-slate-900">{amenity.name}</p>
                                                            {amenity.description && (
                                                                <p className="text-xs text-slate-500 mt-1">{amenity.description}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const next = status === 'included' ? 'unset' : 'included';
                                                                const updated = selectedAmenities.filter(a => a.id !== amenity.id);
                                                                if (next !== 'unset') {
                                                                    const existingDescription = current?.description;
                                                                    updated.push({ id: amenity.id, status: next, description: existingDescription });
                                                                }
                                                                setSelectedAmenities(updated);
                                                            }}
                                                            className={`flex-1 py-2 rounded-lg text-xs font-medium uppercase tracking-[0.16em] transition-colors ${status === 'included' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400'}`}
                                                        >
                                                            Included
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const next = status === 'not_included' ? 'unset' : 'not_included';
                                                                const updated = selectedAmenities.filter(a => a.id !== amenity.id);
                                                                if (next !== 'unset') {
                                                                    const existingDescription = current?.description;
                                                                    updated.push({ id: amenity.id, status: next, description: existingDescription });
                                                                }
                                                                setSelectedAmenities(updated);
                                                            }}
                                                            className={`flex-1 py-2 rounded-lg text-xs font-medium uppercase tracking-[0.16em] transition-colors ${status === 'not_included' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400'}`}
                                                        >
                                                            Not Included
                                                        </button>
                                                    </div>
                                                    {status === 'included' && (
                                                        <input
                                                            className="mt-3 w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-slate-900 outline-none"
                                                            placeholder="Custom description (optional)"
                                                            value={current?.description || ''}
                                                            onChange={(e) => updateAmenitySelection(amenity.id, { description: e.target.value })}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )})}
                        </FormSection>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <FormSection title="Property Highlights" icon={Star}>
                                <button
                                    type="button"
                                    onClick={() => setHighlights([...highlights, { title: '', description: '' }])}
                                    className="w-full py-4 border border-slate-200 rounded-xl font-medium text-xs text-slate-500 uppercase tracking-[0.16em] mb-6 hover:bg-slate-50 transition-colors"
                                >
                                    + Add Highlight
                                </button>
                                <div className="space-y-3">
                                    {highlights.map((h, idx) => (
                                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 sm:gap-4 items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-colors hover:border-slate-300 group">
                                            <input
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900"
                                                placeholder="Title (e.g. Free WiFi)"
                                                value={h.title}
                                                onChange={(e) => {
                                                    const u = [...highlights];
                                                    u[idx].title = e.target.value;
                                                    setHighlights(u);
                                                }}
                                            />
                                            <input
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-900"
                                                placeholder="Description (e.g. 200 Mbps fiber)"
                                                value={h.description}
                                                onChange={(e) => {
                                                    const u = [...highlights];
                                                    u[idx].description = e.target.value;
                                                    setHighlights(u);
                                                }}
                                            />
                                            <button onClick={() => setHighlights(highlights.filter((_, i) => i !== idx))} className="justify-self-end">
                                                <Trash2 size={16} className="text-slate-400 hover:text-red-500 transition-colors" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </FormSection>
                            <FormSection title="Sleeping Arrangements" icon={Bed}>
                                <TagInput items={sleepingArrangements} setItems={setSleepingArrangements} placeholder="e.g. Sofa Bed in Den (Press Enter)" bgColor="bg-blue-50" textColor="text-blue-600" />
                            </FormSection>
                        </div>
                    </div>
                )}

                {/* STEP 4: GALLERY & MAP */}
                {step === 4 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                        <FormSection title="Main Gallery" icon={ImageIcon}>
                            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center bg-white hover:bg-slate-50 transition-colors cursor-pointer group mb-8">
                                {isUploading ? <Loader2 className="mx-auto mb-4 text-slate-700 animate-spin" size={42} /> : <Upload className="mx-auto mb-4 text-slate-300 group-hover:text-slate-700 transition-colors" size={42} />}
                                <h3 className="text-lg font-semibold text-slate-900">{isUploading ? 'Uploading photos...' : 'Drop photos to upload'}</h3>
                                <p className="text-slate-500 text-xs mt-2">{isUploading ? uploadMessage || 'Please wait while files upload' : 'Minimum 5 high-quality photos required'}</p>
                                <input type="file" multiple className="hidden" ref={fileInputRef} onChange={(e) => handleUpload(e, 'main')} />
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {images.map((url, idx) => (
                                    <div key={idx} className={`relative group rounded-xl overflow-hidden border border-slate-200 shadow-sm ${idx === 0 ? 'sm:col-span-2 aspect-video' : 'aspect-square'}`}>
                                        <img src={url} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4">
                                            <button onClick={() => moveImage(idx, 'up')} className="p-3 bg-white rounded-xl shadow-sm hover:scale-110 active:scale-95 transition-all"><ChevronUp size={20}/></button>
                                            <button onClick={() => moveImage(idx, 'down')} className="p-3 bg-white rounded-xl shadow-sm hover:scale-110 active:scale-95 transition-all"><ChevronDown size={20}/></button>
                                            <button onClick={() => setImages(images.filter((_, i) => i !== idx))} className="p-3 bg-slate-900 text-white rounded-xl shadow-sm hover:scale-110 active:scale-95 transition-all"><Trash2 size={20}/></button>
                                        </div>
                                        {idx === 0 && <span className="absolute top-4 left-4 bg-slate-900 text-white px-3 py-1.5 rounded-full text-[11px] font-medium uppercase tracking-[0.16em]">Cover Photo</span>}
                                    </div>
                                ))}
                            </div>
                        </FormSection>

                        <FormSection title="Photo Tour Sections" icon={ImageIcon}>
                            <button
                                type="button"
                                onClick={() => setGallerySections([...gallerySections, { title: '', images: [] }])}
                                className="w-full py-4 bg-white border border-dashed border-slate-300 rounded-xl font-medium text-xs uppercase tracking-[0.16em] text-slate-500 hover:text-slate-800 hover:border-slate-400 transition-colors mb-8"
                            >
                                + Add Photo Section
                            </button>

                            <div className="space-y-8">
                                {gallerySections.map((section, sectionIndex) => (
                                    <div
                                        key={sectionIndex}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setDropTarget({ sectionIndex, imageIndex: null });
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            handleGalleryImageDrop(sectionIndex, null);
                                        }}
                                        className={`bg-white border rounded-xl p-5 shadow-sm transition-colors ${
                                            dropTarget?.sectionIndex === sectionIndex ? 'border-slate-400 bg-slate-50' : 'border-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4 mb-6">
                                            <input
                                                className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 focus:border-slate-900 outline-none transition-colors"
                                                placeholder="Section title (e.g. Living room)"
                                                value={section.title}
                                                onChange={(e) => {
                                                    const u = [...gallerySections];
                                                    u[sectionIndex].title = e.target.value;
                                                    setGallerySections(u);
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setGallerySections(gallerySections.filter((_, i) => i !== sectionIndex))}
                                                className="p-3 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>

                                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-white hover:bg-slate-50 transition-colors mb-6">
                                            <label className="cursor-pointer flex flex-col items-center">
                                                {isUploading ? <Loader2 className="mx-auto mb-3 text-slate-700 animate-spin" size={36} /> : <Upload className="mx-auto mb-3 text-slate-300 group-hover:text-slate-700 transition-colors" size={36} />}
                                                <span className="text-xs font-medium text-slate-700 uppercase tracking-[0.16em]">{isUploading ? 'Uploading...' : 'Add photos to section'}</span>
                                                <input type="file" multiple className="hidden" onChange={(e) => handleUpload(e, 'gallery', sectionIndex)} />
                                            </label>
                                        </div>

                                        {section.images?.length > 0 && (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                {section.images.map((url: string, imgIndex: number) => (
                                                    <div
                                                        key={imgIndex}
                                                        draggable
                                                        onDragStart={() => {
                                                            setDraggedGalleryImage({
                                                                sourceSectionIndex: sectionIndex,
                                                                sourceImageIndex: imgIndex,
                                                                imageUrl: url,
                                                            });
                                                            setDropTarget({ sectionIndex, imageIndex: imgIndex });
                                                        }}
                                                        onDragEnd={() => {
                                                            setDraggedGalleryImage(null);
                                                            setDropTarget(null);
                                                        }}
                                                        onDragOver={(e) => {
                                                            e.preventDefault();
                                                            setDropTarget({ sectionIndex, imageIndex: imgIndex });
                                                        }}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            handleGalleryImageDrop(sectionIndex, imgIndex);
                                                        }}
                                                        className={`relative group rounded-xl overflow-hidden border shadow-sm aspect-square cursor-move ${
                                                            dropTarget?.sectionIndex === sectionIndex && dropTarget?.imageIndex === imgIndex
                                                                ? 'border-rose-400'
                                                                : 'border-slate-200'
                                                        }`}
                                                    >
                                                        <img src={url} className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const u = [...gallerySections];
                                                                u[sectionIndex].images = u[sectionIndex].images.filter((_: string, i: number) => i !== imgIndex);
                                                                setGallerySections(u);
                                                            }}
                                                            className="absolute top-3 right-3 p-2 bg-slate-900 text-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </FormSection>

                        <FormSection title="Map Location" icon={MapPin}>
                            <div className="space-y-4">
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em] ml-0.5">Google Maps Iframe Embed Code</label>
                                <textarea className="w-full p-4 bg-white rounded-xl font-mono text-[11px] text-slate-900 outline-none border border-slate-300 focus:border-slate-900 transition-colors min-h-[140px]" placeholder='Paste <iframe src="..." /> here' value={formData.mapIframe} onChange={(e) => handleFieldChange('mapIframe', e.target.value)} />
                                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl text-slate-600 border border-slate-200">
                                    <Info size={18} />
                                    <p className="text-xs leading-relaxed">Go to Google Maps → Share → Embed a map → Copy HTML and paste it above.</p>
                                </div>
                            </div>
                        </FormSection>
                    </div>
                )}

                {/* STEP 5: PRICING, RULES & POLICIES */}
                {step === 5 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                        
                        {/* THE MISSING PRICING GRID */}
                        <FormSection title="Pricing Details" icon={DollarSign}>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 mb-10">
                                <ModernInput label="Base Price / Night" icon={DollarSign} value={formData.basePricePerNight} onChange={(e: any) => handleFieldChange('basePricePerNight', e.target.value)} />
                                <ModernInput label="Cleaning Fee" icon={DollarSign} value={formData.cleaningFee} onChange={(e: any) => handleFieldChange('cleaningFee', e.target.value)} />
                                <ModernInput label="Service Fee" icon={DollarSign} value={formData.serviceFee} onChange={(e: any) => handleFieldChange('serviceFee', e.target.value)} />
                                <div className="space-y-2">
                                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em] ml-0.5">Tax Profile</label>
                                    <select
                                        className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:border-slate-900 outline-none transition-colors"
                                        value={formData.taxProfileId as string}
                                        onChange={(e) => handleFieldChange('taxProfileId', e.target.value)}
                                    >
                                        <option value="">None (use fallback %)</option>
                                        {taxProfiles.map((profile) => (
                                            <option key={profile.id} value={profile.id}>
                                                {profile.name}
                                                {profile.state ? ` - ${profile.state}` : ''}
                                                {profile.city ? `, ${profile.city}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[11px] text-slate-500">Manage profiles in Admin → Tax Profiles</p>
                                </div>
                                <ModernInput label="Fallback Tax Percentage" icon={Percent} value={formData.taxPercentage} onChange={(e: any) => handleFieldChange('taxPercentage', e.target.value)} />
                                <ModernInput label="Min Stay (Nights)" icon={Calendar} value={formData.minStayNights} onChange={(e: any) => handleFieldChange('minStayNights', e.target.value)} />
                                <ModernInput label="Max Guests Allowed" icon={Users} value={formData.maxGuestsAllowed} onChange={(e: any) => handleFieldChange('maxGuestsAllowed', e.target.value)} />
                            </div>
                                <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 mb-6 shadow-sm">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">Dynamic pricing rules</p>
                                    <p className="text-xs text-slate-500 mt-2">Override the nightly price for specific date ranges. Higher priority wins when ranges overlap.</p>
                                    <p className="text-xs text-amber-700 mt-2">Enter normal nightly prices like 250 or 1250, not cents like 25000.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addDynamicPricingRule}
                                            className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-900 text-xs font-medium text-white hover:bg-slate-800 transition-colors shadow-sm"
                                        >
                                            + Add Pricing Rule
                                        </button>
                                    </div>
                                    {dynamicPricingRules.length === 0 ? (
                                    <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 px-6 py-8 text-center text-xs text-slate-500">
                                        No dynamic pricing rules yet. Guests will use the base nightly price.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {dynamicPricingRules.map((rule, idx) => (
                                            <div key={rule.id} className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_1fr_1fr_120px_auto] gap-4 items-end rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
                                                <ModernInput
                                                    label="Rule Label"
                                                    value={rule.label}
                                                    onChange={(e: any) => updateDynamicPricingRule(rule.id, { label: e.target.value })}
                                                    placeholder={`e.g. Summer ${idx + 1}`}
                                                />
                                                <ModernInput
                                                    label="Start Date"
                                                    type="date"
                                                    value={rule.startDate}
                                                    onChange={(e: any) => updateDynamicPricingRule(rule.id, { startDate: e.target.value })}
                                                />
                                                <ModernInput
                                                    label="End Date"
                                                    type="date"
                                                    value={rule.endDate}
                                                    onChange={(e: any) => updateDynamicPricingRule(rule.id, { endDate: e.target.value })}
                                                />
                                                <ModernInput
                                                    label="Nightly Price"
                                                    type="number"
                                                    icon={DollarSign}
                                                    value={String(rule.nightlyPrice ?? '')}
                                                    onChange={(e: any) => updateDynamicPricingRule(rule.id, { nightlyPrice: Number(e.target.value || 0) })}
                                                />
                                                <ModernInput
                                                    label="Priority"
                                                    type="number"
                                                    value={String(rule.priority ?? 0)}
                                                    onChange={(e: any) => updateDynamicPricingRule(rule.id, { priority: Number(e.target.value || 0) })}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeDynamicPricingRule(rule.id)}
                                                    className="h-[54px] px-4 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="p-6 bg-white rounded-2xl border border-slate-200 flex items-center justify-between text-slate-900 shadow-sm">
                                    <div className="flex items-center gap-4">
                                    <Shield className="text-gray-700" size={28} />
                                    <div>
                                        <p className="text-sm font-semibold">Instant Book</p>
                                        <p className="text-xs text-gray-500 mt-1">Allow guests to book without manual approval</p>
                                    </div>
                                </div>
                                <button onClick={() => handleFieldChange('instantBook', !formData.instantBook)} className={`w-14 h-8 rounded-full px-1 flex items-center transition-all duration-500 ${formData.instantBook ? 'bg-slate-900' : 'bg-slate-300'}`}>
                                    <div className={`w-6 h-6 bg-white rounded-full transition-all duration-500 ${formData.instantBook ? 'translate-x-6' : ''}`} />
                                </button>
                            </div>
                            <div className="p-6 bg-white rounded-2xl border border-slate-200 flex items-center justify-between text-slate-900 shadow-sm mt-4">
                                <div className="flex items-center gap-4">
                                    <Clock className="text-gray-700" size={28} />
                                    <div>
                                        <p className="text-sm font-semibold">Coming Soon</p>
                                        <p className="text-xs text-gray-500 mt-1">Show listing as coming soon and disable detail page click</p>
                                    </div>
                                </div>
                                <button onClick={() => handleFieldChange('comingSoon', !formData.comingSoon)} className={`w-14 h-8 rounded-full px-1 flex items-center transition-all duration-500 ${formData.comingSoon ? 'bg-slate-900' : 'bg-slate-300'}`}>
                                    <div className={`w-6 h-6 bg-white rounded-full transition-all duration-500 ${formData.comingSoon ? 'translate-x-6' : ''}`} />
                                </button>
                            </div>
                        </FormSection>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <FormSection title="Lodgify Integration" icon={Home}>
                                <div className="space-y-6">
                                    <ModernInput
                                        label="Lodgify Property ID"
                                        placeholder="Used to match Lodgify reservations back to this listing"
                                        value={formData.lodgifyPropertyId}
                                        onChange={(e: any) => handleFieldChange('lodgifyPropertyId', e.target.value)}
                                    />
                                    <ModernInput
                                        label="Lodgify Room Type ID"
                                        placeholder="Required for direct booking sync"
                                        value={formData.lodgifyRoomTypeId}
                                        onChange={(e: any) => handleFieldChange('lodgifyRoomTypeId', e.target.value)}
                                    />
                                    <ModernInput
                                        label="Lodgify Booking URL"
                                        placeholder="https://..."
                                        value={formData.lodgifyBookingUrl}
                                        onChange={(e: any) => handleFieldChange('lodgifyBookingUrl', e.target.value)}
                                    />
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em] ml-0.5">Lodgify Widget Embed Code</label>
                                        <textarea
                                            className="w-full p-4 bg-white rounded-xl font-mono text-[12px] text-slate-900 outline-none border border-slate-300 focus:border-slate-900 transition-colors h-40"
                                            placeholder="Paste the first Lodgify widget block here. The Lodgify render script is loaded automatically."
                                            value={formData.lodgifyWidgetEmbed}
                                            onChange={(e) => handleFieldChange('lodgifyWidgetEmbed', e.target.value)}
                                        />
                                        <p className="text-[11px] text-slate-500">
                                            Paste the main widget HTML block. The Lodgify script tag does not need to be added manually.
                                        </p>
                                    </div>
                                </div>
                            </FormSection>

                            <FormSection title="Booking Policies" icon={Clock}>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <ModernInput label="Check-In Time" icon={Clock} value={formData.checkInTime} onChange={(e: any) => handleFieldChange('checkInTime', e.target.value)} />
                                        <ModernInput label="Check-Out Time" icon={Clock} value={formData.checkOutTime} onChange={(e: any) => handleFieldChange('checkOutTime', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em] ml-0.5">Cancellation Policy</label>
                                        <textarea className="w-full p-4 bg-white rounded-xl text-sm text-slate-900 outline-none border border-slate-300 focus:border-slate-900 transition-colors h-32" placeholder="e.g. Free cancellation until 48 hours before check-in..." value={formData.cancellationPolicy} onChange={(e) => handleFieldChange('cancellationPolicy', e.target.value)} />
                                    </div>
                                </div>
                            </FormSection>

                            {/* THE MISSING RULES POLICY */}
                            <FormSection title="House Rules" icon={Shield}>
                                <div className="space-y-8">
                                    <div>
                                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em] mb-4 block">Standard Rules</label>
                                        <div className="flex flex-wrap gap-2">
                                            {PREDEFINED_RULES.map(rule => (
                                                <button key={rule} type="button" onClick={() => setSelectedRules(prev => prev.includes(rule) ? prev.filter(r => r !== rule) : [...prev, rule])}
                                                    className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-[0.16em] border transition-colors ${selectedRules.includes(rule) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
                                                >
                                                    {rule}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="h-[2px] bg-zinc-50" />
                                    <div>
                                        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.16em] mb-4 block ml-0.5">Custom Rules</label>
                                        <TagInput items={houseRules} setItems={setHouseRules} placeholder="e.g. No high heels on wood floors (Press Enter)" bgColor="bg-slate-900" textColor="text-white" />
                                    </div>
                                </div>
                            </FormSection>
                        </div>

                        {/* THE MISSING AREA ADVANTAGES */}
                        <FormSection title="Area Advantages" icon={Star}>
                            <button type="button" onClick={() => setAdvantages([...advantages, { title: '', description: '', iconUrl: '', order: advantages.length }])} className="w-full py-4 bg-white border border-dashed border-slate-300 rounded-xl font-medium text-xs uppercase tracking-[0.16em] text-slate-500 hover:text-slate-800 hover:border-slate-400 transition-colors mb-6">+ Add Neighborhood Advantage</button>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                {advantages.map((adv, idx) => (
                                    <div key={idx} className="p-5 bg-white rounded-xl border border-slate-200 flex gap-4 items-start relative group shadow-sm">
                                        <button onClick={() => setAdvantages(advantages.filter((_, i) => i !== idx))} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-colors"><X size={16}/></button>
                                        <div className="flex-1 space-y-2">
                                            <input className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900" placeholder="e.g. Near Transit" value={adv.title} onChange={(e) => { const u = [...advantages]; u[idx].title = e.target.value; setAdvantages(u); }} />
                                            <textarea className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none leading-relaxed h-20 focus:border-slate-900" placeholder="Describe this advantage..." value={adv.description} onChange={(e) => { const u = [...advantages]; u[idx].description = e.target.value; setAdvantages(u); }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </FormSection>

                        {/* THE MISSING SPECIFICATIONS */}
                        <FormSection title="Property Specifications" icon={Settings}>
                            <button type="button" onClick={() => setSpecifications([...specifications, { title: '', description: '', order: specifications.length }])} className="w-full py-4 border border-slate-200 rounded-xl font-medium text-xs text-slate-500 uppercase tracking-[0.16em] mb-6 hover:bg-slate-50 transition-colors">+ Add Specification</button>
                            <div className="space-y-3">
                                {specifications.map((s, idx) => (
                                    <div key={idx} className="flex gap-4 items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-colors hover:border-slate-300 group">
                                        <input className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900" placeholder="Title (e.g. View)" value={s.title} onChange={(e) => { const u = [...specifications]; u[idx].title = e.target.value; setSpecifications(u); }} />
                                        <input className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-900" placeholder="Detail (e.g. Panoramic)" value={s.description} onChange={(e) => { const u = [...specifications]; u[idx].description = e.target.value; setSpecifications(u); }} />
                                        <button onClick={() => setSpecifications(specifications.filter((_, i) => i !== idx))}><Trash2 size={16} className="text-slate-400 hover:text-red-500 transition-colors" /></button>
                                    </div>
                                ))}
                            </div>
                        </FormSection>

                        <FormSection title="About the Host" icon={Users}>
                                <textarea className="w-full p-4 bg-white rounded-xl text-sm text-slate-900 outline-none min-h-[180px] border border-slate-300 focus:border-slate-900 transition-colors" placeholder="Tell guests about your story and hosting philosophy..." value={formData.hostDescription} onChange={(e) => handleFieldChange('hostDescription', e.target.value)} />
                        </FormSection>
                    </div>
                )}
            </main>

            {/* STICKY FOOTER - ADJUSTED FOR SIDEBAR PADDING */}
            <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white/95 backdrop-blur border-t border-slate-200 p-4 sm:p-6 z-[80] shadow-[0_-10px_30px_rgba(15,23,42,0.04)]">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    {isUploading && (
                        <div className="hidden md:flex items-center gap-2 text-slate-600 text-xs font-medium">
                            <Loader2 size={14} className="animate-spin" />
                            {uploadMessage || 'Uploading images...'}
                        </div>
                    )}
                    <button 
                        onClick={() => { setStep(s => Math.max(1, s - 1)); window.scrollTo(0,0); }} 
                        className={`font-medium text-sm text-slate-600 flex items-center gap-2 px-4 py-2.5 rounded-lg hover:bg-slate-100 transition-colors ${step === 1 ? 'invisible pointer-events-none' : ''}`}
                    >
                        <ChevronLeft size={18}/> Back
                    </button>
                    
                    {step < 5 ? (
                        <button 
                            onClick={() => { setStep(s => s + 1); window.scrollTo(0,0); }} 
                            className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium text-sm shadow-sm active:scale-95 transition-colors flex items-center gap-2 hover:bg-slate-800"
                        >
                            Next Step <ChevronRight size={18} />
                        </button>
                    ) : (
                        <button 
                            onClick={handleFinalSubmit} 
                            disabled={isLoading || isUploading} 
                            className="bg-slate-900 text-white px-6 py-3 rounded-lg font-medium text-sm shadow-sm active:scale-95 transition-colors flex items-center gap-3 disabled:opacity-50 hover:bg-slate-800"
                        >
                            {isLoading ? 'Publishing...' : isUploading ? 'Uploading Images...' : (
                                <>
                                    <Save size={18} />
                                    Complete & Finish
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
