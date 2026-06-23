import { GenerationStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveUserId } from "@/lib/auth/user-id";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      totalVideosGenerated: 0,
      mostUsedStyle: "N/A",
      recentVideos: 0,
    });
  }

  const userId = await resolveUserId(request);

  try {
    const items = await prisma.videoGeneration.findMany({
      where: { userId, status: GenerationStatus.COMPLETED },
      select: { style: true, createdAt: true },
    });

    const styleCount = new Map<string, number>();
    for (const item of items) {
      styleCount.set(item.style, (styleCount.get(item.style) ?? 0) + 1);
    }

    const recentThreshold = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);

    return NextResponse.json({
      totalVideosGenerated: items.length,
      mostUsedStyle: [...styleCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A",
      recentVideos: items.filter((item) => item.createdAt >= recentThreshold).length,
    });
  } catch {
    return NextResponse.json({
      totalVideosGenerated: 0,
      mostUsedStyle: "N/A",
      recentVideos: 0,
    });
  }
}
