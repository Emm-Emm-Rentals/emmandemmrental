import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { adminAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAudit } from "@/lib/admin-audit";

async function requireAdmin() {
    const session = await getServerSession(adminAuthOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") return null;
    return session;
}

export async function GET(request: NextRequest) {
    if (!(await requireAdmin())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = request.nextUrl;
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
        const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
        const skip = (page - 1) * limit;

        const [reviews, total] = await Promise.all([
            prisma.review.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    user: { select: { id: true, name: true, email: true, image: true } },
                    listing: { select: { id: true, title: true } },
                },
            }),
            prisma.review.count(),
        ]);

        return NextResponse.json({ reviews, total, page, limit });
    } catch (error) {
        console.error("Admin reviews GET error:", error);
        return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { listingId, guestName, rating, comment } = await request.json();

        if (!listingId || !guestName?.trim() || !rating || !comment?.trim()) {
            return NextResponse.json(
                { error: "listingId, guestName, rating, and comment are required" },
                { status: 400 }
            );
        }

        if (rating < 1 || rating > 5) {
            return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
        }

        const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true } });
        if (!listing) {
            return NextResponse.json({ error: "Listing not found" }, { status: 404 });
        }

        const review = await prisma.review.create({
            data: {
                listingId,
                guestName: guestName.trim(),
                rating,
                comment: comment.trim(),
            },
            include: {
                listing: { select: { id: true, title: true } },
            },
        });

        const adminId = (session.user as any).id as string;
        await logAdminAudit(adminId, 'review_create', review.id, 'review', {
            listingId,
            rating,
            guestName: guestName.trim(),
        });

        return NextResponse.json(review, { status: 201 });
    } catch (error) {
        console.error("Admin reviews POST error:", error);
        return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await request.json();
        if (!id) return NextResponse.json({ error: "Review id required" }, { status: 400 });

        await prisma.review.delete({ where: { id } });

        const adminId = (session.user as any).id as string;
        await logAdminAudit(adminId, 'review_delete', id, 'review');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Admin reviews DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
    }
}
