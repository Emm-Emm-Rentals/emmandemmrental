import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { upsertReservationFromCheckoutSession } from "@/lib/stripeReservation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as any).id) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const userId = (session.user as any).id as string;
        const sessionId = request.nextUrl.searchParams.get("session_id");
        if (!sessionId) {
            return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
        }

        const existing = await prisma.reservation.findFirst({
            where: { stripeSessionId: sessionId, userId },
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
        if (existing) {
            return NextResponse.json(existing);
        }

        const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
        if (!checkoutSession || checkoutSession.metadata?.userId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const reservation = await upsertReservationFromCheckoutSession(checkoutSession);
        if (!reservation) {
            // Payment confirmed but reservation not processable yet — use 404 so
            // response.ok is false and the success page keeps polling correctly.
            return NextResponse.json({ error: "Reservation not ready" }, { status: 404 });
        }

        return NextResponse.json(reservation);
    } catch (error) {
        console.error("Stripe session lookup error:", error);
        return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
    }
}
