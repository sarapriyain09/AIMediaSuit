import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { VoiceType } from "@prisma/client";
import { resolveUserId } from "@/lib/auth/user-id";
import { prisma } from "@/lib/db/prisma";
import { VoiceProviderFactory } from "@/lib/providers/voice-provider-factory";
import { saveAudioFile } from "@/lib/storage/audio-storage";
import { jsonError } from "@/lib/utils/api-response";

export const runtime = "nodejs";

const schema = z.object({
  presentationId: z.string().uuid().optional(),
  text: z.string().min(1).max(12000),
  voice: z.enum(["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer"]).optional().default("alloy"),
  speed: z.number().min(0.5).max(2).optional().default(1),
  trimStartSec: z.number().min(0).max(120).optional().default(0),
  trimEndSec: z.number().min(0).max(120).optional().default(0),
});

export async function POST(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());
    const userId = await resolveUserId(request);

    const provider = VoiceProviderFactory.resolve();
    const mp3Bytes = await provider.generateSpeechMp3(input.text, input.voice as VoiceType, input.speed);
    const { urlPath } = await saveAudioFile(mp3Bytes);

    const estimatedDurationSec = Math.max(1, Math.round(input.text.length / 14));
    const trimmedDurationSec = Math.max(0, Number((estimatedDurationSec - input.trimStartSec - input.trimEndSec).toFixed(2)));

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
              voiceoverText: input.text,
              voiceover: {
                voice: input.voice,
                speed: input.speed,
                outputUrl: urlPath,
                durationSec: estimatedDurationSec,
                trimStartSec: input.trimStartSec,
                trimEndSec: input.trimEndSec,
                trimmedDurationSec,
              },
            },
          });
        }
      } catch {
        // Keep response successful even if persistence fails.
      }
    }

    return NextResponse.json({
      outputUrl: urlPath,
      voice: input.voice,
      speed: input.speed,
      durationSec: estimatedDurationSec,
      trimStartSec: input.trimStartSec,
      trimEndSec: input.trimEndSec,
      trimmedDurationSec,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate voice-over.";
    return jsonError(message, 400);
  }
}
