import { GenerationStatus, PodcastFormat, PodcastLength, PodcastTone } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/user-id";
import { prisma } from "@/lib/db/prisma";
import { VoiceProviderFactory } from "@/lib/providers/voice-provider-factory";
import { generatePodcastSchema } from "@/lib/schemas/podcast";
import { saveAudioFile } from "@/lib/storage/audio-storage";
import { jsonError } from "@/lib/utils/api-response";
import { type VoiceType, voiceList } from "@/types/media";

export const runtime = "nodejs";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

type PodcastSegment = {
  speaker: string;
  voice: VoiceType;
  text: string;
  outputUrl: string | null;
  duration: number;
};

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

function normalizeText(value: string) {
  return value.replace(/\r/g, "").trim();
}

function splitIntoSegments(script: string, hosts: string[]): Array<{ speaker: string; text: string }> {
  const cleanScript = normalizeText(script);
  const lines = cleanScript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const speakerSet = new Set(hosts.map((host) => host.toLowerCase()));
  const segments: Array<{ speaker: string; text: string }> = [];
  let currentSpeaker = hosts[0] ?? "Host";
  let currentLines: string[] = [];

  const pushCurrent = () => {
    const text = currentLines.join(" ").trim();
    if (text) {
      segments.push({ speaker: currentSpeaker, text });
    }
    currentLines = [];
  };

  for (const line of lines) {
    const speakerMatch = line.match(/^([A-Za-z0-9 ]{2,40}):\s*(.+)$/);
    if (speakerMatch) {
      const detectedSpeaker = speakerMatch[1].trim();
      const detectedText = speakerMatch[2].trim();
      const resolvedSpeaker = speakerSet.has(detectedSpeaker.toLowerCase()) ? detectedSpeaker : currentSpeaker;
      pushCurrent();
      currentSpeaker = resolvedSpeaker;
      currentLines.push(detectedText);
      continue;
    }

    currentLines.push(line);
  }

  pushCurrent();

  if (segments.length > 0) {
    return segments;
  }

  const chunkSize = 4;
  const fallbackSegments: Array<{ speaker: string; text: string }> = [];
  for (let i = 0; i < lines.length; i += chunkSize) {
    const speaker = hosts[(fallbackSegments.length % Math.max(1, hosts.length))] ?? "Host";
    fallbackSegments.push({
      speaker,
      text: lines.slice(i, i + chunkSize).join(" "),
    });
  }

  return fallbackSegments;
}

async function synthesizeSegments(segments: Array<{ speaker: string; text: string }>, hosts: string[]) {
  const provider = VoiceProviderFactory.resolve();
  const hostVoiceMap = new Map<string, VoiceType>();
  const hostKeys = hosts.length > 0 ? hosts : ["Host"];

  hostKeys.forEach((host, index) => {
    hostVoiceMap.set(host.toLowerCase(), voiceList[index % voiceList.length]);
  });

  const detailedSegments: PodcastSegment[] = [];
  const audioChunks: Buffer[] = [];

  for (const segment of segments) {
    const voice = hostVoiceMap.get(segment.speaker.toLowerCase()) ?? voiceList[0];
    const mp3Bytes = await provider.generateSpeechMp3(segment.text, voice, 1);
    const { urlPath } = await saveAudioFile(mp3Bytes);
    const duration = Math.max(1, Math.round(segment.text.length / 14));

    audioChunks.push(mp3Bytes);
    detailedSegments.push({
      speaker: segment.speaker,
      voice,
      text: segment.text,
      outputUrl: urlPath,
      duration,
    });
  }

  let outputUrl: string | null = null;
  if (audioChunks.length > 0) {
    const stitched = Buffer.concat(audioChunks);
    const saved = await saveAudioFile(stitched);
    outputUrl = saved.urlPath;
  }

  const duration = detailedSegments.reduce((sum, segment) => sum + segment.duration, 0);
  return { detailedSegments, outputUrl, duration };
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

    const scriptSegments = splitIntoSegments(script, input.hosts);
    let segments: PodcastSegment[] = scriptSegments.map((segment, index) => ({
      speaker: segment.speaker,
      voice: voiceList[index % voiceList.length],
      text: segment.text,
      outputUrl: null,
      duration: Math.max(1, Math.round(segment.text.length / 14)),
    }));
    let outputUrl: string | null = null;
    let duration = segments.reduce((sum, segment) => sum + segment.duration, 0);

    if (input.synthesizeAudio) {
      try {
        const synthesized = await synthesizeSegments(scriptSegments, input.hosts);
        segments = synthesized.detailedSegments;
        outputUrl = synthesized.outputUrl;
        duration = synthesized.duration;
      } catch {
        // Keep script result even if TTS synthesis fails.
      }
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
            outputUrl,
            duration,
            segmentCount: segments.length,
            segments,
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
          outputUrl: created.outputUrl,
          duration: created.duration,
          segmentCount: created.segmentCount,
          segments: Array.isArray(created.segments) ? created.segments : segments,
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
      outputUrl,
      duration,
      segmentCount: segments.length,
      segments,
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
