import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/utils/api-response";

export const runtime = "nodejs";

const schema = z.object({
  query: z.string().min(2).max(140),
  orientation: z.enum(["landscape", "portrait", "square"]).optional().default("landscape"),
  perPage: z.number().int().min(1).max(8).optional().default(4),
});

type AssetItem = {
  id: string;
  previewUrl: string;
  sourceUrl: string;
  author: string;
  provider: "pexels" | "pixabay";
};

async function searchPexels(query: string, orientation: string, perPage: number) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return [] as AssetItem[];
  }

  const params = new URLSearchParams({
    query,
    orientation,
    per_page: String(perPage),
    page: "1",
  });

  const response = await fetch(`https://api.pexels.com/v1/search?${params.toString()}`, {
    headers: {
      Authorization: apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as {
    photos?: Array<{
      id: number;
      photographer?: string;
      src?: { medium?: string; original?: string };
    }>;
  };

  return (data.photos ?? [])
    .map((photo) => {
      if (!photo.src?.medium || !photo.src?.original) {
        return null;
      }

      return {
        id: `pexels-${photo.id}`,
        previewUrl: photo.src.medium,
        sourceUrl: photo.src.original,
        author: photo.photographer || "Pexels",
        provider: "pexels" as const,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

async function searchPixabay(query: string, orientation: string, perPage: number) {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    return [] as AssetItem[];
  }

  const orientationMap: Record<string, string> = {
    landscape: "horizontal",
    portrait: "vertical",
    square: "all",
  };

  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    image_type: "photo",
    orientation: orientationMap[orientation] ?? "horizontal",
    per_page: String(perPage),
    page: "1",
    safesearch: "true",
  });

  const response = await fetch(`https://pixabay.com/api/?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as {
    hits?: Array<{
      id: number;
      user?: string;
      webformatURL?: string;
      largeImageURL?: string;
    }>;
  };

  return (data.hits ?? [])
    .map((hit) => {
      if (!hit.webformatURL || !hit.largeImageURL) {
        return null;
      }

      return {
        id: `pixabay-${hit.id}`,
        previewUrl: hit.webformatURL,
        sourceUrl: hit.largeImageURL,
        author: hit.user || "Pixabay",
        provider: "pixabay" as const,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export async function POST(request: NextRequest) {
  try {
    const input = schema.parse(await request.json());

    const [pexelsItems, pixabayItems] = await Promise.all([
      searchPexels(input.query, input.orientation, input.perPage),
      searchPixabay(input.query, input.orientation, input.perPage),
    ]);

    const items = [...pexelsItems, ...pixabayItems].slice(0, input.perPage);
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to search assets.";
    return jsonError(message, 400);
  }
}
