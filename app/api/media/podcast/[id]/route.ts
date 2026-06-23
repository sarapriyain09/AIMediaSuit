import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/user-id";
import { prisma } from "@/lib/db/prisma";
import { deleteAudioByPublicUrl } from "@/lib/storage/audio-storage";

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
    const found = await prisma.podcastGeneration.findFirst({
      where: { id, userId },
      select: { id: true, outputUrl: true, segments: true },
    });

    if (!found) {
      return NextResponse.json({ error: "Episode not found." }, { status: 404 });
    }

    if (found.outputUrl) {
      await deleteAudioByPublicUrl(found.outputUrl);
    }

    if (Array.isArray(found.segments)) {
      for (const segment of found.segments) {
        const outputUrl = typeof segment === "object" && segment && "outputUrl" in segment ? (segment as { outputUrl?: unknown }).outputUrl : null;
        if (typeof outputUrl === "string" && outputUrl) {
          await deleteAudioByPublicUrl(outputUrl);
        }
      }
    }

    await prisma.podcastGeneration.delete({ where: { id } });
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

    const found = await prisma.podcastGeneration.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!found) {
      return NextResponse.json({ error: "Episode not found." }, { status: 404 });
    }

    const updated = await prisma.podcastGeneration.update({
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

    const source = await prisma.podcastGeneration.findFirst({
      where: { id, userId },
    });

    if (!source) {
      return NextResponse.json({ error: "Episode not found." }, { status: 404 });
    }

    const duplicated = await prisma.podcastGeneration.create({
      data: {
        userId,
        title: `${source.title} (Copy)`,
        topic: source.topic,
        audience: source.audience,
        format: source.format,
        tone: source.tone,
        length: source.length,
        hosts: source.hosts,
        outline: source.outline,
        prompt: source.prompt,
        script: source.script,
        outputUrl: source.outputUrl,
        duration: source.duration,
        segmentCount: source.segmentCount,
        ...(source.segments === null ? {} : { segments: source.segments }),
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
