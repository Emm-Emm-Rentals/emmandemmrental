import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { upsertReservationFromCheckoutSession } from "@/lib/stripeReservation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
    if (!webhookSecret) {
        return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    let event;
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
        return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
    }

    const body = await request.text();
    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
        console.error("Stripe webhook signature verification failed:", err);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    try {
        if (event.type === "checkout.session.completed") {
            const checkoutSession = event.data.object;
            const sessionType = checkoutSession.metadata?.type;

            if (sessionType === "balance_payment") {
                // Guest manually paid their remaining balance
                const reservationId = checkoutSession.metadata?.reservationId;
                if (reservationId && checkoutSession.payment_status === "paid") {
                    const amountPaid = checkoutSession.amount_total || 0;
                    const existing = await prisma.reservation.findUnique({
                        where: { id: reservationId },
                        select: { amountPaid: true },
                    });
                    await prisma.reservation.update({
                        where: { id: reservationId },
                        data: {
                            balancePaid: true,
                            balancePaidAt: new Date(),
                            balanceStripePaymentIntentId:
                                typeof checkoutSession.payment_intent === "string"
                                    ? checkoutSession.payment_intent
                                    : null,
                            amountPaid: (existing?.amountPaid || 0) + amountPaid,
                            paymentStatus: "paid",
                        },
                    });
                }
            } else {
                await upsertReservationFromCheckoutSession(checkoutSession);
            }
        }

        if (event.type === "charge.refunded") {
            const charge = event.data.object as any;
            const refundedAmount = charge.amount_refunded || 0;
            const refundStatus = refundedAmount >= charge.amount ? "refunded" : "partially_refunded";

            await prisma.reservation.updateMany({
                where: { stripeChargeId: charge.id },
                data: {
                    refundedAmount,
                    refundStatus,
                    stripeRefundIds: charge.refunds?.data?.map((r: any) => r.id) || [],
                    refundHistory: charge.refunds?.data?.map((r: any) => ({
                        id: r.id,
                        amount: r.amount,
                        currency: r.currency,
                        status: r.status,
                        reason: r.reason,
                        created: r.created,
                    })) || [],
                },
            });
        }
    } catch (err) {
        console.error("Stripe webhook handler error:", err);
        return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
