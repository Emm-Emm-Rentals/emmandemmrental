import { NextRequest, NextResponse } from 'next/server';
import { getLodgifyDailyRates } from '@/lib/lodgify';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const propertyId = request.nextUrl.searchParams.get('propertyId');
    const roomTypeId = request.nextUrl.searchParams.get('roomTypeId');
    const startDate = request.nextUrl.searchParams.get('startDate');
    const endDate = request.nextUrl.searchParams.get('endDate');

    if (!propertyId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'propertyId, startDate and endDate are required' },
        { status: 400 }
      );
    }

    console.log('[emm][lodgify][rates] incoming', {
      propertyId,
      roomTypeId,
      startDate,
      endDate,
    });

    const rates = await getLodgifyDailyRates({
      propertyId,
      roomTypeId,
      startDate,
      endDate,
    });

    console.log('[emm][lodgify][rates] success', {
      propertyId,
      roomTypeId,
      startDate,
      endDate,
      topLevelKeys:
        rates && typeof rates === 'object'
          ? Object.keys(rates).slice(0, 10)
          : [],
    });

    return NextResponse.json(rates);
  } catch (error: any) {
    console.error('Lodgify rates error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch Lodgify rates' },
      { status: 500 }
    );
  }
}
