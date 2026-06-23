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
        visualStyle: row.visualStyle,
        imagePrompt: row.imagePrompt,
        images: Array.isArray(row.images) ? row.images : [],
        subtitleSourceLanguage: row.subtitleSourceLanguage,
        subtitleTargetLanguages: row.subtitleTargetLanguages,
        subtitleCues: Array.isArray(row.subtitleCues) ? row.subtitleCues : [],
        subtitleTranslations:
          row.subtitleTranslations && typeof row.subtitleTranslations === "object" && !Array.isArray(row.subtitleTranslations)
            ? row.subtitleTranslations
            : {},
        voiceoverText: row.voiceoverText,
        voiceover:
          row.voiceover && typeof row.voiceover === "object" && !Array.isArray(row.voiceover)
            ? row.voiceover
            : null,
        isFavorite: row.isFavorite,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
    );
  } catch {
    return NextResponse.json([]);
  }
}
