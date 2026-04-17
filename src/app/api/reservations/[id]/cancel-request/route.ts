import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUnifiedReservationByIdForUser } from "@/lib/lodgify";
import { sendCancellationRequestToAdmin } from "@/lib/email";

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
        const email = (session.user as any).email || null;
        const body = await request.json().catch(() => ({}));
        const reason: string | undefined = body?.reason?.trim() || undefined;

        const now = new Date();

        // --- Check for existing pending request to avoid duplicates ---
        const existing = await prisma.cancellationRequest.findFirst({
            where: {
                userId,
                status: "pending",
                OR: [
                    { reservationId: id },
                    { lodgifyReservationId: id },
                ],
            },
        });
        if (existing) {
            return NextResponse.json(
                { error: "You already have a pending cancellation request for this reservation." },
                { status: 409 }
            );
        }

        // --- Try local reservation first ---
        const localReservation = await prisma.reservation.findUnique({
            where: { id },
            include: { listing: { select: { title: true } } },
        });

        if (localReservation) {
            if (localReservation.userId !== userId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
            if (localReservation.startDate <= now) {
                return NextResponse.json(
                    { error: "Only upcoming reservations can be cancelled." },
                    { status: 400 }
                );
            }
            const ps = (localReservation.paymentStatus || "").toLowerCase();
            if (ps === "canceled" || ps === "cancelled") {
                return NextResponse.json(
                    { error: "This reservation is already cancelled." },
                    { status: 409 }
                );
            }

            const cancellationRequest = await prisma.cancellationRequest.create({
                data: {
                    reservationId: id,
                    userId,
                    listingTitle: localReservation.listing?.title || "Unknown Listing",
                    startDate: localReservation.startDate,
                    endDate: localReservation.endDate,
                    reason,
                },
            });

            sendCancellationRequestToAdmin({
                id: cancellationRequest.id,
                listingTitle: cancellationRequest.listingTitle,
                startDate: cancellationRequest.startDate,
                endDate: cancellationRequest.endDate,
                reason: cancellationRequest.reason,
                guestName: (session.user as any).name || null,
                guestEmail: email,
            }).catch((err) => console.error('[email] cancellation request to admin failed', err));

            return NextResponse.json({
                success: true,
                requestId: cancellationRequest.id,
                message: "Cancellation request submitted. An admin will review it shortly.",
            });
        }

        // --- Try Lodgify reservation ---
        const unifiedReservation = await getUnifiedReservationByIdForUser(userId, id, email);
        if (!unifiedReservation || unifiedReservation.source !== "lodgify") {
            return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
        }

        if (unifiedReservation.isCanceled) {
            return NextResponse.json(
                { error: "This reservation is already cancelled." },
                { status: 409 }
            );
        }

        if (new Date(unifiedReservation.startDate) <= now) {
            return NextResponse.json(
                { error: "Only upcoming reservations can be cancelled." },
                { status: 400 }
            );
        }

        const cancellationRequest = await prisma.cancellationRequest.create({
            data: {
                lodgifyReservationId: id,
                userId,
                listingTitle: unifiedReservation.listing?.title || "Unknown Listing",
                startDate: new Date(unifiedReservation.startDate),
                endDate: new Date(unifiedReservation.endDate),
                reason,
            },
        });

        sendCancellationRequestToAdmin({
            id: cancellationRequest.id,
            listingTitle: cancellationRequest.listingTitle,
            startDate: cancellationRequest.startDate,
            endDate: cancellationRequest.endDate,
            reason: cancellationRequest.reason,
            guestName: (session.user as any).name || null,
            guestEmail: email,
        }).catch((err) => console.error('[email] cancellation request to admin failed', err));

        return NextResponse.json({
            success: true,
            requestId: cancellationRequest.id,
            message: "Cancellation request submitted. An admin will review it shortly.",
        });
    } catch (error: any) {
        console.error("Cancel request error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to submit cancellation request" },
            { status: 500 }
        );
    }
}
