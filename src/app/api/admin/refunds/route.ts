import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { adminAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { logAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(adminAuthOptions);
        if (!session || (session.user as any).role !== "ADMIN") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await request.json();
        const { reservationId, amount } = body;

        if (!reservationId) {
            return NextResponse.json({ error: "Reservation ID is required" }, { status: 400 });
        }

        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
        });

        if (!reservation) {
            return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
        }

        if (!reservation.stripePaymentIntentId) {
            return NextResponse.json({ error: "No Stripe payment found for this reservation" }, { status: 400 });
        }

        const totalPaid = reservation.amountPaid || 0;
        const alreadyRefunded = reservation.refundedAmount || 0;
        const remaining = Math.max(totalPaid - alreadyRefunded, 0);

        const refundAmount = amount ? Math.min(Number(amount), remaining) : remaining;
        if (!refundAmount || refundAmount <= 0) {
            return NextResponse.json({ error: "No refundable amount available" }, { status: 400 });
        }

        const refund = await stripe.refunds.create({
            payment_intent: reservation.stripePaymentIntentId,
            amount: Math.round(refundAmount),
        });

        const newRefundedAmount = alreadyRefunded + refundAmount;
        const refundStatus = newRefundedAmount >= totalPaid ? "refunded" : "partially_refunded";

        const updated = await prisma.reservation.update({
            where: { id: reservationId },
            data: {
                refundedAmount: newRefundedAmount,
                refundStatus,
                stripeRefundIds: {
                    push: refund.id,
                },
                refundHistory: {
                    push: {
                        id: refund.id,
                        amount: refund.amount,
                        currency: refund.currency,
                        status: refund.status,
                        reason: refund.reason,
                        created: refund.created,
                    },
                },
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
                user: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        const adminId = (session.user as any).id as string;
        await logAdminAudit(adminId, 'refund_issue', reservationId, 'reservation', {
            refundId: refund.id,
            amountCents: refundAmount,
            currency: refund.currency,
        });

        return NextResponse.json({ reservation: updated, refund });
    } catch (error) {
        console.error("Admin refund error:", error);
        return NextResponse.json({ error: "Failed to create refund" }, { status: 500 });
    }
}
