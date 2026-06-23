import { GenerationStatus, PresentationGoal, PresentationLength, PresentationTone } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/user-id";
import { prisma } from "@/lib/db/prisma";
import { generatePresentationSchema } from "@/lib/schemas/presentation";
import { jsonError } from "@/lib/utils/api-response";

export const runtime = "nodejs";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

function buildPrompt(input: {
  goal: string;
  tone: string;
  length: string;
  audience: string;
  topic: string;
  prompt: string;
  includeSpeakerNotes: boolean;
}) {
  const targetSlides = input.length === "short" ? "6-8" : input.length === "medium" ? "10-14" : "15-20";

  return [
    "You are an expert presentation strategist.",
    `Create a ${input.goal} presentation deck in a ${input.tone} tone for ${input.audience}.`,
    `Topic: ${input.topic}.`,
    `Target slides: ${targetSlides}.`,
    "Return output in plain text using this structure exactly:",
    "Slide 1: <Title>",
    "- Bullet 1",
    "- Bullet 2",
    input.includeSpeakerNotes ? "Speaker Notes: <short notes>" : "Do not include speaker notes.",
    "Include a strong opening and a clear closing CTA.",
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

function estimateSlideCount(text: string) {
  const matches = text.match(/(^|\n)\s*Slide\s+\d+\s*:/gi);
  if (matches && matches.length > 0) {
    return matches.length;
  }

  return Math.max(1, Math.round(text.length / 400));
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonError("OPENAI_API_KEY is missing.", 500);
    }

    const raw = await request.json();
    const input = generatePresentationSchema.parse(raw);
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
      return jsonError(`Presentation generation failed: ${response.status} ${errorText}`, 400);
    }

    const data = (await response.json()) as unknown;
    const outputText = getOutputText(data);
    if (!outputText) {
      return jsonError("Presentation generation returned empty output.", 500);
    }

    const slideCount = estimateSlideCount(outputText);

    if (process.env.DATABASE_URL) {
      try {
        const created = await prisma.presentationGeneration.create({
          data: {
            userId,
            title: resolvedTitle,
            goal: input.goal as PresentationGoal,
            tone: input.tone as PresentationTone,
            length: input.length as PresentationLength,
            audience: input.audience,
            topic: input.topic,
            prompt: input.prompt,
            outputText,
            slideCount,
            includeSpeakerNotes: input.includeSpeakerNotes,
            status: GenerationStatus.COMPLETED,
          },
        });

        return NextResponse.json({
          id: created.id,
          title: created.title,
          outputText: created.outputText,
          slideCount: created.slideCount,
          includeSpeakerNotes: created.includeSpeakerNotes,
          isFavorite: created.isFavorite,
          status: created.status,
          createdAt: created.createdAt.toISOString(),
          generatedAt: created.createdAt.toISOString(),
          meta: {
            goal: created.goal,
            tone: created.tone,
            length: created.length,
            audience: created.audience,
            topic: created.topic,
          },
        });
      } catch {
        // Fall back to non-persistent response when DB is unavailable.
      }
    }

    return NextResponse.json({
      id: randomUUID(),
      title: resolvedTitle || "Untitled Presentation",
      outputText,
      slideCount,
      includeSpeakerNotes: input.includeSpeakerNotes,
      isFavorite: false,
      status: "COMPLETED",
      createdAt: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
      meta: {
        goal: input.goal,
        tone: input.tone,
        length: input.length,
        audience: input.audience,
        topic: input.topic,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate presentation.";
    return jsonError(message, 400);
  }
}
