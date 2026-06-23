import { GenerationStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveUserId } from "@/lib/auth/user-id";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      totalSubtitlesGenerated: 0,
      mostUsedFormat: "N/A",
      recentSubtitles: 0,
    });
  }

  const userId = await resolveUserId(request);

  try {
    const items = await prisma.subtitleGeneration.findMany({
      where: {
        userId,
        status: GenerationStatus.COMPLETED,
      },
      select: {
        format: true,
        createdAt: true,
      },
    });

    const totalSubtitlesGenerated = items.length;
    const formatCount = new Map<string, number>();

    for (const item of items) {
      formatCount.set(item.format, (formatCount.get(item.format) ?? 0) + 1);
    }

    const mostUsedFormat = [...formatCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
    const recentThreshold = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
    const recentSubtitles = items.filter((item) => item.createdAt >= recentThreshold).length;

    return NextResponse.json({
      totalSubtitlesGenerated,
      mostUsedFormat,
      recentSubtitles,
    });
  } catch {
    return NextResponse.json({
      totalSubtitlesGenerated: 0,
      mostUsedFormat: "N/A",
      recentSubtitles: 0,
    });
  }
}
