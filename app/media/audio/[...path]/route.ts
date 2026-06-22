import { NextRequest, NextResponse } from "next/server";
import { readAudioByPublicPath } from "@/lib/storage/audio-storage";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ path: string[] }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { path } = await params;
    const { file, size } = await readAudioByPublicPath(path);

    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": size.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
