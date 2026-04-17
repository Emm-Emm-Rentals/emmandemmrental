import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateStayPricingBreakdown } from "@/lib/pricing";
import { getUnifiedReservationsForUser } from "@/lib/lodgify";

const parseDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return date;
};

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as any).id) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = (session.user as any).id as string;
        const reservations = await getUnifiedReservationsForUser(
            userId,
            (session.user as any).email || null
        );

        return NextResponse.json(reservations);
    } catch (error) {
        console.error("Get reservations error:", error);
        return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as any).id) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = (session.user as any).id as string;
        const body = await request.json();
        const {
            listingId,
            startDate,
            endDate,
            adults = 1,
            children = 0,
            infants = 0,
            pets = 0,
            agreementPolicyId = null,
            agreementPolicyVersion = null,
            agreementPolicyTitle = null,
            paymentPolicyId = null,
            paymentPolicyVersion = null,
            paymentPolicyTitle = null,
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

        const nights = Math.ceil((parsedEnd.getTime() - parsedStart.getTime()) / (1000 * 60 * 60 * 24));
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

        const reservation = await prisma.reservation.create({
            data: {
                userId,
                listingId,
                startDate: parsedStart,
                endDate: parsedEnd,
                nights,
                adults,
                children,
                infants,
                pets,
                pricePerNight: pricing.pricePerNight,
                subtotal: pricing.subtotal,
                cleaningFee,
                serviceFee,
                taxPercentage: pricing.totalTaxRate,
                taxAmount: pricing.taxAmount,
                taxBreakdown: pricing.taxLines as any,
                totalPrice: pricing.total,
                agreementPolicyId: typeof agreementPolicyId === 'string' ? agreementPolicyId : null,
                agreementPolicyVersion: agreementPolicyVersion ? Number(agreementPolicyVersion) : null,
                agreementPolicyTitle: typeof agreementPolicyTitle === 'string' ? agreementPolicyTitle : null,
                paymentPolicyId: typeof paymentPolicyId === 'string' ? paymentPolicyId : null,
                paymentPolicyVersion: paymentPolicyVersion ? Number(paymentPolicyVersion) : null,
                paymentPolicyTitle: typeof paymentPolicyTitle === 'string' ? paymentPolicyTitle : null,
            },
            include: {
                listing: {
                    select: {
                        id: true,
                        title: true,
                        subtitle: true,
                        imageSrc: true,
                        locationValue: true,
                    },
                },
            },
        });

        return NextResponse.json(reservation, { status: 201 });
    } catch (error) {
        console.error("Create reservation error:", error);
        return NextResponse.json({ error: "Failed to create reservation" }, { status: 500 });
    }
}
