import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 6;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const listingId =
      typeof body?.listingId === 'string' && body.listingId.trim() ? body.listingId.trim() : null;
    const lodgifyPropertyId =
      typeof body?.lodgifyPropertyId === 'string' && body.lodgifyPropertyId.trim()
        ? body.lodgifyPropertyId.trim()
        : null;
    const redirectPath =
      typeof body?.redirectPath === 'string' && body.redirectPath.trim()
        ? body.redirectPath.trim()
        : '/trips/upcoming';

    if (!listingId) {
      return NextResponse.json({ error: 'listingId is required' }, { status: 400 });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        lodgifyPropertyId: true,
      },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const userId = (session.user as any).id as string;
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + DEFAULT_SESSION_TTL_MS);

    const bookingSession = await prisma.lodgifyBookingSession.create({
      data: {
        token,
        userId,
        listingId: listing.id,
        lodgifyPropertyId: lodgifyPropertyId || listing.lodgifyPropertyId || null,
        redirectPath,
        expiresAt,
      },
      select: {
        token: true,
        expiresAt: true,
        redirectPath: true,
      },
    });

    return NextResponse.json(bookingSession, { status: 201 });
  } catch (error: any) {
    console.error('Create Lodgify booking session error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create Lodgify booking session' },
      { status: 500 }
    );
  }
}
