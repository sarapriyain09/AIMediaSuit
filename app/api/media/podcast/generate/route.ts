import { GenerationStatus, PodcastFormat, PodcastLength, PodcastTone } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/user-id";
import { prisma } from "@/lib/db/prisma";
import { generatePodcastSchema } from "@/lib/schemas/podcast";
import { jsonError } from "@/lib/utils/api-response";

export const runtime = "nodejs";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

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

function buildPrompt(input: {
  topic: string;
  audience: string;
  format: string;
  tone: string;
  length: string;
  hosts: string[];
  outline: string;
  prompt: string;
}) {
  const targetWordCount = input.length === "short" ? "500-800" : input.length === "medium" ? "900-1400" : "1500-2200";

  return [
    "You are an expert podcast scriptwriter for social media marketing.",
    `Write a ${input.format} podcast episode in a ${input.tone} tone for ${input.audience}.`,
    `Topic: ${input.topic}.`,
    `Target length: ${targetWordCount} words.`,
    `Hosts/Speakers: ${input.hosts.join(", ") || "Host"}.`,
    "Use clear section headings and speaker labels for dialogue sections.",
    "End with a short social media CTA and recap.",
    input.outline ? `Preferred outline: ${input.outline}` : "",
    "User request:",
    input.prompt,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonError("OPENAI_API_KEY is missing.", 500);
    }

    const raw = await request.json();
    const input = generatePodcastSchema.parse(raw);
    const userId = await resolveUserId(request);
    const resolvedTitle = input.title || input.topic.slice(0, 80);

    const model = process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini";
    const prompt = buildPrompt(input);

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
      return jsonError(`Podcast generation failed: ${response.status} ${errorText}`, 400);
    }

    const data = (await response.json()) as unknown;
    const script = getOutputText(data);
    if (!script) {
      return jsonError("Podcast generation returned empty output.", 500);
    }

    if (process.env.DATABASE_URL) {
      try {
        const created = await prisma.podcastGeneration.create({
          data: {
            userId,
            title: resolvedTitle,
            topic: input.topic,
            audience: input.audience,
            format: input.format as PodcastFormat,
            tone: input.tone as PodcastTone,
            length: input.length as PodcastLength,
            hosts: input.hosts,
            outline: input.outline,
            prompt: input.prompt,
            script,
            status: GenerationStatus.COMPLETED,
          },
        });

        return NextResponse.json({
          id: created.id,
          title: created.title,
          topic: created.topic,
          audience: created.audience,
          format: created.format,
          tone: created.tone,
          length: created.length,
          hosts: created.hosts,
          outline: created.outline,
          prompt: created.prompt,
          script: created.script,
          isFavorite: created.isFavorite,
          status: created.status,
          createdAt: created.createdAt.toISOString(),
          generatedAt: created.createdAt.toISOString(),
        });
      } catch {
        // Fall back to non-persistent response when DB is unavailable.
      }
    }

    return NextResponse.json({
      id: randomUUID(),
      title: resolvedTitle || "Untitled Episode",
      topic: input.topic,
      audience: input.audience,
      format: input.format,
      tone: input.tone,
      length: input.length,
      hosts: input.hosts,
      outline: input.outline,
      prompt: input.prompt,
      script,
      isFavorite: false,
      status: "COMPLETED",
      createdAt: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate podcast script.";
    return jsonError(message, 400);
  }
}
