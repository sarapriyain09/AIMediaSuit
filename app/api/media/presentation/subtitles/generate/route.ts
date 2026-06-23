import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveUserId } from "@/lib/auth/user-id";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/utils/api-response";

export const runtime = "nodejs";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";

const schema = z.object({
  presentationId: z.string().uuid().optional(),
  voiceoverText: z.string().max(12000).optional().default(""),
  audioBase64: z.string().optional().default(""),
  audioMimeType: z.string().optional().default("audio/mpeg"),
  sourceLanguage: z.string().min(2).max(40).optional().default("English"),
  targetLanguages: z.array(z.string().min(2).max(40)).optional().default([]),
});

type Cue = { startSec: number; endSec: number; text: string };

function chunkToCues(text: string): Cue[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) {
    return [];
  }

  const parts = clean
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  let t = 0;
  return parts.map((part) => {
    const duration = Math.max(1.2, Math.min(6, part.length / 14));
    const cue = { startSec: Number(t.toFixed(2)), endSec: Number((t + duration).toFixed(2)), text: part };
    t += duration;
    return cue;
  });
}

async function responsesText(apiKey: string, prompt: string) {
  const resp = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TEXT_MODEL ?? "gpt-4.1-mini",
      input: prompt,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Responses API failed (${resp.status}).`);
  }

  const data = (await resp.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };

  if (typeof data.output_text === "string") {
    return data.output_text.trim();
  }

  const alt = data.output
    ?.flatMap((block) => block.content ?? [])
    .map((part) => part.text)
    .filter((part): part is string => typeof part === "string")
    .join("\n")
    .trim();

  return alt ?? "";
}

async function transcribeAudio(apiKey: string, audioBase64: string, audioMimeType: string) {
  const bytes = Buffer.from(audioBase64, "base64");
  const blob = new Blob([bytes], { type: audioMimeType || "audio/mpeg" });
  const formData = new FormData();
  formData.append("model", process.env.OPENAI_STT_MODEL ?? "whisper-1");
  formData.append("file", blob, "voiceover-input.mp3");

  const resp = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Transcription failed: ${resp.status} ${errorText}`);
  }

  const data = (await resp.json()) as { text?: string };
  return data.text?.trim() ?? "";
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonError("OPENAI_API_KEY is missing.", 500);
    }

    const input = schema.parse(await request.json());
    const userId = await resolveUserId(request);

    let transcript = input.voiceoverText.trim();
    if (!transcript && input.audioBase64) {
      transcript = await transcribeAudio(apiKey, input.audioBase64, input.audioMimeType);
    }

    if (!transcript) {
      return jsonError("Provide voiceover text or audio input.", 400);
    }

    const cues = chunkToCues(transcript);

    const translations: Record<string, string[]> = {};
    for (const language of input.targetLanguages) {
      const translated = await responsesText(
        apiKey,
        `Translate each subtitle line into ${language}. Return one translated line per input line in the same order.\n\nInput lines:\n${cues
          .map((cue) => cue.text)
          .join("\n")}`,
      );

      translations[language] = translated
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    }

    if (input.presentationId && process.env.DATABASE_URL) {
      try {
        const current = await prisma.presentationGeneration.findFirst({
          where: {
            id: input.presentationId,
            userId,
          },
          select: { id: true },
        });

        if (current) {
          await prisma.presentationGeneration.update({
            where: { id: current.id },
            data: {
              subtitleSourceLanguage: input.sourceLanguage,
              subtitleTargetLanguages: input.targetLanguages,
              subtitleCues: cues,
              subtitleTranslations: translations,
              voiceoverText: transcript,
            },
          });
        }
      } catch {
        // Keep response successful even if persistence fails.
      }
    }

    return NextResponse.json({
      transcript,
      sourceLanguage: input.sourceLanguage,
      cues,
      translations,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate subtitles.";
    return jsonError(message, 400);
  }
}
