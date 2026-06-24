import { ModuleType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/user-id";
import { buildAvatarHistoryItem } from "@/lib/avatar/metadata";
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
        moduleType: ModuleType.AVATAR,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(rows.map((row) => buildAvatarHistoryItem(row)));
  } catch {
    return NextResponse.json([]);
  }
}
