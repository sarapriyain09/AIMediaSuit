import { GenerationStatus, ModuleType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveUserId } from "@/lib/auth/user-id";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      totalAudioGenerated: 0,
      totalMinutesGenerated: 0,
      mostUsedVoice: "N/A",
      recentFiles: 0,
    });
  }

  const userId = await resolveUserId(request);

  let items: Array<{ voice: string; duration: number | null; createdAt: Date }> = [];

  try {
    items = await prisma.mediaGeneration.findMany({
      where: {
        userId,
        moduleType: ModuleType.VOICE,
        status: GenerationStatus.COMPLETED,
      },
      select: {
        voice: true,
        duration: true,
        createdAt: true,
      },
    });
  } catch {
    return NextResponse.json({
      totalAudioGenerated: 0,
      totalMinutesGenerated: 0,
      mostUsedVoice: "N/A",
      recentFiles: 0,
    });
  }

  const totalAudioGenerated = items.length;
  const totalSeconds = items.reduce((sum, item) => sum + (item.duration ?? 0), 0);
  const totalMinutesGenerated = Number((totalSeconds / 60).toFixed(2));

  const voiceCount = new Map<string, number>();
  for (const item of items) {
    voiceCount.set(item.voice, (voiceCount.get(item.voice) ?? 0) + 1);
  }

  const mostUsedVoice = [...voiceCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
  const recentThreshold = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
  const recentFiles = items.filter((item) => item.createdAt >= recentThreshold).length;

  return NextResponse.json({
    totalAudioGenerated,
    totalMinutesGenerated,
    mostUsedVoice,
    recentFiles,
  });
}
