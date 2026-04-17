import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CANCELED_STATUSES } from "@/lib/lodgify";

/**
 * Lodgify webhook endpoint.
 *
 * Lodgify POSTs events here when reservation statuses change.
 * We look for cancellation events and sync the status into our DB.
 *
 * Configure your webhook URL in Lodgify dashboard:
 *   https://<your-domain>/api/lodgify/webhook
 *
 * Optionally set LODGIFY_WEBHOOK_SECRET in env to verify the request.
 */
export async function POST(request: NextRequest) {
    try {
        // Optional signature verification
        const secret = process.env.LODGIFY_WEBHOOK_SECRET;
        if (secret) {
            const signature = request.headers.get("x-lodgify-signature") || request.headers.get("x-webhook-secret");
            if (signature !== secret) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
        }

        const body = await request.json().catch(() => null);
        if (!body) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        // Lodgify may send different payload shapes — normalise
        // Shape 1: { event: "reservation.updated", data: { id, status } }
        // Shape 2: { id, status } (flat)
        // Shape 3: { reservation: { id, status } }
        const eventType: string = body.event || body.type || "";
        const payload = body.data || body.reservation || body;

        const lodgifyReservationId = String(
            payload.id || payload.reservation_id || payload.reservationId || ""
        ).trim();

        const rawStatus = String(
            payload.status || payload.reservation_status || ""
        ).trim();

        if (!lodgifyReservationId) {
            // Not a reservation event we can act on
            return NextResponse.json({ received: true });
        }

        const isCancellation = CANCELED_STATUSES.has(rawStatus.toLowerCase());

        if (isCancellation) {
            // 1. Update any local Reservation that has this Lodgify ID
            await prisma.reservation.updateMany({
                where: { lodgifyReservationId },
                data: { paymentStatus: "cancelled" },
            });

            // 2. Mark any pending CancellationRequest for this Lodgify booking as auto-approved
            await prisma.cancellationRequest.updateMany({
                where: {
                    lodgifyReservationId,
                    status: "pending",
                },
                data: {
                    status: "approved",
                    adminNote: `Auto-approved: Lodgify reported status "${rawStatus}"`,
                    processedAt: new Date(),
                },
            });

            // 3. Also handle local reservations linked via lodgifyReservationId — mark their cancel requests
            const localRes = await prisma.reservation.findFirst({
                where: { lodgifyReservationId },
                select: { id: true },
            });
            if (localRes) {
                await prisma.cancellationRequest.updateMany({
                    where: {
                        reservationId: localRes.id,
                        status: "pending",
                    },
                    data: {
                        status: "approved",
                        adminNote: `Auto-approved: Lodgify reported status "${rawStatus}"`,
                        processedAt: new Date(),
                    },
                });
            }
        }

        return NextResponse.json({ received: true, processed: isCancellation });
    } catch (error) {
        console.error("Lodgify webhook error:", error);
        return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }
}
