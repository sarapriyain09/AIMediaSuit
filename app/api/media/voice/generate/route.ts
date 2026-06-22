import { ModuleType, GenerationStatus, VoiceType } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveUserId } from "@/lib/auth/user-id";
import { generateVoiceSchema } from "@/lib/schemas/voice";
import { VoiceProviderFactory } from "@/lib/providers/voice-provider-factory";
import { saveAudioFile } from "@/lib/storage/audio-storage";
import { jsonError } from "@/lib/utils/api-response";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const input = generateVoiceSchema.parse(raw);
    const userId = await resolveUserId(request);

    const resolvedTitle = input.title || input.inputText.slice(0, 80);
    let pendingId: string | null = null;

    if (process.env.DATABASE_URL) {
      try {
        const pending = await prisma.mediaGeneration.create({
          data: {
            userId,
            moduleType: ModuleType.VOICE,
            title: resolvedTitle,
            inputText: input.inputText,
            voice: input.voice as VoiceType,
            speed: input.speed,
            status: GenerationStatus.PROCESSING,
          },
        });

        pendingId = pending.id;
      } catch {
        pendingId = null;
      }
    }

    const provider = VoiceProviderFactory.resolve();
    const mp3Bytes = await provider.generateSpeechMp3(input.inputText, input.voice, input.speed);
    const { urlPath } = await saveAudioFile(mp3Bytes);

    const duration = Math.max(1, Math.round(input.inputText.length / 14));

    if (pendingId) {
      try {
        const completed = await prisma.mediaGeneration.update({
          where: { id: pendingId },
          data: {
            status: GenerationStatus.COMPLETED,
            outputUrl: urlPath,
            duration,
          },
        });

        return NextResponse.json({
          id: completed.id,
          title: completed.title,
          voice: completed.voice,
          duration: completed.duration,
          outputUrl: completed.outputUrl,
          status: completed.status,
          createdAt: completed.createdAt.toISOString(),
        });
      } catch {
        // Fall back to non-persistent response if DB update fails.
      }
    }

    return NextResponse.json({
      id: randomUUID(),
      title: resolvedTitle,
      voice: input.voice,
      duration,
      outputUrl: urlPath,
      status: GenerationStatus.COMPLETED,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate voice.";
    return jsonError(message, 400);
  }
}
