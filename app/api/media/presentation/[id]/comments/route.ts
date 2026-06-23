import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/user-id";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([]);
  }

  const userId = await resolveUserId(request);
  const { id } = await params;

  try {
    const parent = await prisma.presentationGeneration.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!parent) {
      return NextResponse.json([]);
    }

    const comments = await prisma.presentationComment.findMany({
      where: { presentationId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      comments.map((comment) => ({
        id: comment.id,
        author: comment.author,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
      })),
    );
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 400 });
  }

  const userId = await resolveUserId(request);
  const { id } = await params;

  try {
    const body = (await request.json()) as { content?: string; author?: string };
    const content = body.content?.trim() ?? "";
    if (!content) {
      return NextResponse.json({ error: "content is required." }, { status: 400 });
    }

    const parent = await prisma.presentationGeneration.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!parent) {
      return NextResponse.json({ error: "Presentation not found." }, { status: 404 });
    }

    const created = await prisma.presentationComment.create({
      data: {
        presentationId: id,
        author: body.author?.trim() || "Editor",
        content,
      },
    });

    return NextResponse.json({
      id: created.id,
      author: created.author,
      content: created.content,
      createdAt: created.createdAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Database is unavailable." }, { status: 503 });
  }
}
