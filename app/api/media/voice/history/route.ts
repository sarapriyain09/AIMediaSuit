import { ModuleType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveUserId } from "@/lib/auth/user-id";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([]);
  }

  const userId = await resolveUserId(request);

  let rows: Array<{
    id: string;
    title: string;
    voice: string;
    duration: number | null;
    outputUrl: string | null;
    status: string;
    createdAt: Date;
  }> = [];

  try {
    rows = await prisma.mediaGeneration.findMany({
      where: {
        userId,
        moduleType: ModuleType.VOICE,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch {
    rows = [];
  }

  return NextResponse.json(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      voice: row.voice,
      duration: row.duration,
      outputUrl: row.outputUrl,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    })),
  );
}
