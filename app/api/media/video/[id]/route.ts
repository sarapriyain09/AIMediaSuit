import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveUserId } from "@/lib/auth/user-id";
import { deleteVideoByPublicUrl } from "@/lib/storage/video-storage";

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
    const found = await prisma.videoGeneration.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!found) {
      return NextResponse.json({ error: "Video plan not found." }, { status: 404 });
    }

    const existing = await prisma.videoGeneration.findFirst({
      where: { id, userId },
      select: { outputUrl: true },
    });

    if (existing?.outputUrl) {
      await deleteVideoByPublicUrl(existing.outputUrl).catch(() => undefined);
    }

    await prisma.videoGeneration.delete({ where: { id } });
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

    const found = await prisma.videoGeneration.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!found) {
      return NextResponse.json({ error: "Video plan not found." }, { status: 404 });
    }

    const updated = await prisma.videoGeneration.update({
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

    const source = await prisma.videoGeneration.findFirst({
      where: { id, userId },
    });

    if (!source) {
      return NextResponse.json({ error: "Video plan not found." }, { status: 404 });
    }

    const duplicated = await prisma.videoGeneration.create({
      data: {
        userId,
        title: `${source.title} (Copy)`,
        topic: source.topic,
        audience: source.audience,
        style: source.style,
        aspectRatio: source.aspectRatio,
        durationSec: source.durationSec,
        prompt: source.prompt,
        outputText: source.outputText,
        sceneCount: source.sceneCount,
        includeVoiceover: source.includeVoiceover,
        outputUrl: source.outputUrl,
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
