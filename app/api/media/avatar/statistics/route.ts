import { GenerationStatus, ModuleType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/user-id";
import { parseAvatarInputText } from "@/lib/avatar/metadata";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      totalAvatarsGenerated: 0,
      mostUsedPreset: "N/A",
      recentAvatars: 0,
    });
  }

  const userId = await resolveUserId(request);

  try {
    const rows = await prisma.mediaGeneration.findMany({
      where: {
        userId,
        moduleType: ModuleType.AVATAR,
        status: GenerationStatus.COMPLETED,
      },
      select: {
        inputText: true,
        createdAt: true,
      },
    });

    const totalAvatarsGenerated = rows.length;
    const counts = new Map<string, number>();

    for (const row of rows) {
      const preset = parseAvatarInputText(row.inputText).preset;
      counts.set(preset, (counts.get(preset) ?? 0) + 1);
    }

    const mostUsedPreset = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
    const recentThreshold = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
    const recentAvatars = rows.filter((row) => row.createdAt >= recentThreshold).length;

    return NextResponse.json({
      totalAvatarsGenerated,
      mostUsedPreset,
      recentAvatars,
    });
  } catch {
    return NextResponse.json({
      totalAvatarsGenerated: 0,
      mostUsedPreset: "N/A",
      recentAvatars: 0,
    });
  }
}
