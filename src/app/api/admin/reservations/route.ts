import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { adminAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchLodgifyReservationsByIds, CANCELED_STATUSES } from "@/lib/lodgify";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(adminAuthOptions);
        if (!session || (session.user as any).role !== "ADMIN") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const params = request.nextUrl.searchParams;
        const page = Math.max(parseInt(params.get("page") || "1", 10), 1);
        const pageSize = Math.min(Math.max(parseInt(params.get("pageSize") || "10", 10), 1), 100);
        const skip = (page - 1) * pageSize;
        const statusFilter = params.get("status") || "all";

        const where =
            statusFilter === "cancelled"
                ? { paymentStatus: { in: ["cancelled", "canceled"] } }
                : {};

        const total = await prisma.reservation.count({ where });

        const reservations = await prisma.reservation.findMany({
            where,
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
                listing: {
                    select: { id: true, title: true, subtitle: true, imageSrc: true, locationValue: true },
                },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: pageSize,
        });

        // Resolve real Lodgify status for reservations that are synced
        const lodgifyIds = reservations
            .map((r) => (r as any).lodgifyReservationId as string | null)
            .filter((id): id is string => Boolean(id));

        const lodgifyStatusMap = new Map<string, string>();
        if (lodgifyIds.length > 0) {
            try {
                const lodgifyReservations = await fetchLodgifyReservationsByIds(lodgifyIds);
                for (const lr of lodgifyReservations) {
                    if (lr.id && lr.status) {
                        lodgifyStatusMap.set(lr.id, lr.status);
                    }
                }
            } catch {
                // Lodgify unavailable — fall back to local paymentStatus
            }
        }

        // Attach resolved lodgify status to each reservation
        const enriched = reservations.map((r) => {
            const lodgifyResId = (r as any).lodgifyReservationId as string | null;
            const lodgifyStatus = lodgifyResId
                ? lodgifyStatusMap.get(lodgifyResId) ?? null
                : null;
            const isCanceled = lodgifyStatus
                ? CANCELED_STATUSES.has(lodgifyStatus.toLowerCase())
                : false;
            return { ...r, lodgifyStatus, isCanceled };
        });

        return NextResponse.json({
            data: enriched,
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
        });
    } catch (error) {
        console.error("Admin reservations error:", error);
        return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 });
    }
}
