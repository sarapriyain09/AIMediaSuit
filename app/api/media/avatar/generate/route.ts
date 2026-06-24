import { GenerationStatus, ModuleType, VoiceType } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/user-id";
import { buildAvatarHistoryItem, buildAvatarInputText } from "@/lib/avatar/metadata";
import { renderAvatarPlaceholder } from "@/lib/avatar/avatar-renderer";
import { prisma } from "@/lib/db/prisma";
import { generateAvatarSchema } from "@/lib/schemas/avatar";
import { jsonError } from "@/lib/utils/api-response";

export const runtime = "nodejs";

function estimateDuration(script: string) {
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(8, Math.round(words / 2.4));
}

export async function POST(request: NextRequest) {
  try {
    const input = generateAvatarSchema.parse(await request.json());
    const userId = await resolveUserId(request);
    const resolvedTitle = input.title || `Avatar: ${input.preset}`;
    const duration = estimateDuration(input.script);
    const renderMode = input.renderMode;
    const voiceAudioUrl = input.voiceAudioUrl.trim();
    const backgroundImageUrl = input.backgroundImageUrl.trim();

    if (process.env.DATABASE_URL) {
      try {
        const created = await prisma.mediaGeneration.create({
          data: {
            userId,
            moduleType: ModuleType.AVATAR,
            title: resolvedTitle,
            inputText: buildAvatarInputText({
              script: input.script,
              preset: input.preset,
              background: input.background,
              language: input.language,
              aspectRatio: input.aspectRatio,
              voiceAudioUrl,
              backgroundImageUrl,
              renderMode,
            }),
            voice: VoiceType.alloy,
            speed: 1,
            duration,
            outputUrl: null,
            status: GenerationStatus.PENDING,
          },
        });

        if (renderMode === "queue") {
          return NextResponse.json(
            {
              ...buildAvatarHistoryItem(created),
              generatedAt: created.createdAt.toISOString(),
              meta: {
                phase: "phase-2",
                render: "queued",
              },
            },
            { status: 202 },
          );
        }

        await prisma.mediaGeneration.update({
          where: { id: created.id },
          data: { status: GenerationStatus.PROCESSING },
        });

        try {
          const rendered = await renderAvatarPlaceholder({
            script: input.script,
            aspectRatio: input.aspectRatio,
            voiceAudioUrl,
            backgroundImageUrl,
            requestOrigin: request.nextUrl.origin,
          });

          const completed = await prisma.mediaGeneration.update({
            where: { id: created.id },
            data: {
              outputUrl: rendered.outputUrl,
              duration: rendered.duration,
              status: GenerationStatus.COMPLETED,
            },
          });

          return NextResponse.json({
            ...buildAvatarHistoryItem(completed),
            generatedAt: completed.createdAt.toISOString(),
            meta: {
              phase: "phase-2",
              render: rendered.engine,
            },
          });
        } catch {
          const failed = await prisma.mediaGeneration.update({
            where: { id: created.id },
            data: { status: GenerationStatus.FAILED },
          });

          return NextResponse.json({
            ...buildAvatarHistoryItem(failed),
            generatedAt: failed.createdAt.toISOString(),
            meta: {
              phase: "phase-2",
              render: "failed",
            },
          });
        }
      } catch {
        // Fall through to non-persistent response when database is unavailable.
      }
    }

    const ephemeralId = randomUUID();

    if (renderMode === "queue") {
      return NextResponse.json(
        {
          id: ephemeralId,
          title: resolvedTitle,
          script: input.script,
          preset: input.preset,
          background: input.background,
          language: input.language,
          aspectRatio: input.aspectRatio,
          voiceAudioUrl: voiceAudioUrl || null,
          backgroundImageUrl: backgroundImageUrl || null,
          renderMode,
          outputUrl: null,
          duration,
          status: "PENDING",
          createdAt: new Date().toISOString(),
          generatedAt: new Date().toISOString(),
          meta: {
            phase: "phase-2",
            render: "queued",
          },
        },
        { status: 202 },
      );
    }

    try {
      const rendered = await renderAvatarPlaceholder({
        script: input.script,
        aspectRatio: input.aspectRatio,
        voiceAudioUrl,
        backgroundImageUrl,
        requestOrigin: request.nextUrl.origin,
      });

      return NextResponse.json({
        id: ephemeralId,
        title: resolvedTitle,
        script: input.script,
        preset: input.preset,
        background: input.background,
        language: input.language,
        aspectRatio: input.aspectRatio,
        voiceAudioUrl: voiceAudioUrl || null,
        backgroundImageUrl: backgroundImageUrl || null,
        renderMode,
        outputUrl: rendered.outputUrl,
        duration: rendered.duration,
        status: "COMPLETED",
        createdAt: new Date().toISOString(),
        generatedAt: new Date().toISOString(),
        meta: {
          phase: "phase-2",
          render: rendered.engine,
        },
      });
    } catch {
      return NextResponse.json({
        id: ephemeralId,
        title: resolvedTitle,
        script: input.script,
        preset: input.preset,
        background: input.background,
        language: input.language,
        aspectRatio: input.aspectRatio,
        voiceAudioUrl: voiceAudioUrl || null,
        backgroundImageUrl: backgroundImageUrl || null,
        renderMode,
        outputUrl: null,
        duration,
        status: "FAILED",
        createdAt: new Date().toISOString(),
        generatedAt: new Date().toISOString(),
        meta: {
          phase: "phase-2",
          render: "failed",
        },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate avatar job.";
    return jsonError(message, 400);
  }
}
