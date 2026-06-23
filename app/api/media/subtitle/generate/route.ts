import { GenerationStatus, SubtitleFormat, SubtitleTone } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/user-id";
import { prisma } from "@/lib/db/prisma";
import { generateSubtitleSchema } from "@/lib/schemas/subtitle";
import { jsonError } from "@/lib/utils/api-response";

export const runtime = "nodejs";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

function buildPrompt(input: {
  topic: string;
  language: string;
  format: string;
  tone: string;
  sourceText: string;
  includeTimestamps: boolean;
}) {
  const cueGuide =
    input.format === "vtt"
      ? "Use WebVTT style with 'WEBVTT' header and cue timestamps."
      : input.format === "captions"
        ? "Return concise caption blocks that can be pasted as on-screen subtitles."
        : "Use standard SRT numbering with SRT timestamps.";

  return [
    "You are an expert subtitle editor.",
    `Generate ${input.format.toUpperCase()} subtitles in ${input.language}.`,
    `Topic context: ${input.topic}.`,
    `Tone preference: ${input.tone}.`,
    cueGuide,
    input.includeTimestamps ? "Include timestamps for every cue." : "Do not include timestamps.",
    "Keep cue lines short and readable.",
    "Source text/transcript:",
    input.sourceText,
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

function estimateCueCount(text: string) {
  const timestampMatches = text.match(/\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/g);
  if (timestampMatches && timestampMatches.length > 0) {
    return timestampMatches.length;
  }

  const numberedBlocks = text.match(/(^|\n)\d+\s*(\n|$)/g);
  if (numberedBlocks && numberedBlocks.length > 0) {
    return numberedBlocks.length;
  }

  return Math.max(1, Math.round(text.length / 120));
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonError("OPENAI_API_KEY is missing.", 500);
    }

    const raw = await request.json();
    const input = generateSubtitleSchema.parse(raw);
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
      body: JSON.stringify({
        model,
        input: prompt,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return jsonError(`Subtitle generation failed: ${response.status} ${errorText}`, 400);
    }

    const data = (await response.json()) as unknown;
    const outputText = getOutputText(data);
    if (!outputText) {
      return jsonError("Subtitle generation returned empty output.", 500);
    }

    const cueCount = estimateCueCount(outputText);

    if (process.env.DATABASE_URL) {
      try {
        const created = await prisma.subtitleGeneration.create({
          data: {
            userId,
            title: resolvedTitle,
            topic: input.topic,
            language: input.language,
            format: input.format as SubtitleFormat,
            tone: input.tone as SubtitleTone,
            sourceText: input.sourceText,
            outputText,
            cueCount,
            includeTimestamps: input.includeTimestamps,
            status: GenerationStatus.COMPLETED,
          },
        });

        return NextResponse.json({
          id: created.id,
          title: created.title,
          outputText: created.outputText,
          cueCount: created.cueCount,
          includeTimestamps: created.includeTimestamps,
          isFavorite: created.isFavorite,
          status: created.status,
          createdAt: created.createdAt.toISOString(),
          generatedAt: created.createdAt.toISOString(),
          meta: {
            topic: created.topic,
            language: created.language,
            format: created.format,
            tone: created.tone,
          },
        });
      } catch {
        // Return generated output without persistence when database is unavailable.
      }
    }

    return NextResponse.json({
      id: randomUUID(),
      title: resolvedTitle || "Untitled Subtitle",
      outputText,
      cueCount,
      includeTimestamps: input.includeTimestamps,
      isFavorite: false,
      status: "COMPLETED",
      createdAt: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
      meta: {
        topic: input.topic,
        language: input.language,
        format: input.format,
        tone: input.tone,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate subtitles.";
    return jsonError(message, 400);
  }
}
