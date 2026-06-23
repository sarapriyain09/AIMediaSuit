import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveUserId } from "@/lib/auth/user-id";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 400 });
  }

  const userId = await resolveUserId(request);
  const { id } = await params;

  try {
    const found = await prisma.subtitleGeneration.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!found) {
      return NextResponse.json({ error: "Subtitle not found." }, { status: 404 });
    }

    await prisma.subtitleGeneration.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Database is unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 400 });
  }

  const userId = await resolveUserId(request);
  const { id } = await params;

  try {
    const body = (await request.json()) as { isFavorite?: boolean };
    if (typeof body.isFavorite !== "boolean") {
      return NextResponse.json({ error: "isFavorite must be boolean." }, { status: 400 });
    }

    const found = await prisma.subtitleGeneration.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!found) {
      return NextResponse.json({ error: "Subtitle not found." }, { status: 404 });
    }

    const updated = await prisma.subtitleGeneration.update({
      where: { id },
      data: { isFavorite: body.isFavorite },
    });

    return NextResponse.json({ id: updated.id, isFavorite: updated.isFavorite });
  } catch {
    return NextResponse.json({ error: "Database is unavailable." }, { status: 503 });
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 400 });
  }

  const userId = await resolveUserId(request);
  const { id } = await params;

  try {
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (body.action !== "duplicate") {
      return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }

    const source = await prisma.subtitleGeneration.findFirst({
      where: { id, userId },
    });

    if (!source) {
      return NextResponse.json({ error: "Subtitle not found." }, { status: 404 });
    }

    const duplicated = await prisma.subtitleGeneration.create({
      data: {
        userId,
        title: `${source.title} (Copy)`,
        topic: source.topic,
        language: source.language,
        format: source.format,
        tone: source.tone,
        sourceText: source.sourceText,
        outputText: source.outputText,
        cueCount: source.cueCount,
        includeTimestamps: source.includeTimestamps,
        status: source.status,
        isFavorite: false,
      },
    });

    return NextResponse.json({
      id: duplicated.id,
      title: duplicated.title,
      createdAt: duplicated.createdAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Database is unavailable." }, { status: 503 });
  }
}
