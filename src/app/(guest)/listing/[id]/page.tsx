import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ListingDetailClient from '@/components/pages/ListingDetailClient';
import { DEFAULT_POLICY_BY_KEY, POLICY_KEYS } from '@/lib/policies';

type Highlight = string | { title: string; description?: string };

const normalizeHighlights = (input: unknown): Highlight[] => {
  if (!Array.isArray(input)) return [];

  const highlights: Highlight[] = [];
  for (const item of input) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed) highlights.push(trimmed);
      continue;
    }

    if (item && typeof item === 'object') {
      const title = (item as { title?: unknown }).title;
      if (typeof title === 'string' && title.trim()) {
        const description = (item as { description?: unknown }).description;
        highlights.push(
          typeof description === 'string' && description.trim()
            ? { title: title.trim(), description: description.trim() }
            : { title: title.trim() }
        );
      }
    }
  }

  return highlights;
};

export const dynamic = 'force-dynamic';

async function withPrismaPoolRetry<T>(run: () => Promise<T>, retries = 1, delayMs = 250): Promise<T> {
  try {
    return await run();
  } catch (error: any) {
    if (retries > 0 && error?.code === 'P2024') {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return withPrismaPoolRetry(run, retries - 1, delayMs);
    }
    throw error;
  }
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [listing, paymentPolicyDoc] = await Promise.all([
    withPrismaPoolRetry(() =>
      prisma.listing.findUnique({
        where: { id },
        include: {
          images: { orderBy: { order: 'asc' } },
          advantages: { orderBy: { order: 'asc' } },
          bedrooms: { orderBy: { order: 'asc' } },
          reviews: {
            include: { user: { select: { name: true, image: true } } },
            orderBy: { createdAt: 'desc' },
          },
          taxProfile: { include: { lines: { orderBy: { order: 'asc' } } } },
        },
      })
    ),
    prisma.policyDocument.findFirst({
      where: { policyKey: POLICY_KEYS.PAYMENT_POLICY },
      orderBy: { version: 'desc' },
    }),
  ]);

  if (!listing) {
    notFound();
  }

  const paymentPolicyContent =
    paymentPolicyDoc?.content ?? DEFAULT_POLICY_BY_KEY[POLICY_KEYS.PAYMENT_POLICY].content;

  const serialized = {
    ...listing,
    subtitle: listing.subtitle ?? '',
    mapIframe: listing.mapIframe ?? null,
    amenities: listing.amenities ?? [],
    rules: listing.rules ?? [],
    highlights: normalizeHighlights(listing.highlights),
    reviews: listing.reviews.map((review) => ({
      ...review,
      user: {
        name: review.user.name || 'Anonymous',
        image: review.user.image,
      },
      createdAt: review.createdAt.toISOString(),
    })),
    bedrooms: listing.bedrooms.map((bedroom) => ({
      ...bedroom,
      imageUrl: bedroom.imageUrl ?? null,
      createdAt: bedroom.createdAt.toISOString(),
    })),
    advantages: listing.advantages.map((adv) => ({
      ...adv,
      iconUrl: adv.iconUrl ?? null,
    })),
  };

  return (
    <ListingDetailClient
      listing={serialized}
      paymentPolicyContent={paymentPolicyContent}
    />
  );
}
