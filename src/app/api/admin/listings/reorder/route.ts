import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { adminAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAudit } from "@/lib/admin-audit";

export async function POST(request: NextRequest) {
    const session = await getServerSession(adminAuthOptions);

    if (!session || (session.user as any).role !== "ADMIN") {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await request.json();
        const orderedIds = Array.isArray(body?.orderedIds) ? body.orderedIds : [];

        if (orderedIds.length === 0) {
            return NextResponse.json({ error: "orderedIds is required" }, { status: 400 });
        }

        const uniqueIds = Array.from(new Set(orderedIds));
        if (uniqueIds.length !== orderedIds.length) {
            return NextResponse.json({ error: "orderedIds contains duplicates" }, { status: 400 });
        }

        const existingCount = await prisma.listing.count({
            where: { id: { in: orderedIds } },
        });

        if (existingCount !== orderedIds.length) {
            return NextResponse.json({ error: "One or more listing IDs are invalid" }, { status: 400 });
        }

        await prisma.$transaction(
            orderedIds.map((id: string, index: number) =>
                prisma.listing.update({
                    where: { id },
                    data: { displayOrder: index },
                })
            )
        );

        const adminId = (session.user as any).id as string;
        await logAdminAudit(adminId, 'listing_reorder', 'bulk', 'listing', { count: orderedIds.length });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Reorder listings error:", error);
        return NextResponse.json({ error: "Failed to reorder listings" }, { status: 500 });
    }
}
