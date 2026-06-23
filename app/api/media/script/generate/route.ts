import { NextRequest, NextResponse } from "next/server";
import { generateScriptSchema } from "@/lib/schemas/script";
import { jsonError } from "@/lib/utils/api-response";

export const runtime = "nodejs";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

function buildPrompt(input: {
  goal: string;
  tone: string;
  length: string;
  audience: string;
  prompt: string;
  callToAction?: string;
}) {
  const targetWordCount = input.length === "short" ? "80-140" : input.length === "medium" ? "180-260" : "320-450";

  return [
    "You are an expert marketing copywriter.",
    `Create a ${input.goal} script with a ${input.tone} tone for ${input.audience}.`,
    `Target length: ${targetWordCount} words.`,
    "Use clear structure with headline and body. Keep it practical and conversion-focused.",
    input.callToAction ? `Include this CTA naturally near the end: ${input.callToAction}` : "Include a strong CTA at the end.",
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

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonError("OPENAI_API_KEY is missing.", 500);
    }

    const raw = await request.json();
    const input = generateScriptSchema.parse(raw);

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
      return jsonError(`Script generation failed: ${response.status} ${errorText}`, 400);
    }

    const data = (await response.json()) as unknown;
    const script = getOutputText(data);
    if (!script) {
      return jsonError("Script generation returned empty output.", 500);
    }

    return NextResponse.json({
      title: input.title || "Untitled Script",
      script,
      generatedAt: new Date().toISOString(),
      meta: {
        goal: input.goal,
        tone: input.tone,
        length: input.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate script.";
    return jsonError(message, 400);
  }
}