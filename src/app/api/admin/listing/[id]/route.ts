import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { adminAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAudit } from "@/lib/admin-audit";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(adminAuthOptions);

        if (!session || (session.user as any).role !== "ADMIN") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: "Listing ID is required" },
                { status: 400 }
            );
        }

        const listing = await prisma.listing.findUnique({ where: { id }, select: { title: true } });

        // Delete the listing (images will cascade delete)
        await prisma.listing.delete({
            where: { id },
        });

        const adminId = (session.user as any).id as string;
        await logAdminAudit(adminId, 'listing_delete', id, 'listing', { title: listing?.title });

        return NextResponse.json(
            { message: "Listing deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Delete listing error:", error);
        return NextResponse.json(
            { error: "Failed to delete listing" },
            { status: 500 }
        );
    }
}
