import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/user-id";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([]);
  }

  const userId = await resolveUserId(request);

  try {
    const rows = await prisma.podcastGeneration.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      rows.map((row: {
        id: string;
        title: string;
        topic: string;
        audience: string;
        format: string;
        tone: string;
        length: string;
        hosts: string[];
        outline: string;
        prompt: string;
        script: string;
        isFavorite: boolean;
        status: string;
        createdAt: Date;
      }) => ({
        id: row.id,
        title: row.title,
        topic: row.topic,
        audience: row.audience,
        format: row.format,
        tone: row.tone,
        length: row.length,
        hosts: row.hosts,
        outline: row.outline,
        prompt: row.prompt,
        script: row.script,
        isFavorite: row.isFavorite,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
    );
  } catch {
    return NextResponse.json([]);
  }
}
