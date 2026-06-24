import { GenerationStatus, ModuleType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/user-id";
import { parseBackgroundMusicMetadata } from "@/lib/background-music/metadata";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      totalTracksGenerated: 0,
      mostUsedCategory: "N/A",
      recentTracks: 0,
    });
  }

  const userId = await resolveUserId(request);

  try {
    const items = await prisma.mediaGeneration.findMany({
      where: {
        userId,
        moduleType: ModuleType.BACKGROUND_MUSIC,
        status: GenerationStatus.COMPLETED,
      },
      select: {
        inputText: true,
        createdAt: true,
      },
    });

    const totalTracksGenerated = items.length;
    const counts = new Map<string, number>();

    for (const item of items) {
      const category = parseBackgroundMusicMetadata(item.inputText).category;
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }

    const mostUsedCategory = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
    const recentThreshold = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
    const recentTracks = items.filter((item) => item.createdAt >= recentThreshold).length;

    return NextResponse.json({
      totalTracksGenerated,
      mostUsedCategory,
      recentTracks,
    });
  } catch {
    return NextResponse.json({
      totalTracksGenerated: 0,
      mostUsedCategory: "N/A",
      recentTracks: 0,
    });
  }
}
