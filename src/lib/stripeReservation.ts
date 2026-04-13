import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { calculateNights, parseDate } from "@/lib/booking";
import { stripe } from "@/lib/stripe";
import { calculateStayPricingBreakdown } from "@/lib/pricing";
import { syncReservationToLodgify } from "@/lib/lodgify";

type ReservationSyncTarget = {
    id: string;
    bookingSource?: string | null;
    totalPrice: number;
    paymentCurrency?: string | null;
    startDate: Date;
    endDate: Date;
    adults: number;
    children: number;
    infants: number;
    pets: number;
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
    agreementPolicyId?: string | null;
    agreementPolicyVersion?: number | null;
    agreementPolicyTitle?: string | null;
    agreementAcceptedAt?: Date | null;
    paymentPolicyId?: string | null;
    paymentPolicyVersion?: number | null;
    paymentPolicyTitle?: string | null;
    paymentPolicyAcceptedAt?: Date | null;
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

const extractMetadataGuest = (metadata: Record<string, string>) => ({
    primaryGuestName: metadata.primaryGuestName || null,
    primaryGuestEmail: metadata.primaryGuestEmail || null,
    primaryGuestPhone: metadata.primaryGuestPhone || null,
    primaryGuestLocale: metadata.primaryGuestLocale || null,
    primaryGuestStreetAddress1: metadata.primaryGuestStreetAddress1 || null,
    primaryGuestStreetAddress2: metadata.primaryGuestStreetAddress2 || null,
    primaryGuestCity: metadata.primaryGuestCity || null,
    primaryGuestState: metadata.primaryGuestState || null,
    primaryGuestPostalCode: metadata.primaryGuestPostalCode || null,
    primaryGuestCountryCode: metadata.primaryGuestCountryCode || null,
    agreementPolicyId: metadata.agreementPolicyId || null,
    agreementPolicyVersion: metadata.agreementPolicyVersion ? Number(metadata.agreementPolicyVersion) : null,
    agreementPolicyTitle: metadata.agreementPolicyTitle || null,
    agreementAcceptedAt: metadata.agreementPolicyId ? new Date() : null,
    paymentPolicyId: metadata.paymentPolicyId || null,
    paymentPolicyVersion: metadata.paymentPolicyVersion ? Number(metadata.paymentPolicyVersion) : null,
    paymentPolicyTitle: metadata.paymentPolicyTitle || null,
    paymentPolicyAcceptedAt: metadata.paymentPolicyId ? new Date() : null,
});

const buildReservationSyncTarget = (reservation: any): ReservationSyncTarget => ({
    id: reservation.id,
    bookingSource: reservation.bookingSource,
    totalPrice: reservation.totalPrice,
    paymentCurrency: reservation.paymentCurrency,
    startDate: reservation.startDate,
    endDate: reservation.endDate,
    adults: reservation.adults,
    children: reservation.children,
    infants: reservation.infants,
    pets: reservation.pets,
    primaryGuestName: reservation.primaryGuestName,
    primaryGuestEmail: reservation.primaryGuestEmail,
    primaryGuestPhone: reservation.primaryGuestPhone,
    primaryGuestLocale: reservation.primaryGuestLocale,
    primaryGuestStreetAddress1: reservation.primaryGuestStreetAddress1,
    primaryGuestStreetAddress2: reservation.primaryGuestStreetAddress2,
    primaryGuestCity: reservation.primaryGuestCity,
    primaryGuestState: reservation.primaryGuestState,
    primaryGuestPostalCode: reservation.primaryGuestPostalCode,
    primaryGuestCountryCode: reservation.primaryGuestCountryCode,
    agreementPolicyId: reservation.agreementPolicyId,
    agreementPolicyVersion: reservation.agreementPolicyVersion,
    agreementPolicyTitle: reservation.agreementPolicyTitle,
    agreementAcceptedAt: reservation.agreementAcceptedAt,
    paymentPolicyId: reservation.paymentPolicyId,
    paymentPolicyVersion: reservation.paymentPolicyVersion,
    paymentPolicyTitle: reservation.paymentPolicyTitle,
    paymentPolicyAcceptedAt: reservation.paymentPolicyAcceptedAt,
    lodgifyPropertyId: reservation.lodgifyPropertyId,
    lodgifyRoomTypeId: reservation.lodgifyRoomTypeId,
    lodgifyReservationId: reservation.lodgifyReservationId,
    lodgifySyncStatus: reservation.lodgifySyncStatus,
    user: reservation.user
      ? {
          name: reservation.user.name,
          email: reservation.user.email,
        }
      : null,
    listing: reservation.listing
      ? {
          title: reservation.listing.title,
          lodgifyPropertyId: reservation.listing.lodgifyPropertyId,
          lodgifyRoomTypeId: reservation.listing.lodgifyRoomTypeId,
        }
      : null,
});

async function refreshReservationSyncState(reservationId: string, status: "synced" | "failed", error: string | null) {
    return prisma.reservation.update({
        where: { id: reservationId },
        data: {
            lodgifySyncStatus: status,
            lodgifySyncError: error,
            lodgifySyncedAt: status === "synced" ? new Date() : null,
        },
    });
}

export const upsertReservationFromCheckoutSession = async (
    session: Stripe.Checkout.Session
) => {
    if (session.payment_status !== "paid") return null;
    if (!session.id) return null;

    const metadata = session.metadata || {};
    const listingId = metadata.listingId;
    const userId = metadata.userId;
    const startDate = metadata.startDate;
    const endDate = metadata.endDate;
    const guestFields = extractMetadataGuest(metadata as Record<string, string>);

    if (!listingId || !userId || !startDate || !endDate) return null;

    // Deposit / payment-type fields from metadata
    const paymentType = metadata.paymentType || "full";
    const depositAmountCents = metadata.depositAmountCents ? parseInt(metadata.depositAmountCents, 10) : null;
    const balanceDueAmountCents = metadata.balanceDueAmountCents ? parseInt(metadata.balanceDueAmountCents, 10) : null;
    const balanceDueDate = metadata.balanceDueDate ? new Date(metadata.balanceDueDate) : null;
    const isDepositBooking = paymentType === "deposit";

    let paymentIntent: Stripe.PaymentIntent | null = null;
    if (session.payment_intent) {
        paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string, {
            expand: ["latest_charge.balance_transaction", "payment_method"],
        });
    }

    let charge: Stripe.Charge | null = null;
    if (paymentIntent?.latest_charge) {
        if (typeof paymentIntent.latest_charge === "string") {
            charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
        } else {
            charge = paymentIntent.latest_charge as Stripe.Charge;
        }
    }

    const card = charge?.payment_method_details?.card;
    const amountPaid = paymentIntent?.amount_received ?? charge?.amount ?? 0;
    const currency = (paymentIntent?.currency || session.currency || "usd").toLowerCase();
    const paymentStatus = paymentIntent?.status || session.payment_status || "paid";

    // For deposit bookings: capture the Stripe Customer and saved PaymentMethod
    // so we can charge the balance off-session 60 days before arrival.
    const stripeCustomerId = isDepositBooking
        ? (typeof session.customer === "string" ? session.customer : (session.customer as any)?.id ?? null)
        : null;
    const stripePaymentMethodId = isDepositBooking
        ? (typeof paymentIntent?.payment_method === "string"
            ? paymentIntent.payment_method
            : (paymentIntent?.payment_method as any)?.id ?? null)
        : null;

    const existing = await prisma.reservation.findFirst({
        where: { stripeSessionId: session.id },
        include: {
            listing: {
                select: {
                    id: true,
                    title: true,
                    subtitle: true,
                    imageSrc: true,
                    locationValue: true,
                    lodgifyPropertyId: true,
                    lodgifyRoomTypeId: true,
                },
            },
            user: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
    });

    if (existing) {
        const needsUpdate =
            !existing.cardBrand ||
            !existing.cardLast4 ||
            !existing.cardExpMonth ||
            !existing.cardExpYear ||
            !existing.stripeChargeId ||
            !existing.stripeBalanceTransactionId;

        const updated = needsUpdate
            ? await prisma.reservation.update({
                where: { id: existing.id },
                data: {
                    stripePaymentIntentId: paymentIntent?.id || existing.stripePaymentIntentId,
                    stripeChargeId: charge?.id || existing.stripeChargeId,
                    stripeBalanceTransactionId:
                        typeof charge?.balance_transaction === "string"
                            ? charge?.balance_transaction
                            : (charge?.balance_transaction as any)?.id || existing.stripeBalanceTransactionId,
                    paymentStatus: paymentStatus || existing.paymentStatus,
                    paymentCurrency: currency || existing.paymentCurrency,
                    amountPaid: amountPaid || existing.amountPaid,
                    cardBrand: card?.brand || existing.cardBrand,
                    cardLast4: card?.last4 || existing.cardLast4,
                    cardExpMonth: card?.exp_month || existing.cardExpMonth,
                    cardExpYear: card?.exp_year || existing.cardExpYear,
                    primaryGuestName: guestFields.primaryGuestName || existing.primaryGuestName,
                    primaryGuestEmail: guestFields.primaryGuestEmail || existing.primaryGuestEmail,
                    primaryGuestPhone: guestFields.primaryGuestPhone || existing.primaryGuestPhone,
                    primaryGuestLocale: guestFields.primaryGuestLocale || existing.primaryGuestLocale,
                    primaryGuestStreetAddress1: guestFields.primaryGuestStreetAddress1 || existing.primaryGuestStreetAddress1,
                    primaryGuestStreetAddress2: guestFields.primaryGuestStreetAddress2 || existing.primaryGuestStreetAddress2,
                    primaryGuestCity: guestFields.primaryGuestCity || existing.primaryGuestCity,
                    primaryGuestState: guestFields.primaryGuestState || existing.primaryGuestState,
                    primaryGuestPostalCode: guestFields.primaryGuestPostalCode || existing.primaryGuestPostalCode,
                    primaryGuestCountryCode: guestFields.primaryGuestCountryCode || existing.primaryGuestCountryCode,
                },
                include: {
                    listing: {
                        select: {
                            id: true,
                            title: true,
                            subtitle: true,
                            imageSrc: true,
                            locationValue: true,
                            lodgifyPropertyId: true,
                            lodgifyRoomTypeId: true,
                        },
                    },
                    user: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
            })
            : existing;

        if ((updated.lodgifySyncStatus || '').toLowerCase() !== 'synced') {
            try {
                await syncReservationToLodgify(buildReservationSyncTarget(updated));
            } catch (error) {
                await refreshReservationSyncState(
                    updated.id,
                    'failed',
                    error instanceof Error ? error.message : 'Failed to sync to Lodgify'
                );
            }
        }

        return updated;
    }

    const parsedStart = parseDate(startDate);
    const parsedEnd = parseDate(endDate);
    if (!parsedStart || !parsedEnd) return null;

    const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        select: {
            id: true,
            title: true,
            basePricePerNight: true,
            price: true,
            cleaningFee: true,
            serviceFee: true,
            taxPercentage: true,
            minStayNights: true,
            dynamicPricingRules: true,
            locationValue: true,
            lodgifyPropertyId: true,
            lodgifyRoomTypeId: true,
            taxProfile: {
                include: {
                    lines: {
                        where: { isActive: true },
                        orderBy: { order: "asc" },
                    },
                },
            },
        },
    });
    if (!listing) return null;

    const nights = calculateNights(parsedStart, parsedEnd);
    const minStay = Math.max(1, listing.minStayNights || 1);
    if (nights < minStay) return null;

    const cleaningFee = listing.cleaningFee ?? 0;
    const serviceFee = listing.serviceFee ?? 0;
    const pricing = calculateStayPricingBreakdown({
        startDate: parsedStart,
        endDate: parsedEnd,
        basePricePerNight: listing.basePricePerNight ?? listing.price ?? 0,
        cleaningFee,
        serviceFee,
        taxPercentage: listing.taxPercentage ?? 0,
        locationValue: listing.locationValue,
        taxProfile: listing.taxProfile || undefined,
        dynamicPricingRules: listing.dynamicPricingRules,
    });

    const reservation = await prisma.reservation.create({
        data: {
            userId,
            listingId,
            startDate: parsedStart,
            endDate: parsedEnd,
            nights,
            adults: parseInt(metadata.adults || "1", 10),
            children: parseInt(metadata.children || "0", 10),
            infants: parseInt(metadata.infants || "0", 10),
            pets: parseInt(metadata.pets || "0", 10),
            pricePerNight: pricing.pricePerNight,
            subtotal: pricing.subtotal,
            cleaningFee,
            serviceFee,
            taxPercentage: pricing.totalTaxRate,
            taxAmount: pricing.taxAmount,
            taxBreakdown: pricing.taxLines as any,
            totalPrice: pricing.total,
            stripeSessionId: session.id,
            stripePaymentIntentId: paymentIntent?.id,
            stripeChargeId: charge?.id,
            stripeBalanceTransactionId: typeof charge?.balance_transaction === "string"
                ? charge?.balance_transaction
                : (charge?.balance_transaction as any)?.id,
            bookingSource: "direct",
            primaryGuestName: guestFields.primaryGuestName,
            primaryGuestEmail: guestFields.primaryGuestEmail,
            primaryGuestPhone: guestFields.primaryGuestPhone,
            primaryGuestLocale: guestFields.primaryGuestLocale,
            primaryGuestStreetAddress1: guestFields.primaryGuestStreetAddress1,
            primaryGuestStreetAddress2: guestFields.primaryGuestStreetAddress2,
            primaryGuestCity: guestFields.primaryGuestCity,
            primaryGuestState: guestFields.primaryGuestState,
            primaryGuestPostalCode: guestFields.primaryGuestPostalCode,
            primaryGuestCountryCode: guestFields.primaryGuestCountryCode,
            agreementPolicyId: guestFields.agreementPolicyId,
            agreementPolicyVersion: guestFields.agreementPolicyVersion,
            agreementPolicyTitle: guestFields.agreementPolicyTitle,
            agreementAcceptedAt: guestFields.agreementAcceptedAt,
            paymentPolicyId: guestFields.paymentPolicyId,
            paymentPolicyVersion: guestFields.paymentPolicyVersion,
            paymentPolicyTitle: guestFields.paymentPolicyTitle,
            paymentPolicyAcceptedAt: guestFields.paymentPolicyAcceptedAt,
            lodgifyPropertyId: listing.lodgifyPropertyId || null,
            lodgifyRoomTypeId: listing.lodgifyRoomTypeId || null,
            lodgifySyncStatus: "pending",
            paymentStatus,
            paymentCurrency: currency,
            amountPaid,
            cardBrand: card?.brand,
            cardLast4: card?.last4,
            cardExpMonth: card?.exp_month,
            cardExpYear: card?.exp_year,
            // Deposit / balance fields
            paymentType,
            depositAmount: depositAmountCents,
            balanceDueAmount: balanceDueAmountCents,
            balanceDueDate,
            balancePaid: !isDepositBooking, // full-payment bookings have no balance to collect
            stripeCustomerId,
            stripePaymentMethodId,
        },
        include: {
            listing: {
                select: {
                    id: true,
                    title: true,
                    subtitle: true,
                    imageSrc: true,
                    locationValue: true,
                    lodgifyPropertyId: true,
                    lodgifyRoomTypeId: true,
                },
            },
            user: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
    });

    try {
        await syncReservationToLodgify(buildReservationSyncTarget(reservation));
    } catch (error) {
        await refreshReservationSyncState(
            reservation.id,
            'failed',
            error instanceof Error ? error.message : 'Failed to sync to Lodgify'
        );
    }

    return reservation;
};
