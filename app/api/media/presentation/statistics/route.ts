import { GenerationStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveUserId } from "@/lib/auth/user-id";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      totalDecksGenerated: 0,
      mostUsedGoal: "N/A",
      recentDecks: 0,
    });
  }

  const userId = await resolveUserId(request);

  try {
    const items = await prisma.presentationGeneration.findMany({
      where: {
        userId,
        status: GenerationStatus.COMPLETED,
      },
      select: {
        goal: true,
        createdAt: true,
      },
    });

    const totalDecksGenerated = items.length;
    const goalCount = new Map<string, number>();

    for (const item of items) {
      goalCount.set(item.goal, (goalCount.get(item.goal) ?? 0) + 1);
    }

    const mostUsedGoal = [...goalCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
    const recentThreshold = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
    const recentDecks = items.filter((item) => item.createdAt >= recentThreshold).length;

    return NextResponse.json({
      totalDecksGenerated,
      mostUsedGoal,
      recentDecks,
    });
  } catch {
    return NextResponse.json({
      totalDecksGenerated: 0,
      mostUsedGoal: "N/A",
      recentDecks: 0,
    });
  }
}
