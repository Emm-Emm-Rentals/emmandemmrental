import { prisma } from '@/lib/prisma';
import { DEFAULT_POLICY_BY_KEY, POLICY_KEYS } from '@/lib/policies';

export default async function PaymentPolicyPage() {
  const policy = await prisma.policyDocument.findFirst({
    where: { policyKey: POLICY_KEYS.PAYMENT_POLICY, isActive: true },
    orderBy: { version: 'desc' },
  });

  const title = policy?.title || DEFAULT_POLICY_BY_KEY.PAYMENT_POLICY.title;
  const content = policy?.content || DEFAULT_POLICY_BY_KEY.PAYMENT_POLICY.content;
  const version = policy?.version || 1;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Policy document</p>
          <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500 mt-2">Version {version}</p>

          <div className="mt-8 whitespace-pre-line text-sm md:text-[15px] leading-7 text-slate-700">
            {content}
          </div>
        </div>
      </div>
    </main>
  );
}
