import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { adminAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelLodgifyReservationById } from "@/lib/lodgify";
import { sendCancellationDecisionToUser } from "@/lib/email";
import { logAdminAudit } from "@/lib/admin-audit";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(adminAuthOptions);
        if (!session || (session.user as any).role !== "ADMIN") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const action: "approve" | "reject" = body.action;
        const adminNote: string | undefined = body.adminNote?.trim() || undefined;

        if (action !== "approve" && action !== "reject") {
            return NextResponse.json({ error: "Invalid action. Use 'approve' or 'reject'." }, { status: 400 });
        }

        const cancellationRequest = await prisma.cancellationRequest.findUnique({
            where: { id },
            include: {
                reservation: {
                    select: {
                        id: true,
                        paymentStatus: true,
                        lodgifyReservationId: true,
                        primaryGuestName: true,
                        primaryGuestEmail: true,
                    },
                },
                user: { select: { id: true, name: true, email: true } },
            },
        });

        if (!cancellationRequest) {
            return NextResponse.json({ error: "Cancellation request not found" }, { status: 404 });
        }

        if (cancellationRequest.status !== "pending") {
            return NextResponse.json(
                { error: `This request is already ${cancellationRequest.status}.` },
                { status: 409 }
            );
        }

        if (action === "approve") {
            // --- Cancel the actual reservation ---
            if (cancellationRequest.reservation) {
                // Local reservation: mark as cancelled
                await prisma.reservation.update({
                    where: { id: cancellationRequest.reservation.id },
                    data: { paymentStatus: "cancelled" },
                });

                // If the reservation also has a Lodgify reservation ID, cancel in Lodgify too
                const lodgifyId = cancellationRequest.reservation.lodgifyReservationId;
                if (lodgifyId) {
                    try {
                        await cancelLodgifyReservationById(lodgifyId);
                    } catch (err) {
                        console.error("Failed to cancel in Lodgify:", err);
                        // Don't fail the whole request — local is already cancelled
                    }
                }
            } else if (cancellationRequest.lodgifyReservationId) {
                // Pure Lodgify reservation — cancel via Lodgify API
                await cancelLodgifyReservationById(cancellationRequest.lodgifyReservationId);
            }
        }

        // Update the cancellation request status
        const updated = await prisma.cancellationRequest.update({
            where: { id },
            data: {
                status: action === "approve" ? "approved" : "rejected",
                adminNote,
                processedAt: new Date(),
            },
        });

        // Notify the guest — try user account email first, then reservation's guest email
        const guestEmail =
            cancellationRequest.user?.email ||
            cancellationRequest.reservation?.primaryGuestEmail ||
            null;

        const guestName =
            cancellationRequest.user?.name ||
            cancellationRequest.reservation?.primaryGuestName ||
            null;

        console.log('[cancellation] sending decision email', {
            action,
            guestEmail,
            requestId: id,
        });

        if (guestEmail) {
            try {
                await sendCancellationDecisionToUser({
                    listingTitle: cancellationRequest.listingTitle,
                    startDate: cancellationRequest.startDate,
                    endDate: cancellationRequest.endDate,
                    action: action === "approve" ? "approved" : "rejected",
                    adminNote: adminNote || null,
                    guestName,
                    guestEmail,
                });
                console.log('[cancellation] decision email sent to', guestEmail);
            } catch (err) {
                console.error('[cancellation] decision email FAILED for', guestEmail, err);
            }
        } else {
            console.warn('[cancellation] no guest email found — skipping decision email', {
                userId: cancellationRequest.userId,
                requestId: id,
            });
        }

        const adminId = (session.user as any).id as string;
        await logAdminAudit(adminId, `cancellation_${action}`, id, 'cancellation_request', {
            reservationId: cancellationRequest.reservation?.id,
            adminNote: adminNote || null,
        });

        return NextResponse.json({ success: true, request: updated });
    } catch (error: any) {
        console.error("Cancellation request process error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to process cancellation request" },
            { status: 500 }
        );
    }
}
