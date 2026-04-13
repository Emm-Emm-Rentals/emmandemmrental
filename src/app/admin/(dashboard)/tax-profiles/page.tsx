'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';

type TaxLine = {
  label: string;
  rate: string;
  appliesTo: 'NIGHTLY' | 'CLEANING' | 'SERVICE' | 'ALL';
  order: number;
  isActive: boolean;
};

type TaxProfile = {
  id: string;
  name: string;
  country: string;
  state?: string | null;
  county?: string | null;
  city?: string | null;
  vatRate: number;
  gstRate: number;
  isActive: boolean;
  lines: Array<{
    id: string;
    label: string;
    rate: number;
    appliesTo: 'NIGHTLY' | 'CLEANING' | 'SERVICE' | 'ALL';
    order: number;
    isActive: boolean;
  }>;
};

const emptyLine = (order: number): TaxLine => ({
  label: '',
  rate: '',
  appliesTo: 'ALL',
  order,
  isActive: true,
});

export default function TaxProfilesPage() {
  const [profiles, setProfiles] = useState<TaxProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    country: 'US',
    state: '',
    county: '',
    city: '',
    vatRate: '0',
    gstRate: '0',
    isActive: true,
    lines: [emptyLine(0)] as TaxLine[],
  });

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedId) || null,
    [profiles, selectedId]
  );

  const loadProfiles = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/tax-profiles');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch tax profiles');
      setProfiles(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tax profiles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (!selectedProfile) return;
    setForm({
      name: selectedProfile.name,
      country: selectedProfile.country || 'US',
      state: selectedProfile.state || '',
      county: selectedProfile.county || '',
      city: selectedProfile.city || '',
      vatRate: String(selectedProfile.vatRate ?? 0),
      gstRate: String(selectedProfile.gstRate ?? 0),
      isActive: selectedProfile.isActive,
      lines: selectedProfile.lines.length > 0
        ? selectedProfile.lines.map((line) => ({
          label: line.label,
          rate: String(line.rate),
          appliesTo: line.appliesTo,
          order: line.order,
          isActive: line.isActive,
        }))
        : [emptyLine(0)],
    });
  }, [selectedProfile?.id]);

  const handleNew = () => {
    setSelectedId(null);
    setForm({
      name: '',
      country: 'US',
      state: '',
      county: '',
      city: '',
      vatRate: '0',
      gstRate: '0',
      isActive: true,
      lines: [emptyLine(0)],
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        lines: form.lines
          .map((line, index) => ({
            label: line.label.trim(),
            rate: Number(line.rate),
            appliesTo: line.appliesTo,
            order: index,
            isActive: line.isActive,
          }))
          .filter((line) => line.label && Number.isFinite(line.rate) && line.rate > 0),
      };

      const response = await fetch(
        selectedId ? `/api/admin/tax-profiles/${selectedId}` : '/api/admin/tax-profiles',
        {
          method: selectedId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save tax profile');
      await loadProfiles();
      setSelectedId(data.id);
    } catch (err: any) {
      setError(err.message || 'Failed to save tax profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!window.confirm('Delete this tax profile? Listings using it will be unassigned.')) return;

    setIsSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/tax-profiles/${selectedId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete tax profile');
      await loadProfiles();
      handleNew();
    } catch (err: any) {
      setError(err.message || 'Failed to delete tax profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Tax Profiles</h1>
        <p className="text-sm text-slate-500">Create reusable tax rules and assign them to listings.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm h-fit">
          <button
            type="button"
            onClick={handleNew}
            className="w-full mb-3 h-11 px-3 rounded-lg border border-slate-200 text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-50 text-slate-700"
          >
            <Plus size={14} />
            New Profile
          </button>

          <div className="space-y-2">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => setSelectedId(profile.id)}
                className={`w-full text-left px-3 py-3 rounded-lg border text-sm transition-colors ${selectedId === profile.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}
              >
                <p className="font-semibold">{profile.name}</p>
                <p className={`text-xs ${selectedId === profile.id ? 'text-slate-300' : 'text-slate-500'}`}>
                  {profile.country}{profile.state ? ` • ${profile.state}` : ''}{profile.city ? ` • ${profile.city}` : ''}
                </p>
              </button>
            ))}
            {!isLoading && profiles.length === 0 && (
              <p className="text-xs text-slate-500">No tax profiles yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Profile name</span>
              <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:bg-white focus:border-slate-900 outline-none" />
            </label>
            <label className="text-sm">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">Country</span>
              <input value={form.country} onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value.toUpperCase() }))} className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:bg-white focus:border-slate-900 outline-none" />
            </label>
            <label className="text-sm">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">State/Region</span>
              <input value={form.state} onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))} className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:bg-white focus:border-slate-900 outline-none" />
            </label>
            <label className="text-sm">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">County</span>
              <input value={form.county} onChange={(e) => setForm((prev) => ({ ...prev, county: e.target.value }))} className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:bg-white focus:border-slate-900 outline-none" />
            </label>
            <label className="text-sm">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">City</span>
              <input value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:bg-white focus:border-slate-900 outline-none" />
            </label>
            <label className="text-sm flex items-end gap-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
              <span className="text-sm text-slate-700">Active profile</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">VAT rate (%)</span>
              <input value={form.vatRate} onChange={(e) => setForm((prev) => ({ ...prev, vatRate: e.target.value }))} className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:bg-white focus:border-slate-900 outline-none" />
            </label>
            <label className="text-sm">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-2">GST rate (%)</span>
              <input value={form.gstRate} onChange={(e) => setForm((prev) => ({ ...prev, gstRate: e.target.value }))} className="w-full h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:bg-white focus:border-slate-900 outline-none" />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">Tax lines</h2>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, lines: [...prev.lines, emptyLine(prev.lines.length)] }))}
                className="text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                + Add line
              </button>
            </div>
            {form.lines.map((line, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-[1.4fr,.7fr,.9fr,auto] gap-2 items-center rounded-xl border border-slate-200 bg-slate-50 p-3">
                <input
                  value={line.label}
                  onChange={(e) => {
                    const lines = [...form.lines];
                    lines[index].label = e.target.value;
                    setForm((prev) => ({ ...prev, lines }));
                  }}
                  placeholder="Tax label"
                  className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-900 outline-none"
                />
                <input
                  value={line.rate}
                  onChange={(e) => {
                    const lines = [...form.lines];
                    lines[index].rate = e.target.value;
                    setForm((prev) => ({ ...prev, lines }));
                  }}
                  placeholder="Rate %"
                  className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-900 outline-none"
                />
                <select
                  value={line.appliesTo}
                  onChange={(e) => {
                    const lines = [...form.lines];
                    lines[index].appliesTo = e.target.value as TaxLine['appliesTo'];
                    setForm((prev) => ({ ...prev, lines }));
                  }}
                  className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-900 outline-none"
                >
                  <option value="ALL">All charges</option>
                  <option value="NIGHTLY">Nightly only</option>
                  <option value="CLEANING">Cleaning only</option>
                  <option value="SERVICE">Service only</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const lines = form.lines.filter((_, i) => i !== index);
                    setForm((prev) => ({ ...prev, lines: lines.length > 0 ? lines : [emptyLine(0)] }));
                  }}
                  className="h-11 rounded-lg border border-red-200 text-red-600 px-3 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="h-11 px-4 rounded-lg bg-slate-950 text-white text-sm font-medium hover:bg-slate-900 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={14} />
              {isSaving ? 'Saving...' : 'Save profile'}
            </button>
            {selectedId && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving}
                className="h-11 px-4 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
