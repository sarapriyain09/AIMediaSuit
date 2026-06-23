import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { resolveUserId } from "@/lib/auth/user-id";
import { renderVideo } from "@/lib/video/video-renderer";
import { jsonError } from "@/lib/utils/api-response";

export const runtime = "nodejs";

const renderSchema = z.object({
  videoId: z.string().uuid().optional(),
  scenes: z
    .array(
      z.object({
        sceneNumber: z.number().int().min(1),
        duration: z.number().int().min(1).max(60),
        caption: z.string().max(500).optional().default(""),
        voiceover: z.string().max(4000).optional().default(""),
        image: z.string().max(2000).optional().default(""),
        transition: z.enum(["cut", "fade"]).optional().default("cut"),
      }),
    )
    .min(1)
    .max(24),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
  quality: z.enum(["1080p", "720p"]).default("1080p"),
  voice: z.enum(["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer"]).default("alloy"),
  speed: z.number().min(0.5).max(2).default(1),
  includeSubtitles: z.boolean().default(true),
  musicTrack: z.enum(["none", "corporate", "motivational", "ambient", "upbeat"]).default("none"),
  voiceVolume: z.number().min(0).max(100).default(100),
  musicVolume: z.number().min(0).max(100).default(20),
});

export async function POST(request: NextRequest) {
  try {
    const input = renderSchema.parse(await request.json());
    const userId = await resolveUserId(request);

    const rendered = await renderVideo({
      scenes: input.scenes,
      aspectRatio: input.aspectRatio,
      quality: input.quality,
      voice: input.voice,
      speed: input.speed,
      includeSubtitles: input.includeSubtitles,
      musicTrack: input.musicTrack,
      voiceVolume: input.voiceVolume,
      musicVolume: input.musicVolume,
    });

    if (input.videoId && process.env.DATABASE_URL) {
      try {
        const found = await prisma.videoGeneration.findFirst({
          where: {
            id: input.videoId,
            userId,
          },
          select: { id: true },
        });

        if (found) {
          await prisma.videoGeneration.update({
            where: { id: found.id },
            data: {
              outputUrl: rendered.outputUrl,
              sceneCount: rendered.sceneCount,
            },
          });
        }
      } catch {
        // Return rendered result even when persistence fails.
      }
    }

    return NextResponse.json({
      outputUrl: rendered.outputUrl,
      sceneCount: rendered.sceneCount,
      totalDurationSec: rendered.totalDurationSec,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to render video.";
    return jsonError(message, 400);
  }
}
