import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { calculateNights, parseDate } from "@/lib/booking";
import { calculateStayPricingBreakdown } from "@/lib/pricing";

export const runtime = "nodejs";

const DEPOSIT_THRESHOLD_DAYS = 60; // bookings more than this many days out get the 50% deposit flow

const getAppUrl = (request: NextRequest) => {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (envUrl) return envUrl.replace(/\/$/, "");
    const origin = request.headers.get("origin");
    if (origin) return origin.replace(/\/$/, "");
    const host = request.headers.get("host");
    return host ? `https://${host}` : "http://localhost:3000";
};

/** Returns the number of full calendar days between today (midnight) and the arrival date. */
function daysUntil(arrival: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const arrivalDay = new Date(arrival);
    arrivalDay.setHours(0, 0, 0, 0);
    return Math.floor((arrivalDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Returns the date that is `days` days before `date`. */
function daysBefore(date: Date, days: number): Date {
    return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as any).id) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = (session.user as any).id as string;
        const userEmail = (session.user as any).email as string | undefined;
        const body = await request.json();
        const {
            listingId,
            startDate,
            endDate,
            adults = 1,
            children = 0,
            infants = 0,
            pets = 0,
            primaryGuestName = null,
            primaryGuestEmail = null,
            primaryGuestPhone = null,
            primaryGuestLocale = null,
            primaryGuestStreetAddress1 = null,
            primaryGuestStreetAddress2 = null,
            primaryGuestCity = null,
            primaryGuestState = null,
            primaryGuestPostalCode = null,
            primaryGuestCountryCode = null,
            agreementPolicyId = null,
            agreementPolicyVersion = null,
            agreementPolicyTitle = null,
            paymentPolicyId = null,
            paymentPolicyVersion = null,
            paymentPolicyTitle = null,
            payFullAmount = false, // guest can opt to pay in full even when deposit is eligible
        } = body;

        if (!listingId || !startDate || !endDate) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const parsedStart = parseDate(startDate);
        const parsedEnd = parseDate(endDate);
        if (!parsedStart || !parsedEnd) {
            return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
        }

        if (parsedEnd <= parsedStart) {
            return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
        }

        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            include: {
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

        if (!listing) {
            return NextResponse.json({ error: "Listing not found" }, { status: 404 });
        }

        const nights = calculateNights(parsedStart, parsedEnd);
        const minStay = Math.max(1, listing.minStayNights || 1);
        if (nights < minStay) {
            return NextResponse.json({ error: `Minimum stay is ${minStay} nights` }, { status: 400 });
        }

        const cleaningFee = listing.cleaningFee ?? 0;
        const serviceFee = listing.serviceFee ?? 0;
        const petFeePerPetPerNight = (listing as any).petFee ?? 0;
        const pricing = calculateStayPricingBreakdown({
            startDate: parsedStart,
            endDate: parsedEnd,
            basePricePerNight: listing.basePricePerNight ?? listing.price ?? 0,
            cleaningFee,
            serviceFee,
            petFee: petFeePerPetPerNight,
            pets,
            taxPercentage: listing.taxPercentage ?? 0,
            locationValue: listing.locationValue,
            taxProfile: listing.taxProfile || undefined,
            dynamicPricingRules: listing.dynamicPricingRules,
        });

        const currency = (process.env.STRIPE_CURRENCY || "usd").toLowerCase();
        const appUrl = getAppUrl(request);

        const imageUrl = listing.imageSrc
            ? (listing.imageSrc.startsWith("http")
                ? listing.imageSrc
                : `${appUrl}${listing.imageSrc.startsWith("/") ? "" : "/"}${listing.imageSrc}`)
            : null;

        // --- Deposit vs Full Payment Logic (per policy) ---
        const arrivalDaysAway = daysUntil(parsedStart);
        const isDepositBooking = arrivalDaysAway > DEPOSIT_THRESHOLD_DAYS && !payFullAmount;

        const totalCents = Math.round(pricing.total * 100);
        // 50% deposit rounded down to nearest cent; balance is the remainder
        const depositCents = isDepositBooking ? Math.floor(totalCents / 2) : totalCents;
        const balanceCents = isDepositBooking ? totalCents - depositCents : 0;
        const balanceDueDate = isDepositBooking
            ? daysBefore(parsedStart, DEPOSIT_THRESHOLD_DAYS)
            : null;
        const paymentType = isDepositBooking ? "deposit" : "full";

        const sharedMetadata: Record<string, string> = {
            userId,
            listingId,
            startDate,
            endDate,
            adults: String(adults),
            children: String(children),
            infants: String(infants),
            pets: String(pets),
            primaryGuestName: String(primaryGuestName || ""),
            primaryGuestEmail: String(primaryGuestEmail || ""),
            primaryGuestPhone: String(primaryGuestPhone || ""),
            primaryGuestLocale: String(primaryGuestLocale || ""),
            primaryGuestStreetAddress1: String(primaryGuestStreetAddress1 || ""),
            primaryGuestStreetAddress2: String(primaryGuestStreetAddress2 || ""),
            primaryGuestCity: String(primaryGuestCity || ""),
            primaryGuestState: String(primaryGuestState || ""),
            primaryGuestPostalCode: String(primaryGuestPostalCode || ""),
            primaryGuestCountryCode: String(primaryGuestCountryCode || ""),
            agreementPolicyId: String(agreementPolicyId || ""),
            agreementPolicyVersion: String(agreementPolicyVersion || ""),
            agreementPolicyTitle: String(agreementPolicyTitle || ""),
            paymentPolicyId: String(paymentPolicyId || ""),
            paymentPolicyVersion: String(paymentPolicyVersion || ""),
            paymentPolicyTitle: String(paymentPolicyTitle || ""),
            paymentType,
            depositAmountCents: String(depositCents),
            balanceDueAmountCents: String(balanceCents),
            balanceDueDate: balanceDueDate ? balanceDueDate.toISOString() : "",
        };

        const cancelUrl = `${appUrl}/booking/${listingId}?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&adults=${adults}&children=${children}&infants=${infants}&pets=${pets}`;

        let checkoutSession;

        if (isDepositBooking) {
            // Deposit flow: charge 50%, save the card for the balance charge 60 days before arrival.
            // We use customer_creation: 'always' so Stripe creates a Customer and we can reuse the card.
            const balanceDateFormatted = balanceDueDate
                ? balanceDueDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                : "";

            checkoutSession = await stripe.checkout.sessions.create({
                mode: "payment",
                payment_method_types: ["card"],
                customer_email: userEmail || undefined,
                customer_creation: "always",
                payment_intent_data: {
                    // Save the card off-session so we can charge the balance later without the guest being present
                    setup_future_usage: "off_session",
                    description: `50% deposit — ${listing.title} (${nights} night stay). Balance of $${(balanceCents / 100).toFixed(2)} auto-charged on ${balanceDateFormatted}.`,
                },
                line_items: [
                    {
                        price_data: {
                            currency,
                            product_data: {
                                name: `50% Deposit — ${listing.title}`,
                                description: `${nights} night stay · Balance of $${(balanceCents / 100).toFixed(2)} auto-charged on ${balanceDateFormatted}`,
                                images: imageUrl ? [imageUrl] : undefined,
                            },
                            unit_amount: depositCents,
                        },
                        quantity: 1,
                    },
                ],
                success_url: `${appUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: cancelUrl,
                metadata: sharedMetadata,
            });
        } else {
            // Full payment: charge everything now (booking is within 60 days of arrival)
            checkoutSession = await stripe.checkout.sessions.create({
                mode: "payment",
                payment_method_types: ["card"],
                customer_email: userEmail || undefined,
                line_items: [
                    {
                        price_data: {
                            currency,
                            product_data: {
                                name: listing.title,
                                description: `${nights} night stay`,
                                images: imageUrl ? [imageUrl] : undefined,
                            },
                            unit_amount: Math.round(pricing.nightlySubtotal * 100),
                        },
                        quantity: 1,
                    },
                    ...(cleaningFee > 0
                        ? [{
                            price_data: {
                                currency,
                                product_data: { name: "Cleaning fee" },
                                unit_amount: Math.round(cleaningFee * 100),
                            },
                            quantity: 1,
                        }]
                        : []),
                    ...(serviceFee > 0
                        ? [{
                            price_data: {
                                currency,
                                product_data: { name: "Service fee" },
                                unit_amount: Math.round(serviceFee * 100),
                            },
                            quantity: 1,
                        }]
                        : []),
                    ...(pricing.petFeeSubtotal > 0
                        ? [{
                            price_data: {
                                currency,
                                product_data: { name: `Pet fee (${pets} pet${pets !== 1 ? 's' : ''} × ${nights} nights)` },
                                unit_amount: Math.round(pricing.petFeeSubtotal * 100),
                            },
                            quantity: 1,
                        }]
                        : []),
                    ...pricing.taxLines.map((taxLine) => ({
                        price_data: {
                            currency,
                            product_data: { name: `${taxLine.label} (${taxLine.rate}%)` },
                            unit_amount: Math.round(taxLine.amount * 100),
                        },
                        quantity: 1,
                    })),
                ],
                success_url: `${appUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: cancelUrl,
                metadata: sharedMetadata,
            });
        }

        return NextResponse.json({ url: checkoutSession.url });
    } catch (error) {
        console.error("Stripe checkout error:", error);
        return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }
}
