import { ModuleType } from "@prisma/client";
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
    const found = await prisma.mediaGeneration.findFirst({
      where: {
        id,
        userId,
        moduleType: ModuleType.BACKGROUND_MUSIC,
      },
      select: {
        id: true,
        outputUrl: true,
      },
    });

    if (!found) {
      return NextResponse.json({ error: "Background music track not found." }, { status: 404 });
    }

    if (found.outputUrl) {
      await deleteAudioByPublicUrl(found.outputUrl).catch(() => undefined);
    }

    await prisma.mediaGeneration.delete({ where: { id: found.id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Database is unavailable." }, { status: 503 });
  }
}
