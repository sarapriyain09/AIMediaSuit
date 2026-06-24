import { ModuleType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/user-id";
import { buildBackgroundMusicHistoryItem } from "@/lib/background-music/metadata";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([]);
  }

  const userId = await resolveUserId(request);

  try {
    const rows = await prisma.mediaGeneration.findMany({
      where: {
        userId,
        moduleType: ModuleType.BACKGROUND_MUSIC,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(rows.map((row) => buildBackgroundMusicHistoryItem(row)));
  } catch {
    return NextResponse.json([]);
  }
}
