import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/user-id";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([]);
  }

  const userId = await resolveUserId(request);
  const { id } = await params;

  try {
    const parent = await prisma.presentationGeneration.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!parent) {
      return NextResponse.json([]);
    }

    const versions = await prisma.presentationVersion.findMany({
      where: { presentationId: id },
      orderBy: { versionNumber: "desc" },
    });

    return NextResponse.json(
      versions.map((version) => ({
        id: version.id,
        versionNumber: version.versionNumber,
        note: version.note,
        snapshotText: version.snapshotText,
        createdAt: version.createdAt.toISOString(),
      })),
    );
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 400 });
  }

  const userId = await resolveUserId(request);
  const { id } = await params;

  try {
    const body = (await request.json()) as { note?: string; snapshotText?: string };
    const snapshotText = body.snapshotText?.trim() ?? "";
    if (!snapshotText) {
      return NextResponse.json({ error: "snapshotText is required." }, { status: 400 });
    }

    const parent = await prisma.presentationGeneration.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!parent) {
      return NextResponse.json({ error: "Presentation not found." }, { status: 404 });
    }

    const latest = await prisma.presentationVersion.findFirst({
      where: { presentationId: id },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });

    const created = await prisma.presentationVersion.create({
      data: {
        presentationId: id,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        note: body.note?.trim() || null,
        snapshotText,
      },
    });

    return NextResponse.json({
      id: created.id,
      versionNumber: created.versionNumber,
      note: created.note,
      snapshotText: created.snapshotText,
      createdAt: created.createdAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Database is unavailable." }, { status: 503 });
  }
}
