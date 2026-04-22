import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { adminAuthOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DEFAULT_POLICY_BY_KEY, POLICY_KEYS, PolicyKey, formatPolicyContent } from '@/lib/policies';
import { logAdminAudit } from '@/lib/admin-audit';

const normalizePolicyKey = (value: unknown): PolicyKey | null => {
  if (typeof value !== 'string') return null;
  const upper = value.toUpperCase();
  if (upper === POLICY_KEYS.RENTAL_AGREEMENT || upper === POLICY_KEYS.PAYMENT_POLICY) {
    return upper as PolicyKey;
  }
  return null;
};

export async function GET() {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const policies = await prisma.policyDocument.findMany({
      orderBy: [{ policyKey: 'asc' }, { version: 'desc' }],
    });

    const grouped = [POLICY_KEYS.RENTAL_AGREEMENT, POLICY_KEYS.PAYMENT_POLICY].map((policyKey) => {
      const policy = policies.find((item) => item.policyKey === policyKey);
      if (policy) return policy;
      const fallback = DEFAULT_POLICY_BY_KEY[policyKey];
      return {
        id: '',
        policyKey,
        title: fallback.title,
        content: fallback.content,
        version: 0,
        isActive: true,
        createdAt: null,
        updatedAt: null,
      };
    });

    return NextResponse.json({ policies: grouped });
  } catch (error) {
    console.error('Admin policies get error:', error);
    return NextResponse.json({ error: 'Failed to fetch policies' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const policyKey = normalizePolicyKey(body.policyKey);
    const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : null;
    const content = typeof body.content === 'string' ? formatPolicyContent(body.content) : '';

    if (!policyKey || !title || !content) {
      return NextResponse.json({ error: 'policyKey, title, and content are required' }, { status: 400 });
    }

    const current = await prisma.policyDocument.findFirst({
      where: { policyKey, isActive: true },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (current?.version || 0) + 1;

    if (current) {
      await prisma.policyDocument.update({
        where: { id: current.id },
        data: { isActive: false },
      });
    }

    const policy = await prisma.policyDocument.create({
      data: {
        policyKey,
        title,
        content,
        version: nextVersion,
        isActive: true,
      },
    });

    const adminId = (session.user as any).id as string;
    await logAdminAudit(adminId, 'policy_update', policy.id, 'policy', {
      policyKey,
      version: nextVersion,
      title,
    });

    return NextResponse.json({ policy }, { status: 201 });
  } catch (error) {
    console.error('Admin policies save error:', error);
    return NextResponse.json({ error: 'Failed to save policy' }, { status: 500 });
  }
}
