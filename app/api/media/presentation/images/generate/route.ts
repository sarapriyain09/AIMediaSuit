import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveUserId } from "@/lib/auth/user-id";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/utils/api-response";

export const runtime = "nodejs";

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";

const schema = z.object({
  presentationId: z.string().uuid().optional(),
  prompt: z.string().min(1).max(2000),
  visualStyle: z.string().min(1).max(200).optional().default("clean cinematic presentation style"),
  count: z.number().int().min(1).max(4).optional().default(2),
  size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).optional().default("1536x1024"),
});

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonError("OPENAI_API_KEY is missing.", 500);
    }

    const input = schema.parse(await request.json());
    const userId = await resolveUserId(request);
    const mergedPrompt = `${input.prompt}\n\nArt direction: ${input.visualStyle}. Keep style consistent across all generated images.`;

    const response = await fetch(OPENAI_IMAGES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
        prompt: mergedPrompt,
        n: input.count,
        size: input.size,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return jsonError(`Image generation failed: ${response.status} ${errorText}`, 400);
    }

    const data = (await response.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };

    const images = (data.data ?? [])
      .map((item) => {
        if (typeof item.url === "string") {
          return item.url;
        }

        if (typeof item.b64_json === "string") {
          return `data:image/png;base64,${item.b64_json}`;
        }

        return null;
      })
      .filter((url): url is string => typeof url === "string");

    const items = images.map((url) => ({ id: randomUUID(), url, prompt: input.prompt }));

    if (input.presentationId && process.env.DATABASE_URL) {
      try {
        const current = await prisma.presentationGeneration.findFirst({
          where: {
            id: input.presentationId,
            userId,
          },
          select: {
            id: true,
            images: true,
            visualStyle: true,
            imagePrompt: true,
          },
        });

        if (current) {
          const existingImages = Array.isArray(current.images) ? current.images : [];
          await prisma.presentationGeneration.update({
            where: { id: current.id },
            data: {
              visualStyle: input.visualStyle,
              imagePrompt: input.prompt,
              images: [...existingImages, ...items],
            },
          });
        }
      } catch {
        // Keep response successful even if persistence fails.
      }
    }

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate images.";
    return jsonError(message, 400);
  }
}
