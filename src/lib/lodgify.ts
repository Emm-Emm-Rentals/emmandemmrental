import { prisma } from '@/lib/prisma';

export type UnifiedReservation = {
  id: string;
  source: 'lodgify' | 'local';
  status: string;
  isCanceled: boolean;
  listingId: string | null;
  externalPropertyId: string | null;
  startDate: string;
  endDate: string;
  nights: number;
  adults: number;
  children: number;
  infants: number;
  pets: number;
  totalPrice: number;
  currency: string;
  isPast: boolean;
  hasReview: boolean;
  reviewable: boolean;
  listing: {
    title: string;
    imageSrc: string;
  };
  // Deposit / balance fields (only populated for local reservations)
  paymentType?: string;
  balancePaid?: boolean;
  balanceDueAmount?: number | null;
  balanceDueDate?: string | null;
};

type LodgifyReservationRecord = {
  id: string;
  status: string;
  propertyId: string | null;
  propertyName: string;
  startDate: string;
  endDate: string;
  nights: number;
  adults: number;
  children: number;
  infants: number;
  pets: number;
  totalPrice: number;
  currency: string;
  guestEmail: string | null;
  createdAt: string | null;
};

const LODGIFY_API_BASE_URL = (
  process.env.LODGIFY_API_BASE_URL ||
  'https://api.lodgify.com'
).replace(/\/$/, '');

const FALLBACK_RESERVATION_QUERIES = [
  { path: '/v1/reservation', emailParam: 'guestEmail' },
  { path: '/v1/reservation', emailParam: 'email' },
  { path: '/v1/reservation', emailParam: null },
  { path: '/v1/reservations', emailParam: 'guestEmail' },
  { path: '/v1/reservations', emailParam: 'email' },
  { path: '/v1/bookings', emailParam: 'guestEmail' },
  { path: '/v1/bookings', emailParam: 'email' },
  { path: '/v2/reservations', emailParam: 'guestEmail' },
  { path: '/v2/bookings', emailParam: 'guestEmail' },
];

export const CANCELED_STATUSES = new Set([
  'cancelled',
  'canceled',
  'declined',
  'deleted',
  'trash',
  'trashed',
  'rejected',
]);
const LODGIFY_CANCEL_PATH_TEMPLATE =
  process.env.LODGIFY_CANCEL_PATH_TEMPLATE?.trim() || '/v1/reservation/{id}';
const LODGIFY_PROPERTY_INFO_PATH_TEMPLATE =
  process.env.LODGIFY_PROPERTY_INFO_PATH_TEMPLATE?.trim() || '/v1/properties/{id}';
const LODGIFY_PROPERTY_AVAILABILITY_PATH_TEMPLATE =
  process.env.LODGIFY_PROPERTY_AVAILABILITY_PATH_TEMPLATE?.trim() || '/v2/availability/{id}';
const LODGIFY_DAILY_RATES_PATH_TEMPLATE =
  process.env.LODGIFY_DAILY_RATES_PATH_TEMPLATE?.trim() || '/v1/rates/calendar';
const LODGIFY_DAILY_RATES_ROOM_TYPE_ID =
  process.env.LODGIFY_DAILY_RATES_ROOM_TYPE_ID?.trim() || '';
const LODGIFY_DIRECT_BOOKING_PATH =
  process.env.LODGIFY_DIRECT_BOOKING_PATH?.trim() || '/v1/reservation/booking';
const LODGIFY_DIRECT_BOOKING_ORIGIN =
  process.env.LODGIFY_DIRECT_BOOKING_ORIGIN?.trim() || 'OH';
const LODGIFY_DIRECT_BOOKING_BOOKABILITY =
  process.env.LODGIFY_DIRECT_BOOKING_BOOKABILITY?.trim() || 'InstantBooking';

const isLodgifyDebugEnabled = () =>
  process.env.LODGIFY_DEBUG === '1' || process.env.LODGIFY_DEBUG === 'true';

const logLodgifyDebug = (...args: unknown[]) => {
  if (isLodgifyDebugEnabled()) {
    console.log('[lodgify]', ...args);
  }
};

const getLodgifyApiKey = () => {
  const apiKey = process.env.LODGIFY_API_KEY;
  if (!apiKey) {
    throw new Error('Lodgify API key is not configured');
  }
  return apiKey;
};

const buildTemplateUrl = (template: string, replacements: Record<string, string> = {}) => {
  const path = Object.entries(replacements).reduce((current, [key, value]) => {
    return current.replace(`{${key}}`, encodeURIComponent(value));
  }, template);

  return path.startsWith('http') ? path : `${LODGIFY_API_BASE_URL}${path}`;
};

const fetchLodgifyJson = async (url: string) => {
  return fetchLodgifyUrl(url, { method: 'GET' });
};

const fetchLodgifyUrl = async (
  url: string,
  init: RequestInit = {}
) => {
  const response = await fetch(url, {
    method: init.method || 'GET',
    body: init.body,
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'X-ApiKey': getLodgifyApiKey(),
    },
    cache: 'no-store',
  });

  const responseText = await response.text();
  let payload: any = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = responseText;
    }
  }

  if (!response.ok) {
    const message =
      (typeof payload === 'object' && payload && (payload.error || payload.message)) ||
      (typeof payload === 'string' && payload) ||
      `Lodgify responded with ${response.status}`;
    throw new Error(message);
  }

  return payload;
};

const postLodgifyJson = async (url: string, body: unknown) => {
  return fetchLodgifyUrl(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

const parseDate = (value: unknown) => {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? null : date;
};

const calculateNights = (startDate: Date, endDate: Date) => {
  const difference = endDate.getTime() - startDate.getTime();
  return Math.max(1, Math.ceil(difference / (1000 * 60 * 60 * 24)));
};

const getString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
};

const getNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return 0;
};

const getNestedValue = (source: any, paths: string[]) => {
  for (const path of paths) {
    const value = path.split('.').reduce<any>((acc, key) => acc?.[key], source);
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
};

const extractCollection = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  const candidates = [
    payload?.data,
    payload?.items,
    payload?.results,
    payload?.reservations,
    payload?.bookings,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
};

const normalizeLodgifyReservation = (
  reservation: any,
  requestedEmail: string,
  requireGuestEmailMatch: boolean
): LodgifyReservationRecord | null => {
  const startValue = getNestedValue(reservation, [
    'arrival',
    'checkIn',
    'check_in',
    'dateArrival',
    'startDate',
    'start_date',
  ]);
  const endValue = getNestedValue(reservation, [
    'departure',
    'checkOut',
    'check_out',
    'dateDeparture',
    'endDate',
    'end_date',
  ]);

  const startDate = parseDate(startValue);
  const endDate = parseDate(endValue);
  if (!startDate || !endDate) {
    return null;
  }

  const guestEmail = getString(
    getNestedValue(reservation, [
      'guest.email',
      'guestEmail',
      'customer.email',
      'customerEmail',
      'email',
    ])
  );

  const normalizedRequestedEmail = requestedEmail.trim().toLowerCase();
  const normalizedGuestEmail = guestEmail?.trim().toLowerCase() || null;

  if (!normalizedGuestEmail) {
    logLodgifyDebug('dropping reservation without guest email', {
      reservationId: reservation?.id ?? reservation?.bookingId ?? reservation?.reservationId ?? null,
      requestedEmail: normalizedRequestedEmail,
      requireGuestEmailMatch,
    });
    return null;
  }

  if (requireGuestEmailMatch && normalizedGuestEmail !== normalizedRequestedEmail) {
    logLodgifyDebug('dropping reservation for different guest email', {
      reservationId: reservation?.id ?? reservation?.bookingId ?? reservation?.reservationId ?? null,
      guestEmail: normalizedGuestEmail,
      requestedEmail: normalizedRequestedEmail,
      requireGuestEmailMatch,
    });
    return null;
  }

  const id = getString(reservation.id, reservation.bookingId, reservation.reservationId);
  if (!id) {
    return null;
  }

  return {
    id,
    status:
      getString(reservation.status, reservation.bookingStatus, reservation.reservationStatus) ||
      'Unknown',
    propertyId: getString(
      getNestedValue(reservation, [
        'property.id',
        'property_id',
        'propertyId',
        'rental.id',
        'room.id',
      ])
    ),
    propertyName:
      getString(
        getNestedValue(reservation, [
          'property.name',
          'property_name',
          'propertyName',
          'accommodationName',
          'rental.name',
          'room.name',
          'name',
        ])
      ) || 'Lodgify Reservation',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    nights: Math.max(
      1,
      getNumber(
        reservation.nights,
        reservation.numberOfNights,
        calculateNights(startDate, endDate)
      )
    ),
    adults: getNumber(
      reservation.adults,
      getNestedValue(reservation, ['guests.adults', 'total_guest_breakdown.adults'])
    ),
    children: getNumber(
      reservation.children,
      getNestedValue(reservation, ['guests.children', 'total_guest_breakdown.children'])
    ),
    infants: getNumber(
      reservation.infants,
      getNestedValue(reservation, ['guests.infants', 'total_guest_breakdown.infants'])
    ),
    pets: getNumber(
      reservation.pets,
      getNestedValue(reservation, ['guests.pets', 'total_guest_breakdown.pets'])
    ),
    totalPrice: getNumber(
      reservation.totalPrice,
      reservation.total_amount,
      getNestedValue(reservation, ['pricing.total', 'price.total', 'amount'])
    ),
    currency:
      getString(
        reservation.currency,
        getNestedValue(reservation, ['currency.code']),
        getNestedValue(reservation, ['pricing.currency', 'price.currency'])
      ) || 'USD',
    guestEmail,
    createdAt: getString(reservation.created_at, reservation.createdAt, reservation.inserted_at),
  };
};

async function fetchLodgifyReservationsRaw({
  email,
}: {
  email?: string | null;
} = {}) {
  if (!process.env.LODGIFY_API_KEY) {
    return [] as any[];
  }

  const configuredPath = process.env.LODGIFY_RESERVATIONS_PATH?.trim();
  const rawConfiguredEmailParam = process.env.LODGIFY_RESERVATION_EMAIL_PARAM?.trim();
  const configuredEmailParam =
    rawConfiguredEmailParam === 'none' ? null : rawConfiguredEmailParam || 'guestEmail';
  const queries = configuredPath
    ? [{ path: configuredPath.startsWith('/') ? configuredPath : `/${configuredPath}`, emailParam: configuredEmailParam }]
    : FALLBACK_RESERVATION_QUERIES;
  const pageSize = 50;
  const maxPages = 4;

  for (const query of queries) {
    try {
      const reservations: any[] = [];
      const seenIds = new Set<string>();
      const requireGuestEmailMatch = Boolean(email) && !query.emailParam;

      logLodgifyDebug('starting raw query', {
        email: email || null,
        path: query.path,
        emailParam: query.emailParam,
        requireGuestEmailMatch,
      });

      for (let page = 0; page < maxPages; page += 1) {
        const url = new URL(`${LODGIFY_API_BASE_URL}${query.path}`);
        url.searchParams.set('offset', String(page * pageSize));
        url.searchParams.set('limit', String(pageSize));
        url.searchParams.set('trash', 'false');

        if (email && query.emailParam) {
          url.searchParams.set(query.emailParam, email);
        }

        const response = await fetch(url.toString(), {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-ApiKey': getLodgifyApiKey(),
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Lodgify responded with ${response.status}`);
        }

        const payload = await response.json();
        const rawItems = extractCollection(payload);

        const pageItems = requireGuestEmailMatch && email
          ? rawItems.filter((reservation: any) => {
              const reservationEmail = getString(
                getNestedValue(reservation, [
                  'guest.email',
                  'guestEmail',
                  'customer.email',
                  'customerEmail',
                  'email',
                ])
              )?.trim().toLowerCase();

              return reservationEmail === email.trim().toLowerCase();
            })
          : rawItems;

        for (const reservation of pageItems) {
          const reservationId = getString(
            reservation?.id,
            reservation?.bookingId,
            reservation?.reservationId
          );
          if (!reservationId || seenIds.has(reservationId)) {
            continue;
          }
          seenIds.add(reservationId);
          reservations.push(reservation);
        }

        if (rawItems.length < pageSize) {
          break;
        }
      }

      if (reservations.length > 0 || configuredPath) {
        return reservations;
      }
    } catch (error) {
      console.error('Lodgify raw reservation fetch failed:', error);
    }
  }

  return [] as any[];
}

async function fetchLodgifyReservationsByEmail(email: string) {
  if (!email) {
    return [] as LodgifyReservationRecord[];
  }
  const rawReservations = await fetchLodgifyReservationsRaw({ email });
  const reservations = rawReservations
    .map((reservation) => normalizeLodgifyReservation(reservation, email, true))
    .filter((reservation): reservation is LodgifyReservationRecord => Boolean(reservation));

  logLodgifyDebug('returning reservations by email', {
    email,
    count: reservations.length,
    reservations: reservations.map((reservation) => ({
      id: reservation.id,
      email: reservation.guestEmail,
      status: reservation.status,
      propertyId: reservation.propertyId,
      startDate: reservation.startDate,
      endDate: reservation.endDate,
      createdAt: reservation.createdAt,
    })),
  });

  return reservations;
}

export async function fetchLodgifyReservationsByIds(ids: string[]) {
  if (!ids.length) {
    return [] as LodgifyReservationRecord[];
  }

  const wantedIds = new Set(ids);
  const rawReservations = await fetchLodgifyReservationsRaw();

  return rawReservations
    .filter((reservation) =>
      wantedIds.has(getString(reservation?.id, reservation?.bookingId, reservation?.reservationId) || '')
    )
    .map((reservation) => normalizeLodgifyReservation(reservation, '', false))
    .filter((reservation): reservation is LodgifyReservationRecord => Boolean(reservation));
}

export async function claimLatestLodgifyReservationForSession(
  token: string,
  fallbackEmail?: string | null
) {
  const bookingSession = await prisma.lodgifyBookingSession.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!bookingSession) {
    throw new Error('Booking session not found');
  }

  if (bookingSession.claimedAt && bookingSession.lodgifyReservationId) {
    return bookingSession;
  }

  if (bookingSession.expiresAt < new Date()) {
    throw new Error('Booking session expired');
  }

  const claimedIds = new Set(
    (
      await prisma.lodgifyBookingSession.findMany({
        where: {
          lodgifyReservationId: { not: null },
        },
        select: {
          lodgifyReservationId: true,
        },
      })
    )
      .map((item) => item.lodgifyReservationId)
      .filter((value): value is string => Boolean(value))
  );

  const rawReservations = await fetchLodgifyReservationsRaw();
  const normalizedUserEmail =
    fallbackEmail?.trim().toLowerCase() ||
    bookingSession.user.email?.trim().toLowerCase() ||
    null;
  const createdAfter = bookingSession.createdAt.getTime() - 1000 * 60 * 20;

  const candidates = rawReservations
    .map((reservation) => normalizeLodgifyReservation(reservation, '', false))
    .filter((reservation): reservation is LodgifyReservationRecord => Boolean(reservation))
    .filter((reservation) => !claimedIds.has(reservation.id))
    .filter((reservation) =>
      bookingSession.lodgifyPropertyId ? reservation.propertyId === bookingSession.lodgifyPropertyId : true
    )
    .filter((reservation) => {
      if (!reservation.createdAt) return true;
      const createdAt = new Date(reservation.createdAt).getTime();
      return !Number.isNaN(createdAt) && createdAt >= createdAfter;
    })
    .sort((a, b) => {
      const aEmailMatch =
        normalizedUserEmail && a.guestEmail?.trim().toLowerCase() === normalizedUserEmail ? 1 : 0;
      const bEmailMatch =
        normalizedUserEmail && b.guestEmail?.trim().toLowerCase() === normalizedUserEmail ? 1 : 0;

      if (aEmailMatch !== bEmailMatch) {
        return bEmailMatch - aEmailMatch;
      }

      const aCreatedAt = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreatedAt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bCreatedAt - aCreatedAt;
    });

  const selectedReservation = candidates[0];

  if (!selectedReservation) {
    throw new Error('No matching Lodgify reservation found yet');
  }

  return prisma.lodgifyBookingSession.update({
    where: { id: bookingSession.id },
    data: {
      lodgifyReservationId: selectedReservation.id,
      guestEmail: selectedReservation.guestEmail,
      claimedAt: new Date(),
    },
  });
}

function buildLodgifyCancelUrl(reservationId: string) {
  const template = LODGIFY_CANCEL_PATH_TEMPLATE;

  if (template.includes('{id}')) {
    return `${LODGIFY_API_BASE_URL}${template.replace('{id}', encodeURIComponent(reservationId))}`;
  }

  const url = new URL(
    `${LODGIFY_API_BASE_URL}${template.startsWith('/') ? template : `/${template}`}`
  );
  url.searchParams.set('id', reservationId);
  return url.toString();
}

export async function cancelLodgifyReservationById(reservationId: string) {
  // We DECLINE (status update) rather than DELETE so the record is preserved in Lodgify.
  // PUT /v1/reservation/{id} with status "Declined" keeps the booking history intact
  // and frees the dates on the Lodgify calendar.
  const url = buildLodgifyCancelUrl(reservationId);
  logLodgifyDebug('declining reservation', { reservationId, url });

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'X-ApiKey': getLodgifyApiKey(),
    },
    body: JSON.stringify({ status: 'Declined' }),
    cache: 'no-store',
  });

  let payload: any = null;
  const responseText = await response.text();
  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = responseText;
    }
  }

  logLodgifyDebug('decline response', {
    reservationId,
    status: response.status,
    payload,
  });

  if (!response.ok) {
    const message =
      (typeof payload === 'object' && payload && (payload.error || payload.message)) ||
      (typeof payload === 'string' && payload) ||
      `Lodgify responded with ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export async function getUnifiedReservationsForUser(userId: string, email?: string | null) {
  logLodgifyDebug('building unified reservations', { userId, email });
  const localReservations = await prisma.reservation.findMany({
    where: { userId },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          imageSrc: true,
          lodgifyPropertyId: true,
        },
      },
    },
    orderBy: { startDate: 'desc' },
  });

  const reviewedListingIds = await prisma.review.findMany({
    where: { userId },
    select: { listingId: true },
  });
  const reviewedSet = new Set(reviewedListingIds.map((review) => review.listingId));
  const now = new Date();
  const linkedBookingSessions = await prisma.lodgifyBookingSession.findMany({
    where: {
      userId,
      lodgifyReservationId: { not: null },
    },
    select: {
      lodgifyReservationId: true,
    },
  });
  const linkedReservationIds = linkedBookingSessions
    .map((session) => session.lodgifyReservationId)
    .filter((value): value is string => Boolean(value));

  const reservationsByEmail = email ? await fetchLodgifyReservationsByEmail(email) : [];
  const linkedOnlyIds = linkedReservationIds.filter(
    (reservationId) => !reservationsByEmail.some((reservation) => reservation.id === reservationId)
  );
  const linkedReservations =
    linkedOnlyIds.length > 0 ? await fetchLodgifyReservationsByIds(linkedOnlyIds) : [];
  const lodgifyReservations = [...reservationsByEmail, ...linkedReservations];
  const lodgifyReservationById = new Map(
    lodgifyReservations.map((reservation) => [reservation.id, reservation])
  );
  const localLodgifyIds = new Set(
    localReservations
      .map((reservation) => reservation.lodgifyReservationId)
      .filter((value): value is string => Boolean(value))
  );
  const localStaySignatures = new Set(
    localReservations
      .map((reservation) => {
        const propertyId = reservation.listing?.lodgifyPropertyId || null;
        if (!propertyId) return null;
        return `${propertyId}|${reservation.startDate.toISOString().slice(0, 10)}|${reservation.endDate.toISOString().slice(0, 10)}`;
      })
      .filter((value): value is string => Boolean(value))
  );

  const unifiedReservations: UnifiedReservation[] = localReservations.map<UnifiedReservation>((reservation) => {
    const linkedLodgifyReservation = reservation.lodgifyReservationId
      ? lodgifyReservationById.get(reservation.lodgifyReservationId)
      : undefined;
    const ps = ((reservation as any).paymentStatus || '').toLowerCase();
    const isCanceled =
      ps === 'cancelled' ||
      ps === 'canceled' ||
      (linkedLodgifyReservation
        ? CANCELED_STATUSES.has((linkedLodgifyReservation.status || '').toLowerCase())
        : false);
    // For local reservations show a human-readable status derived from paymentStatus,
    // falling back to the linked Lodgify status, then 'Confirmed'.
    const localStatus = isCanceled
      ? 'Cancelled'
      : linkedLodgifyReservation?.status || 'Confirmed';
    const isPast = reservation.endDate < now;

    return {
      id: reservation.id,
      source: 'local',
      status: localStatus,
      isCanceled,
      listingId: reservation.listingId,
      externalPropertyId: reservation.listing?.lodgifyPropertyId || null,
      startDate: reservation.startDate.toISOString(),
      endDate: reservation.endDate.toISOString(),
      nights: reservation.nights,
      adults: reservation.adults,
      children: reservation.children,
      infants: reservation.infants,
      pets: reservation.pets,
      totalPrice: reservation.totalPrice,
      currency: reservation.paymentCurrency || 'USD',
      isPast,
      hasReview: reviewedSet.has(reservation.listingId),
      reviewable: isPast && !isCanceled,
      listing: {
        title: reservation.listing?.title || 'Listing',
        imageSrc: reservation.listing?.imageSrc || '',
      },
      paymentType: (reservation as any).paymentType ?? 'full',
      balancePaid: (reservation as any).balancePaid ?? true,
      balanceDueAmount: (reservation as any).balanceDueAmount ?? null,
      balanceDueDate: (reservation as any).balanceDueDate
        ? new Date((reservation as any).balanceDueDate).toISOString()
        : null,
    };
  });

  if (lodgifyReservations.length > 0) {
    const propertyIds = lodgifyReservations
      .map((reservation) => reservation.propertyId)
      .filter((propertyId): propertyId is string => Boolean(propertyId));

    const matchingListings = propertyIds.length
      ? await prisma.listing.findMany({
          where: { lodgifyPropertyId: { in: propertyIds } },
          select: {
            id: true,
            title: true,
            imageSrc: true,
            lodgifyPropertyId: true,
          },
        })
      : [];
      
 
    const listingByPropertyId = new Map(
      matchingListings
        .filter((listing) => listing.lodgifyPropertyId)
        .map((listing) => [listing.lodgifyPropertyId as string, listing])
    );

    const lodgifyUnifiedReservations = lodgifyReservations
      .filter((reservation) => {
        const signature = reservation.propertyId
          ? `${reservation.propertyId}|${reservation.startDate.slice(0, 10)}|${reservation.endDate.slice(0, 10)}`
          : null;
        return signature ? !localStaySignatures.has(signature) : true;
      })
      .map<UnifiedReservation>((reservation) => {
        const localListing = reservation.propertyId
          ? listingByPropertyId.get(reservation.propertyId)
          : undefined;
        const endDate = new Date(reservation.endDate);
        const isPast = endDate < now;
        const listingId = localListing?.id || null;
        const normalizedStatus = reservation.status || 'Unknown';
        const isCanceled = CANCELED_STATUSES.has(normalizedStatus.toLowerCase());

        return {
          id: reservation.id,
          source: 'lodgify',
          status: normalizedStatus,
          isCanceled,
          listingId,
          externalPropertyId: reservation.propertyId,
          startDate: reservation.startDate,
          endDate: reservation.endDate,
          nights: reservation.nights,
          adults: reservation.adults,
          children: reservation.children,
          infants: reservation.infants,
          pets: reservation.pets,
          totalPrice: reservation.totalPrice,
          currency: reservation.currency,
          isPast,
          hasReview: listingId ? reviewedSet.has(listingId) : false,
          reviewable: Boolean(listingId && isPast),
          listing: {
            title: localListing?.title || reservation.propertyName,
            imageSrc: localListing?.imageSrc || '',
          },
        };
      });

    unifiedReservations.push(...lodgifyUnifiedReservations);
  }

  logLodgifyDebug('final unified reservations', {
    userId,
    email,
    count: unifiedReservations.length,
    reservations: unifiedReservations.map((reservation) => ({
      id: reservation.id,
      source: reservation.source,
      status: reservation.status,
      isCanceled: reservation.isCanceled,
      listingId: reservation.listingId,
      externalPropertyId: reservation.externalPropertyId,
      startDate: reservation.startDate,
      endDate: reservation.endDate,
    })),
  });

  return unifiedReservations.sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
}

export async function getUnifiedReservationByIdForUser(
  userId: string,
  reservationId: string,
  email?: string | null
) {
  const reservations = await getUnifiedReservationsForUser(userId, email);
  return reservations.find((reservation) => reservation.id === reservationId) || null;
}

export async function getLodgifyPropertyInfo(propertyId: string) {
  const url = buildTemplateUrl(LODGIFY_PROPERTY_INFO_PATH_TEMPLATE, { id: propertyId });
  logLodgifyDebug('property info request', { propertyId, url });
  return fetchLodgifyJson(url);
}

export async function getLodgifyPropertyAvailability({
  propertyId,
  startDate,
  endDate,
}: {
  propertyId: string;
  startDate: string;
  endDate: string;
}) {
  const url = new URL(buildTemplateUrl(LODGIFY_PROPERTY_AVAILABILITY_PATH_TEMPLATE, { id: propertyId }));
  // Lodgify v2 availability expects `start` / `end` query params.
  // `includeDetails=false` is enough for our calendar because the booking bar
  // only needs per-period availability to disable blocked dates.
  url.searchParams.set('includeDetails', 'false');
  url.searchParams.set('start', `${startDate}T00:00:00Z`);
  url.searchParams.set('end', `${endDate}T00:00:00Z`);
  logLodgifyDebug('availability request', { propertyId, startDate, endDate, url: url.toString() });
  return fetchLodgifyJson(url.toString());
}

export async function getLodgifyDailyRates({
  propertyId,
  roomTypeId,
  startDate,
  endDate,
}: {
  propertyId: string;
  roomTypeId?: string | null;
  startDate: string;
  endDate: string;
}) {
  const url = new URL(buildTemplateUrl(LODGIFY_DAILY_RATES_PATH_TEMPLATE));
  url.searchParams.set('houseId', propertyId);
  const effectiveRoomTypeId = roomTypeId || LODGIFY_DAILY_RATES_ROOM_TYPE_ID;
  if (effectiveRoomTypeId) {
    url.searchParams.set('roomTypeId', effectiveRoomTypeId);
  }
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);
  logLodgifyDebug('daily rates request', {
    propertyId,
    roomTypeId: effectiveRoomTypeId || null,
    startDate,
    endDate,
    url: url.toString(),
  });
  return fetchLodgifyJson(url.toString());
}

export type LodgifyDirectGuestInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  locale?: string | null;
  streetAddress1?: string | null;
  streetAddress2?: string | null;
  city?: string | null;
  countryCode?: string | null;
  postalCode?: string | null;
  state?: string | null;
};

export type LodgifyDirectBookingInput = {
  propertyId: string;
  roomTypeId: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  infants: number;
  pets: number;
  total: number;
  currencyCode: string;
  guest: LodgifyDirectGuestInput;
  sourceText?: string | null;
};

export async function createLodgifyDirectBooking({
  propertyId,
  roomTypeId,
  startDate,
  endDate,
  adults,
  children,
  infants,
  pets,
  total,
  currencyCode,
  guest,
  sourceText,
}: LodgifyDirectBookingInput) {
  const url = new URL(buildTemplateUrl(LODGIFY_DIRECT_BOOKING_PATH));
  const payload = {
    guest: {
      guest_name: {
        name: guest.name,
      },
      name: guest.name,
      email: guest.email || null,
      phone: guest.phone || null,
      locale: guest.locale || 'en',
      street_address1: guest.streetAddress1 || null,
      street_address2: guest.streetAddress2 || null,
      city: guest.city || null,
      country_code: guest.countryCode || null,
      postal_code: guest.postalCode || null,
      state: guest.state || null,
    },
    rooms: [
      {
        room_type_id: Number(roomTypeId),
        guest_breakdown: {
          adults,
          children,
          infants,
          pets,
        },
      },
    ],
    property_id: Number(propertyId),
    arrival: `${startDate}T00:00:00Z`,
    departure: `${endDate}T00:00:00Z`,
    status: 'Booked',
    bookability: LODGIFY_DIRECT_BOOKING_BOOKABILITY,
    origin: LODGIFY_DIRECT_BOOKING_ORIGIN,
    total,
    currency_code: currencyCode.toUpperCase(),
    source_text: sourceText || 'Direct booking from website',
  };

  logLodgifyDebug('direct booking create request', {
    propertyId,
    roomTypeId,
    startDate,
    endDate,
    adults,
    children,
    infants,
    pets,
    total,
    currencyCode,
  });

  return postLodgifyJson(url.toString(), payload);
}

export type LodgifySyncReservationInput = {
  id: string;
  startDate: Date;
  endDate: Date;
  adults: number;
  children: number;
  infants: number;
  pets: number;
  totalPrice: number;
  paymentCurrency?: string | null;
  bookingSource?: string | null;
  primaryGuestName?: string | null;
  primaryGuestEmail?: string | null;
  primaryGuestPhone?: string | null;
  primaryGuestLocale?: string | null;
  primaryGuestStreetAddress1?: string | null;
  primaryGuestStreetAddress2?: string | null;
  primaryGuestCity?: string | null;
  primaryGuestState?: string | null;
  primaryGuestPostalCode?: string | null;
  primaryGuestCountryCode?: string | null;
  lodgifyPropertyId?: string | null;
  lodgifyRoomTypeId?: string | null;
  lodgifyReservationId?: string | null;
  lodgifySyncStatus?: string | null;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
  listing?: {
    title?: string | null;
    lodgifyPropertyId?: string | null;
    lodgifyRoomTypeId?: string | null;
  } | null;
};

const extractLodgifyReservationId = (payload: any) => {
  if (!payload) return null;
  if (typeof payload === 'number' || typeof payload === 'string') {
    return String(payload);
  }
  return getString(
    payload.id,
    payload.bookingId,
    payload.reservationId,
    payload.data?.id,
    payload.data?.bookingId,
    payload.data?.reservationId
  );
};

export async function syncReservationToLodgify(reservation: LodgifySyncReservationInput) {
  // If a Lodgify reservation ID already exists, a booking was already created in Lodgify.
  // Never create a second one — just ensure our local record reflects synced status.
  if (reservation.lodgifyReservationId) {
    const currentStatus = (reservation.lodgifySyncStatus || '').toLowerCase();
    if (currentStatus !== 'synced') {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { lodgifySyncStatus: 'synced', lodgifySyncError: null, lodgifySyncedAt: new Date() },
      });
    }
    return {
      lodgifyReservationId: reservation.lodgifyReservationId,
      lodgifySyncStatus: 'synced' as const,
      lodgifySyncError: null,
      lodgifySyncedAt: new Date(),
    };
  }

  const propertyId = reservation.lodgifyPropertyId || reservation.listing?.lodgifyPropertyId || null;
  const roomTypeId = reservation.lodgifyRoomTypeId || reservation.listing?.lodgifyRoomTypeId || null;
  if (!propertyId || !roomTypeId) {
    throw new Error('Lodgify property or room type id is missing');
  }

  const guestName =
    reservation.primaryGuestName?.trim() ||
    reservation.user?.name?.trim() ||
    reservation.user?.email?.trim() ||
    'Guest';

  const created = await createLodgifyDirectBooking({
    propertyId,
    roomTypeId,
    startDate: reservation.startDate.toISOString().slice(0, 10),
    endDate: reservation.endDate.toISOString().slice(0, 10),
    adults: reservation.adults,
    children: reservation.children,
    infants: reservation.infants,
    pets: reservation.pets,
    total: reservation.totalPrice,
    currencyCode: reservation.paymentCurrency || 'USD',
    guest: {
      name: guestName,
      email: reservation.primaryGuestEmail || reservation.user?.email || null,
      phone: reservation.primaryGuestPhone || null,
      locale: reservation.primaryGuestLocale || 'en',
      streetAddress1: reservation.primaryGuestStreetAddress1 || null,
      streetAddress2: reservation.primaryGuestStreetAddress2 || null,
      city: reservation.primaryGuestCity || null,
      state: reservation.primaryGuestState || null,
      postalCode: reservation.primaryGuestPostalCode || null,
      countryCode: reservation.primaryGuestCountryCode || null,
    },
    sourceText: reservation.bookingSource === 'direct'
      ? 'Direct booking from website'
      : 'Website booking sync',
  });

  const lodgifyReservationId = extractLodgifyReservationId(created);
  if (!lodgifyReservationId) {
    throw new Error('Lodgify booking created but no reservation id was returned');
  }

  await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      lodgifyPropertyId: propertyId,
      lodgifyRoomTypeId: roomTypeId,
      lodgifyReservationId,
      lodgifySyncStatus: 'synced',
      lodgifySyncError: null,
      lodgifySyncedAt: new Date(),
    },
  });

  return {
    lodgifyReservationId,
    lodgifySyncStatus: 'synced' as const,
    lodgifySyncError: null,
    lodgifySyncedAt: new Date(),
  };
}
