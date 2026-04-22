import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { TaxAppliesTo } from "@prisma/client";
import { adminAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminAudit } from "@/lib/admin-audit";

const parseLines = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((line, index) => {
      if (!line || typeof line !== "object") return null;
      const raw = line as Record<string, unknown>;
      const label = typeof raw.label === "string" ? raw.label.trim() : "";
      const rate = Number(raw.rate ?? 0);
      const appliesTo = typeof raw.appliesTo === "string" ? raw.appliesTo.toUpperCase() : "ALL";
      const isValidAppliesTo = ["NIGHTLY", "CLEANING", "SERVICE", "ALL"].includes(appliesTo);

      if (!label || !Number.isFinite(rate) || rate <= 0) return null;
      return {
        label,
        rate,
        appliesTo: (isValidAppliesTo ? appliesTo : "ALL") as TaxAppliesTo,
        order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : index,
        isActive: raw.isActive === false ? false : true,
      };
    })
    .filter((line): line is NonNullable<typeof line> => Boolean(line));
};

export async function PUT(
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
    const lines = parseLines(body.lines);
    if (lines.length === 0) {
      return NextResponse.json({ error: "At least one tax line is required" }, { status: 400 });
    }

    const profile = await prisma.taxProfile.update({
      where: { id },
      data: {
        name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : undefined,
        country: typeof body.country === "string" && body.country.trim() ? body.country.trim().toUpperCase() : undefined,
        state: typeof body.state === "string" ? (body.state.trim() || null) : undefined,
        county: typeof body.county === "string" ? (body.county.trim() || null) : undefined,
        city: typeof body.city === "string" ? (body.city.trim() || null) : undefined,
        vatRate: Number.isFinite(Number(body.vatRate)) ? Number(body.vatRate) : undefined,
        gstRate: Number.isFinite(Number(body.gstRate)) ? Number(body.gstRate) : undefined,
        isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
        lines: {
          deleteMany: {},
          create: lines,
        },
      },
      include: {
        lines: {
          orderBy: { order: "asc" },
        },
      },
    });

    const adminId = (session.user as any).id as string;
    await logAdminAudit(adminId, 'tax_profile_update', id, 'tax_profile', { name: profile.name });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Update tax profile error:", error);
    return NextResponse.json({ error: "Failed to update tax profile" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    await prisma.listing.updateMany({
      where: { taxProfileId: id },
      data: { taxProfileId: null },
    });
    await prisma.taxProfile.delete({ where: { id } });

    const adminId = (session.user as any).id as string;
    await logAdminAudit(adminId, 'tax_profile_delete', id, 'tax_profile');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete tax profile error:", error);
    return NextResponse.json({ error: "Failed to delete tax profile" }, { status: 500 });
  }
}

