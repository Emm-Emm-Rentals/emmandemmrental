'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, CreditCard, Save, Sparkles } from 'lucide-react';
import { DEFAULT_POLICY_BY_KEY, POLICY_KEYS, PolicyKey } from '@/lib/policies';

type PolicyRecord = {
  id: string;
  policyKey: PolicyKey;
  title: string;
  content: string;
  version: number;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type PolicyForm = {
  policyKey: PolicyKey;
  title: string;
  content: string;
};

const sections = [
  {
    key: POLICY_KEYS.RENTAL_AGREEMENT,
    label: 'Rental Agreement',
    description: 'Guest rules, liability, conduct, occupancy, and stay terms.',
    icon: FileText,
  },
  {
    key: POLICY_KEYS.PAYMENT_POLICY,
    label: 'Payment Policy',
    description: 'Deposits, balance due, taxes, refunds, and payment terms.',
    icon: CreditCard,
  },
] as const;

const emptyForm = (policyKey: PolicyKey, fallback: { title: string; content: string }) => ({
  policyKey,
  title: fallback.title,
  content: fallback.content,
});

export default function AdminPoliciesPage() {
  const [policies, setPolicies] = useState<PolicyRecord[]>([]);
  const [activeKey, setActiveKey] = useState<PolicyKey>(POLICY_KEYS.RENTAL_AGREEMENT);
  const [form, setForm] = useState<PolicyForm>({ policyKey: POLICY_KEYS.RENTAL_AGREEMENT, title: '', content: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const activePolicy = useMemo(
    () => policies.find((policy) => policy.policyKey === activeKey) || null,
    [activeKey, policies]
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/policies');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load policies');
        setPolicies(data.policies || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load policies');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const selected = policies.find((policy) => policy.policyKey === activeKey);
    if (selected) {
      setForm({
        policyKey: selected.policyKey,
        title: selected.title,
        content: selected.content,
      });
      return;
    }
    setForm(emptyForm(activeKey, {
      title: DEFAULT_POLICY_BY_KEY[activeKey].title,
      content: DEFAULT_POLICY_BY_KEY[activeKey].content,
    }));
  }, [activeKey, policies]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const response = await fetch('/api/admin/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save policy');
      setSuccess('Policy saved successfully.');
      const refreshed = await fetch('/api/admin/policies');
      const refreshedData = await refreshed.json();
      if (refreshed.ok) setPolicies(refreshedData.policies || []);
    } catch (err: any) {
      setError(err.message || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Policies</h1>
        <p className="text-sm text-slate-500">Edit the rental agreement and payment policy shown during checkout.</p>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm h-fit">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">Documents</p>
          <div className="space-y-2">
            {sections.map((section) => {
              const policy = policies.find((item) => item.policyKey === section.key);
              const active = activeKey === section.key;
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => setActiveKey(section.key)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? 'bg-white/10' : 'bg-slate-100'}`}>
                      <section.icon size={18} className={active ? 'text-white' : 'text-slate-600'} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{section.label}</p>
                      <p className={`text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>{section.description}</p>
                    </div>
                  </div>
                  <div className={`mt-3 text-[11px] uppercase tracking-[0.18em] ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                    Version {policy?.version || 0}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{activeKey}</p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">{form.title || 'Untitled policy'}</h2>
              </div>
              {activePolicy && (
                <div className="text-xs text-slate-500">
                  Active version {activePolicy.version}
                </div>
              )}
            </div>

            <div className="grid gap-4">
              <label className="space-y-2">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Title</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-slate-900"
                />
              </label>
              <label className="space-y-2">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Content</span>
                <textarea
                  rows={24}
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-slate-900 leading-6"
                />
              </label>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="h-11 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Save size={14} />
                {saving ? 'Saving...' : 'Save new version'}
              </button>
                <button
                  type="button"
                  onClick={() => setForm(emptyForm(activeKey, {
                  title: DEFAULT_POLICY_BY_KEY[activeKey].title,
                  content: DEFAULT_POLICY_BY_KEY[activeKey].content,
                }))}
                className="h-11 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Reset to default
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-slate-500" />
              <p className="text-sm font-medium text-slate-900">Live preview</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 whitespace-pre-line text-sm leading-7 text-slate-700 max-h-[420px] overflow-y-auto">
              {form.content || 'No content yet.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
