import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelLodgifyReservationById, getUnifiedReservationByIdForUser } from "@/lib/lodgify";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as any).id) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "Reservation ID is required" }, { status: 400 });
        }

        const reservation = await prisma.reservation.findUnique({
            where: { id },
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
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
            },
        });

        if (!reservation) {
            return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
        }

        const userId = (session.user as any).id as string;
        if (reservation.userId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json(reservation);
    } catch (error) {
        console.error("Get reservation error:", error);
        return NextResponse.json({ error: "Failed to fetch reservation" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !(session.user as any).id) {
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "Reservation ID is required" }, { status: 400 });
        }

        const userId = (session.user as any).id as string;
        const email = (session.user as any).email || null;
        const now = new Date();

        const localReservation = await prisma.reservation.findUnique({
            where: { id },
            include: {
                listing: {
                    select: {
                        id: true,
                        title: true,
                        imageSrc: true,
                    },
                },
            },
        });

        if (localReservation) {
            if (localReservation.userId !== userId) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }

            if (localReservation.startDate <= now) {
                return NextResponse.json(
                    { error: "Only upcoming reservations can be cancelled" },
                    { status: 400 }
                );
            }

            const amountPaid = localReservation.amountPaid || 0;
            const refundedAmount = localReservation.refundedAmount || 0;
            if (amountPaid > refundedAmount) {
                return NextResponse.json(
                    { error: "Paid reservations currently require support to cancel." },
                    { status: 409 }
                );
            }

            await prisma.reservation.delete({ where: { id: localReservation.id } });

            return NextResponse.json({
                success: true,
                source: "local",
                id: localReservation.id,
                message: "Reservation cancelled successfully.",
            });
        }

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
                { error: "Only upcoming reservations can be cancelled" },
                { status: 400 }
            );
        }

        await cancelLodgifyReservationById(unifiedReservation.id);

        return NextResponse.json({
            success: true,
            source: "lodgify",
            id: unifiedReservation.id,
            message: "Reservation cancelled successfully.",
        });
    } catch (error: any) {
        console.error("Cancel reservation error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to cancel reservation" },
            { status: 500 }
        );
    }
}
