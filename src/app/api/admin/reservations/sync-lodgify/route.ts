import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { adminAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncReservationToLodgify } from "@/lib/lodgify";
import { logAdminAudit } from "@/lib/admin-audit";

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(adminAuthOptions);
        if (!session || (session.user as any).role !== "ADMIN") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { reservationId } = await request.json();
        if (!reservationId) {
            return NextResponse.json({ error: "reservationId is required" }, { status: 400 });
        }

        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: {
                listing: {
                    select: {
                        title: true,
                        lodgifyPropertyId: true,
                        lodgifyRoomTypeId: true,
                    },
                },
                user: {
                    select: { name: true, email: true },
                },
            },
        });

        if (!reservation) {
            return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
        }

        // Reset sync status so syncReservationToLodgify will attempt it
        await prisma.reservation.update({
            where: { id: reservationId },
            data: { lodgifySyncStatus: "pending", lodgifySyncError: null },
        });

        const result = await syncReservationToLodgify({
            id: reservation.id,
            startDate: reservation.startDate,
            endDate: reservation.endDate,
            adults: reservation.adults,
            children: reservation.children,
            infants: reservation.infants,
            pets: reservation.pets,
            totalPrice: reservation.totalPrice,
            paymentCurrency: reservation.paymentCurrency,
            bookingSource: reservation.bookingSource,
            primaryGuestName: reservation.primaryGuestName,
            primaryGuestEmail: reservation.primaryGuestEmail,
            primaryGuestPhone: reservation.primaryGuestPhone,
            primaryGuestLocale: reservation.primaryGuestLocale,
            primaryGuestStreetAddress1: reservation.primaryGuestStreetAddress1,
            primaryGuestStreetAddress2: reservation.primaryGuestStreetAddress2,
            primaryGuestCity: reservation.primaryGuestCity,
            primaryGuestState: reservation.primaryGuestState,
            primaryGuestPostalCode: reservation.primaryGuestPostalCode,
            primaryGuestCountryCode: reservation.primaryGuestCountryCode,
            lodgifyPropertyId: reservation.lodgifyPropertyId,
            lodgifyRoomTypeId: reservation.lodgifyRoomTypeId,
            lodgifyReservationId: reservation.lodgifyReservationId,
            lodgifySyncStatus: "pending",
            user: reservation.user,
            listing: reservation.listing,
        });

        const updated = await prisma.reservation.findUnique({ where: { id: reservationId } });

        const adminId = (session.user as any).id as string;
        await logAdminAudit(adminId, 'reservation_sync_lodgify', reservationId, 'reservation', {
            lodgifyReservationId: updated?.lodgifyReservationId,
            syncStatus: updated?.lodgifySyncStatus,
        });

        return NextResponse.json({ success: true, result, reservation: updated });
    } catch (error: any) {
        console.error("Lodgify sync retry error:", error);

        // Mark as failed in DB
        try {
            const { reservationId } = await (request.clone()).json().catch(() => ({}));
            if (reservationId) {
                await prisma.reservation.update({
                    where: { id: reservationId },
                    data: { lodgifySyncStatus: "failed", lodgifySyncError: error?.message || "Unknown error" },
                });
            }
        } catch {}

        return NextResponse.json(
            { error: error?.message || "Failed to sync to Lodgify" },
            { status: 500 }
        );
    }
}
