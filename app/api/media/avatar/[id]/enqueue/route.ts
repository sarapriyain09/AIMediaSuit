import { GenerationStatus, ModuleType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/user-id";
import { buildAvatarHistoryItem, buildAvatarInputText, parseAvatarInputText } from "@/lib/avatar/metadata";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
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
        moduleType: ModuleType.AVATAR,
      },
    });

    if (!found) {
      return NextResponse.json({ error: "Avatar generation not found." }, { status: 404 });
    }

    if (found.status === GenerationStatus.PROCESSING) {
      return NextResponse.json({ error: "Avatar job is already processing." }, { status: 409 });
    }

    const parsed = parseAvatarInputText(found.inputText);

    const updated = await prisma.mediaGeneration.update({
      where: { id: found.id },
      data: {
        inputText: buildAvatarInputText({
          script: parsed.script,
          preset: parsed.preset,
          background: parsed.background,
          language: parsed.language,
          aspectRatio: parsed.aspectRatio,
          voiceAudioUrl: parsed.voiceAudioUrl ?? "",
          backgroundImageUrl: parsed.backgroundImageUrl ?? "",
          renderMode: "queue",
        }),
        status: GenerationStatus.PENDING,
      },
    });

    return NextResponse.json({
      ...buildAvatarHistoryItem(updated),
      queuedAt: new Date().toISOString(),
      meta: {
        phase: "phase-2",
        render: "queued",
      },
    });
  } catch {
    return NextResponse.json({ error: "Database is unavailable." }, { status: 503 });
  }
}
