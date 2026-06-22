import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveUserId } from "@/lib/auth/user-id";
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

  let generation: { outputUrl: string | null } | null = null;

  try {
    generation = await prisma.mediaGeneration.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        outputUrl: true,
      },
    });
  } catch {
    return NextResponse.json({ error: "Database is unavailable." }, { status: 503 });
  }

  if (!generation) {
    return NextResponse.json({ error: "Recording not found." }, { status: 404 });
  }

  if (generation.outputUrl) {
    await deleteAudioByPublicUrl(generation.outputUrl);
  }

  try {
    await prisma.mediaGeneration.delete({
      where: { id },
    });
  } catch {
    return NextResponse.json({ error: "Database is unavailable." }, { status: 503 });
  }

  return new NextResponse(null, { status: 204 });
}
