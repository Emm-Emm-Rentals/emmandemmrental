import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

const getAppUrl = (request: NextRequest) => {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (envUrl) return envUrl.replace(/\/$/, "");
    const origin = request.headers.get("origin");
    if (origin) return origin.replace(/\/$/, "");
    const host = request.headers.get("host");
    return host ? `https://${host}` : "http://localhost:3000";
};

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as any).id) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const { id } = await params;
        const userId = (session.user as any).id as string;
        const userEmail = (session.user as any).email as string | undefined;
        const appUrl = getAppUrl(request);

        const reservation = await prisma.reservation.findUnique({
            where: { id },
            include: {
                listing: { select: { title: true, imageSrc: true } },
            },
        });

        if (!reservation) {
            return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
        }
        if (reservation.userId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        if ((reservation as any).paymentType !== "deposit") {
            return NextResponse.json({ error: "This reservation is not a deposit booking" }, { status: 400 });
        }
        if ((reservation as any).balancePaid) {
            return NextResponse.json({ error: "Balance has already been paid" }, { status: 400 });
        }

        const balanceCents: number = (reservation as any).balanceDueAmount;
        if (!balanceCents || balanceCents <= 0) {
            return NextResponse.json({ error: "No outstanding balance" }, { status: 400 });
        }

        const currency = (reservation.paymentCurrency || "usd").toLowerCase();
        const listingTitle = reservation.listing?.title || "Your reservation";

        const imageUrl = reservation.listing?.imageSrc
            ? (reservation.listing.imageSrc.startsWith("http")
                ? reservation.listing.imageSrc
                : `${appUrl}${reservation.listing.imageSrc.startsWith("/") ? "" : "/"}${reservation.listing.imageSrc}`)
            : null;

        const checkoutSession = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            customer_email: userEmail || undefined,
            line_items: [
                {
                    price_data: {
                        currency,
                        product_data: {
                            name: `Remaining balance — ${listingTitle}`,
                            description: `Check-in: ${reservation.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
                            images: imageUrl ? [imageUrl] : undefined,
                        },
                        unit_amount: balanceCents,
                    },
                    quantity: 1,
                },
            ],
            success_url: `${appUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}&balance=1`,
            cancel_url: `${appUrl}/trips/upcoming`,
            metadata: {
                type: "balance_payment",
                reservationId: id,
                userId,
            },
        });

        return NextResponse.json({ url: checkoutSession.url });
    } catch (error) {
        console.error("Pay-balance checkout error:", error);
        return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
    }
}
