import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveUserId } from "@/lib/auth/user-id";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([]);
  }

  const userId = await resolveUserId(request);

  try {
    const rows = await prisma.videoGeneration.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        title: row.title,
        topic: row.topic,
        audience: row.audience,
        style: row.style,
        aspectRatio: row.aspectRatio,
        durationSec: row.durationSec,
        prompt: row.prompt,
        outputText: row.outputText,
        sceneCount: row.sceneCount,
        includeVoiceover: row.includeVoiceover,
        outputUrl: row.outputUrl,
        isFavorite: row.isFavorite,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
    );
  } catch {
    return NextResponse.json([]);
  }
}
