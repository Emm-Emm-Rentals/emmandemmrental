import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { adminAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendRefundInitiatedToUser } from "@/lib/email";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(adminAuthOptions);
        if (!session || (session.user as any)?.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const adminNote: string | undefined = body?.adminNote?.trim() || undefined;

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

        if (!reservation.refundedAmount || reservation.refundedAmount <= 0) {
            return NextResponse.json({ error: "No refund has been issued for this reservation" }, { status: 400 });
        }

        const guestEmail =
            reservation.user?.email ||
            reservation.primaryGuestEmail ||
            null;

        if (!guestEmail) {
            return NextResponse.json({ error: "No guest email found for this reservation" }, { status: 400 });
        }

        await sendRefundInitiatedToUser({
            listingTitle: reservation.listing?.title || "Your reservation",
            startDate: reservation.startDate,
            endDate: reservation.endDate,
            refundAmount: reservation.refundedAmount,
            currency: reservation.paymentCurrency || "usd",
            adminNote: adminNote || null,
            guestName: reservation.user?.name || reservation.primaryGuestName || null,
            guestEmail,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Notify refund error:", error);
        return NextResponse.json({ error: "Failed to send refund notification" }, { status: 500 });
    }
}
