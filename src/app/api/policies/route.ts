import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_POLICY_BY_KEY, POLICY_KEYS, PolicyKey } from '@/lib/policies';

const normalizePolicyKey = (value: string | null): PolicyKey | null => {
  if (!value) return null;
  const upper = value.toUpperCase();
  if (upper === POLICY_KEYS.RENTAL_AGREEMENT || upper === POLICY_KEYS.PAYMENT_POLICY) {
    return upper as PolicyKey;
  }
  return null;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawKeys = searchParams.get('keys');
    const keys = rawKeys
      ? rawKeys.split(',').map((key) => normalizePolicyKey(key.trim())).filter(Boolean) as PolicyKey[]
      : [POLICY_KEYS.RENTAL_AGREEMENT, POLICY_KEYS.PAYMENT_POLICY];

    const policies = await prisma.policyDocument.findMany({
      where: { policyKey: { in: keys } },
      orderBy: [{ policyKey: 'asc' }, { version: 'desc' }],
    });

    const currentPolicies = keys.map((key) => {
      const policy = policies.find((item) => item.policyKey === key);
      if (policy) return policy;
      const fallback = DEFAULT_POLICY_BY_KEY[key];
      return {
        id: `default-${key}`,
        policyKey: key,
        title: fallback.title,
        content: fallback.content,
        version: 1,
        isActive: true,
        createdAt: null,
        updatedAt: null,
      };
    });

    return NextResponse.json({ policies: currentPolicies });
  } catch (error) {
    console.error('Get policies error:', error);
    return NextResponse.json({ error: 'Failed to load policies' }, { status: 500 });
  }
}
