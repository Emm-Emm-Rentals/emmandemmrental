import { NextRequest, NextResponse } from 'next/server';
import { getLodgifyPropertyAvailability } from '@/lib/lodgify';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const propertyId = request.nextUrl.searchParams.get('propertyId');
    const startDate = request.nextUrl.searchParams.get('startDate');
    const endDate = request.nextUrl.searchParams.get('endDate');

    if (!propertyId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'propertyId, startDate and endDate are required' },
        { status: 400 }
      );
    }

    console.log('[emm][lodgify][availability] incoming', {
      propertyId,
      startDate,
      endDate,
    });

    const availability = await getLodgifyPropertyAvailability({
      propertyId,
      startDate,
      endDate,
    });

    const availabilityItems = Array.isArray(availability)
      ? availability
      : availability?.data || availability?.items || availability?.results || [];
    const firstItem = Array.isArray(availabilityItems) ? availabilityItems[0] : null;
    const periods = Array.isArray(firstItem?.periods) ? firstItem.periods : [];

    console.log('[emm][lodgify][availability] success', {
      propertyId,
      startDate,
      endDate,
      topLevelKeys:
        availability && typeof availability === 'object'
          ? Object.keys(availability).slice(0, 10)
          : [],
      itemCount: Array.isArray(availabilityItems) ? availabilityItems.length : 0,
      periodCount: periods.length,
      firstPeriod:
        periods.length > 0
          ? {
              start: periods[0]?.start ?? null,
              end: periods[0]?.end ?? null,
              available: periods[0]?.available ?? null,
              hasClosedPeriod: Boolean(periods[0]?.closed_period),
              bookingsCount: Array.isArray(periods[0]?.bookings) ? periods[0].bookings.length : 0,
            }
          : null,
    });

    return NextResponse.json(availability);
  } catch (error: any) {
    console.error('Lodgify availability error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch Lodgify availability' },
      { status: 500 }
    );
  }
}
