/**
 * Balance Collection Endpoint
 *
 * Per policy: reservations booked more than 60 days before arrival are charged a 50% deposit
 * at booking. The remaining balance is automatically charged 60 days before arrival.
 *
 * This endpoint finds all reservations whose balance is now due and charges the saved card.
 * Call it daily via a cron job (e.g. Vercel Cron, GitHub Actions, or any scheduler).
 *
 * Authentication: Bearer token in Authorization header matching BALANCE_COLLECTION_SECRET env var,
 * OR an active admin session.
 *
 * Example cron call:
 *   curl -X POST https://yourdomain.com/api/admin/collect-balances \
 *     -H "Authorization: Bearer <BALANCE_COLLECTION_SECRET>"
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

type CollectionResult = {
    reservationId: string;
    status: "charged" | "failed" | "skipped";
    reason?: string;
    amountCents?: number;
};

function isAuthorized(request: NextRequest, session: any): boolean {
    const secret = process.env.BALANCE_COLLECTION_SECRET;
    if (secret) {
        const authHeader = request.headers.get("authorization") || "";
        if (authHeader === `Bearer ${secret}`) return true;
    }
    return session?.user && (session.user as any).role === "ADMIN";
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(request, session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    now.setHours(23, 59, 59, 999); // include anything due today

    // Find all deposit reservations whose balance is now due and hasn't been collected yet
    const due = await prisma.reservation.findMany({
        where: {
            paymentType: "deposit",
            balancePaid: false,
            balanceDueDate: { lte: now },
            startDate: { gt: new Date() }, // don't charge after the stay has begun
            paymentStatus: { not: "canceled" },
            stripeCustomerId: { not: null },
            stripePaymentMethodId: { not: null },
            balanceDueAmount: { gt: 0 },
        },
        select: {
            id: true,
            balanceDueAmount: true,
            paymentCurrency: true,
            stripeCustomerId: true,
            stripePaymentMethodId: true,
            amountPaid: true,
            primaryGuestEmail: true,
            primaryGuestName: true,
            listing: { select: { title: true } },
        },
    });

    if (due.length === 0) {
        return NextResponse.json({ message: "No balances due today.", results: [] });
    }

    const results: CollectionResult[] = [];

    for (const reservation of due) {
        const balanceCents = reservation.balanceDueAmount!;
        const currency = (reservation.paymentCurrency || "usd").toLowerCase();

        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: balanceCents,
                currency,
                customer: reservation.stripeCustomerId!,
                payment_method: reservation.stripePaymentMethodId!,
                confirm: true,
                off_session: true,
                description: `Balance payment — ${reservation.listing?.title || "reservation"} (ID: ${reservation.id})`,
                metadata: {
                    reservationId: reservation.id,
                    type: "balance_collection",
                },
            });

            await prisma.reservation.update({
                where: { id: reservation.id },
                data: {
                    balancePaid: true,
                    balancePaidAt: new Date(),
                    balanceStripePaymentIntentId: paymentIntent.id,
                    amountPaid: (reservation.amountPaid || 0) + balanceCents,
                    paymentStatus: "paid",
                },
            });

            results.push({ reservationId: reservation.id, status: "charged", amountCents: balanceCents });
        } catch (err: any) {
            // Stripe off-session errors (e.g. card declined) are caught here.
            // The reservation is left with balancePaid: false so we can retry or alert the team.
            console.error(`Balance collection failed for reservation ${reservation.id}:`, err);

            await prisma.reservation.update({
                where: { id: reservation.id },
                data: {
                    // Record the failure so an admin can follow up
                    paymentStatus: "balance_failed",
                },
            });

            results.push({
                reservationId: reservation.id,
                status: "failed",
                reason: err?.message || "Stripe charge failed",
                amountCents: balanceCents,
            });
        }
    }

    const charged = results.filter((r) => r.status === "charged").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({
        message: `Processed ${due.length} balance(s): ${charged} charged, ${failed} failed.`,
        results,
    });
}

/** GET — dry run: returns reservations with balances due without charging them. */
export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!isAuthorized(request, session)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    now.setHours(23, 59, 59, 999);

    const due = await prisma.reservation.findMany({
        where: {
            paymentType: "deposit",
            balancePaid: false,
            balanceDueDate: { lte: now },
            startDate: { gt: new Date() },
            paymentStatus: { not: "canceled" },
            stripeCustomerId: { not: null },
            stripePaymentMethodId: { not: null },
            balanceDueAmount: { gt: 0 },
        },
        select: {
            id: true,
            balanceDueAmount: true,
            balanceDueDate: true,
            paymentCurrency: true,
            primaryGuestName: true,
            primaryGuestEmail: true,
            startDate: true,
            listing: { select: { title: true } },
        },
        orderBy: { balanceDueDate: "asc" },
    });

    return NextResponse.json({ count: due.length, due });
}
