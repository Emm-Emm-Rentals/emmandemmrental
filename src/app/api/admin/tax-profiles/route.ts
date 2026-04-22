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

export async function GET() {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const profiles = await prisma.taxProfile.findMany({
      include: {
        lines: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    return NextResponse.json(profiles);
  } catch (error) {
    console.error("Get tax profiles error:", error);
    return NextResponse.json({ error: "Failed to fetch tax profiles" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Profile name is required" }, { status: 400 });
    }

    const lines = parseLines(body.lines);
    if (lines.length === 0) {
      return NextResponse.json({ error: "At least one tax line is required" }, { status: 400 });
    }

    const profile = await prisma.taxProfile.create({
      data: {
        name,
        country: typeof body.country === "string" && body.country.trim() ? body.country.trim().toUpperCase() : "US",
        state: typeof body.state === "string" && body.state.trim() ? body.state.trim() : null,
        county: typeof body.county === "string" && body.county.trim() ? body.county.trim() : null,
        city: typeof body.city === "string" && body.city.trim() ? body.city.trim() : null,
        vatRate: Number.isFinite(Number(body.vatRate)) ? Number(body.vatRate) : 0,
        gstRate: Number.isFinite(Number(body.gstRate)) ? Number(body.gstRate) : 0,
        isActive: body.isActive === false ? false : true,
        lines: {
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
    await logAdminAudit(adminId, 'tax_profile_create', profile.id, 'tax_profile', { name: profile.name });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error("Create tax profile error:", error);
    return NextResponse.json({ error: "Failed to create tax profile" }, { status: 500 });
  }
}

