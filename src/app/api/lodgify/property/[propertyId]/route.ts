import { NextResponse } from 'next/server';
import { getLodgifyPropertyInfo } from '@/lib/lodgify';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params;

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 });
    }

    console.log('[emm][lodgify][property] incoming', { propertyId });

    const property = await getLodgifyPropertyInfo(propertyId);
    console.log('[emm][lodgify][property] success', {
      propertyId,
      topLevelKeys:
        property && typeof property === 'object' ? Object.keys(property).slice(0, 10) : [],
    });
    return NextResponse.json(property);
  } catch (error: any) {
    console.error('Lodgify property info error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch Lodgify property info' },
      { status: 500 }
    );
  }
}
