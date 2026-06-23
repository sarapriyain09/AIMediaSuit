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
    const rows = await prisma.presentationGeneration.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        title: row.title,
        goal: row.goal,
        tone: row.tone,
        length: row.length,
        audience: row.audience,
        topic: row.topic,
        prompt: row.prompt,
        outputText: row.outputText,
        slideCount: row.slideCount,
        includeSpeakerNotes: row.includeSpeakerNotes,
        isFavorite: row.isFavorite,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
    );
  } catch {
    return NextResponse.json([]);
  }
}
