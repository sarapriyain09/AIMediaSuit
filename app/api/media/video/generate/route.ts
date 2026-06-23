import { GenerationStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/user-id";
import { prisma } from "@/lib/db/prisma";
import { generateVideoSchema } from "@/lib/schemas/video";
import { jsonError } from "@/lib/utils/api-response";

export const runtime = "nodejs";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

function buildPrompt(input: {
  topic: string;
  audience: string;
  style: string;
  aspectRatio: string;
  durationSec: number;
  prompt: string;
  includeVoiceover: boolean;
}) {
  const targetScenes = Math.max(4, Math.min(12, Math.round(input.durationSec / 10)));

  return [
    "You are an expert video creative director.",
    `Create a ${input.style} video plan for ${input.audience}.`,
    `Topic: ${input.topic}.`,
    `Aspect ratio: ${input.aspectRatio}.`,
    `Duration: around ${input.durationSec} seconds.`,
    `Target scenes: ${targetScenes}.`,
    "Return plain text in this structure:",
    "Scene 1: <Scene title>",
    "- Visual: <shot direction>",
    "- Caption: <on-screen text>",
    input.includeVoiceover ? "- Voiceover: <narration line>" : "Do not include voiceover lines.",
    "Keep each scene concise and production-ready.",
    "User request:",
    input.prompt,
  ].join("\n");
}

function getOutputText(raw: unknown): string {
  if (!raw || typeof raw !== "object") {
    return "";
  }

  const candidate = raw as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };

  if (typeof candidate.output_text === "string") {
    return candidate.output_text.trim();
  }

  const textFromBlocks = candidate.output
    ?.flatMap((block) => block.content ?? [])
    .map((part) => part.text)
    .filter((part): part is string => typeof part === "string")
    .join("\n")
    .trim();

  return textFromBlocks ?? "";
}

function estimateSceneCount(text: string) {
  const matches = text.match(/(^|\n)\s*Scene\s+\d+\s*:/gi);
  if (matches && matches.length > 0) {
    return matches.length;
  }

  return Math.max(1, Math.round(text.length / 280));
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonError("OPENAI_API_KEY is missing.", 500);
    }

    const raw = await request.json();
    const input = generateVideoSchema.parse(raw);
    const userId = await resolveUserId(request);
    const resolvedTitle = input.title || input.topic.slice(0, 80);

    const prompt = buildPrompt(input);
    const model = process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini";

    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: prompt }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return jsonError(`Video generation failed: ${response.status} ${errorText}`, 400);
    }

    const data = (await response.json()) as unknown;
    const outputText = getOutputText(data);
    if (!outputText) {
      return jsonError("Video generation returned empty output.", 500);
    }

    const sceneCount = estimateSceneCount(outputText);

    if (process.env.DATABASE_URL) {
      try {
        const created = await prisma.videoGeneration.create({
          data: {
            userId,
            title: resolvedTitle,
            topic: input.topic,
            audience: input.audience,
            style: input.style,
            aspectRatio: input.aspectRatio,
            durationSec: input.durationSec,
            prompt: input.prompt,
            outputText,
            sceneCount,
            includeVoiceover: input.includeVoiceover,
            status: GenerationStatus.COMPLETED,
          },
        });

        return NextResponse.json({
          id: created.id,
          title: created.title,
          outputText: created.outputText,
          sceneCount: created.sceneCount,
          includeVoiceover: created.includeVoiceover,
          outputUrl: created.outputUrl,
          isFavorite: created.isFavorite,
          status: created.status,
          createdAt: created.createdAt.toISOString(),
          generatedAt: created.createdAt.toISOString(),
          meta: {
            topic: created.topic,
            audience: created.audience,
            style: created.style,
            aspectRatio: created.aspectRatio,
            durationSec: created.durationSec,
          },
        });
      } catch {
        // Return generated content without persistence if database is unavailable.
      }
    }

    return NextResponse.json({
      id: randomUUID(),
      title: resolvedTitle || "Untitled Video",
      outputText,
      sceneCount,
      includeVoiceover: input.includeVoiceover,
      outputUrl: null,
      isFavorite: false,
      status: "COMPLETED",
      createdAt: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
      meta: {
        topic: input.topic,
        audience: input.audience,
        style: input.style,
        aspectRatio: input.aspectRatio,
        durationSec: input.durationSec,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate video plan.";
    return jsonError(message, 400);
  }
}
