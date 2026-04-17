import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { adminAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(adminAuthOptions);
        if (!session || (session.user as any).role !== "ADMIN") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const params = request.nextUrl.searchParams;
        const status = params.get("status") || "pending"; // "pending" | "all"

        const where = status === "all" ? {} : { status: "pending" };

        const requests = await prisma.cancellationRequest.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, email: true } },
                reservation: {
                    select: {
                        id: true,
                        paymentStatus: true,
                        amountPaid: true,
                        paymentCurrency: true,
                        lodgifyReservationId: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ data: requests, total: requests.length });
    } catch (error) {
        console.error("Cancellation requests fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch cancellation requests" }, { status: 500 });
    }
}
