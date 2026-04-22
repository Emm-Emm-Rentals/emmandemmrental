import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { format, eachDayOfInterval, parseISO, subDays } from 'date-fns';

export const runtime = 'nodejs';

// Returns blocked dates for a listing based on existing DB reservations.
// Used when the listing has no lodgifyPropertyId — mirrors what the Lodgify
// availability endpoint provides but sourced from our own Reservation table.
export async function GET(request: NextRequest) {
  const listingId = request.nextUrl.searchParams.get('listingId');
  const startDate = request.nextUrl.searchParams.get('startDate');
  const endDate = request.nextUrl.searchParams.get('endDate');

  if (!listingId || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'listingId, startDate and endDate are required' },
      { status: 400 }
    );
  }

  let rangeStart: Date;
  let rangeEnd: Date;
  try {
    rangeStart = parseISO(startDate);
    rangeEnd = parseISO(endDate);
  } catch {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  // Fetch all active (non-cancelled) reservations that overlap the requested window.
  const reservations = await prisma.reservation.findMany({
    where: {
      listingId,
      paymentStatus: { not: 'cancelled' },
      // Overlap: reservation starts before window end AND reservation ends after window start
      startDate: { lt: rangeEnd },
      endDate: { gt: rangeStart },
    },
    select: {
      startDate: true,
      endDate: true,
    },
  });

  // Build a flat list of blocked date strings (yyyy-MM-dd).
  // Convention: block from check-in through the day before check-out.
  // The checkout day itself is free for a new check-in (same as Lodgify behaviour).
  const blockedSet = new Set<string>();
  for (const res of reservations) {
    const blockEnd = subDays(res.endDate, 1);
    if (res.startDate <= blockEnd) {
      eachDayOfInterval({ start: res.startDate, end: blockEnd }).forEach(day =>
        blockedSet.add(format(day, 'yyyy-MM-dd'))
      );
    }
  }

  return NextResponse.json({ blockedDates: Array.from(blockedSet) });
}
