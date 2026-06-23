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
    const rows = await prisma.subtitleGeneration.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        title: row.title,
        topic: row.topic,
        language: row.language,
        format: row.format,
        tone: row.tone,
        sourceText: row.sourceText,
        outputText: row.outputText,
        cueCount: row.cueCount,
        includeTimestamps: row.includeTimestamps,
        isFavorite: row.isFavorite,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
    );
  } catch {
    return NextResponse.json([]);
  }
}
