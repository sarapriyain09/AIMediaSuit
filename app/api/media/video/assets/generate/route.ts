import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/utils/api-response";

export const runtime = "nodejs";

const schema = z.object({
  prompt: z.string().min(2).max(2000),
  provider: z.enum(["gpt-image", "flux"]).default("gpt-image"),
  orientation: z.enum(["landscape", "portrait", "square"]).optional().default("landscape"),
});

type GeneratedItem = {
  id: string;
  imageUrl: string;
  provider: "gpt-image" | "flux";
};

function orientationToSize(orientation: "landscape" | "portrait" | "square") {
  if (orientation === "portrait") {
    return "1024x1536";
  }

  if (orientation === "square") {
    return "1024x1024";
  }

  return "1536x1024";
}

async function generateWithGptImage(prompt: string, orientation: "landscape" | "portrait" | "square") {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
      prompt,
      n: 1,
      size: orientationToSize(orientation),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GPT Image generation failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };

  const first = data.data?.[0];
  if (!first) {
    throw new Error("GPT Image did not return an image.");
  }

  if (first.url) {
    return first.url;
  }

  if (first.b64_json) {
    return `data:image/png;base64,${first.b64_json}`;
  }

  throw new Error("Unsupported GPT Image response format.");
}

async function generateWithFlux(prompt: string, orientation: "landscape" | "portrait" | "square") {
  const apiKey = process.env.FLUX_API_KEY;
  if (!apiKey) {
    throw new Error("FLUX_API_KEY is missing.");
  }

  const width = orientation === "portrait" ? 832 : orientation === "square" ? 1024 : 1344;
  const height = orientation === "portrait" ? 1344 : orientation === "square" ? 1024 : 832;

  const response = await fetch(process.env.FLUX_API_URL ?? "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        width,
        height,
      },
    }),
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) {
    const errorText = contentType.includes("application/json") ? JSON.stringify(await response.json()) : await response.text();
    throw new Error(`Flux generation failed: ${response.status} ${errorText}`);
  }

  if (contentType.includes("application/json")) {
    const json = (await response.json()) as {
      image?: string;
      data?: Array<{ b64_json?: string; url?: string }>;
      output?: Array<{ image?: string; b64_json?: string; url?: string }>;
    };

    const imageBase64 =
      json.image || json.data?.[0]?.b64_json || json.output?.[0]?.image || json.output?.[0]?.b64_json || null;
    if (imageBase64) {
      return imageBase64.startsWith("data:image") ? imageBase64 : `data:image/png;base64,${imageBase64}`;
    }

    const imageUrl = json.data?.[0]?.url || json.output?.[0]?.url;
    if (imageUrl) {
      return imageUrl;
    }

    throw new Error("Flux returned JSON without an image payload.");
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

export async function POST(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());

    const imageUrl =
      input.provider === "gpt-image"
        ? await generateWithGptImage(input.prompt, input.orientation)
        : await generateWithFlux(input.prompt, input.orientation);

    const item: GeneratedItem = {
      id: randomUUID(),
      imageUrl,
      provider: input.provider,
    };

    return NextResponse.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate image.";
    return jsonError(message, 400);
  }
}
