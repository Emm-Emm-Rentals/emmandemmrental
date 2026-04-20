import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendRefundRequestToAdmin } from "@/lib/email";

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
        const body = await request.json().catch(() => ({}));
        const reason: string | undefined = body?.reason?.trim() || undefined;

        const reservation = await prisma.reservation.findUnique({
            where: { id },
            include: {
                listing: { select: { title: true } },
                user: { select: { name: true, email: true } },
            },
        });

        if (!reservation) {
            return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
        }

        if (reservation.userId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const ps = (reservation.paymentStatus || "").toLowerCase();
        if (ps === "unpaid") {
            return NextResponse.json({ error: "No payment found for this reservation" }, { status: 400 });
        }

        const guestEmail =
            reservation.user?.email ||
            reservation.primaryGuestEmail ||
            null;

        sendRefundRequestToAdmin({
            reservationId: reservation.id,
            listingTitle: reservation.listing?.title || "Unknown Listing",
            startDate: reservation.startDate,
            endDate: reservation.endDate,
            reason,
            guestName: (session.user as any).name || reservation.primaryGuestName || null,
            guestEmail,
        }).catch((err) => console.error("[email] refund request to admin failed", err));

        return NextResponse.json({
            success: true,
            message: "Your refund request has been submitted. An admin will review it and get back to you.",
        });
    } catch (error: any) {
        console.error("Refund request error:", error);
        return NextResponse.json({ error: error?.message || "Failed to submit refund request" }, { status: 500 });
    }
}
