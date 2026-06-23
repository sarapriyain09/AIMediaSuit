import { GenerationStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/user-id";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      totalEpisodesGenerated: 0,
      mostUsedFormat: "N/A",
      recentEpisodes: 0,
    });
  }

  const userId = await resolveUserId(request);

  try {
    const items = await prisma.podcastGeneration.findMany({
      where: {
        userId,
        status: GenerationStatus.COMPLETED,
      },
      select: {
        format: true,
        createdAt: true,
      },
    });

    const totalEpisodesGenerated = items.length;
    const formatCount = new Map<string, number>();

    for (const item of items) {
      formatCount.set(item.format, (formatCount.get(item.format) ?? 0) + 1);
    }

    const mostUsedFormat = [...formatCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
    const recentThreshold = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
    const recentEpisodes = items.filter((item) => item.createdAt >= recentThreshold).length;

    return NextResponse.json({
      totalEpisodesGenerated,
      mostUsedFormat,
      recentEpisodes,
    });
  } catch {
    return NextResponse.json({
      totalEpisodesGenerated: 0,
      mostUsedFormat: "N/A",
      recentEpisodes: 0,
    });
  }
}
