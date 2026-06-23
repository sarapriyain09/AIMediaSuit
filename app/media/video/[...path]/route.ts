import { NextRequest, NextResponse } from "next/server";
import { readVideoByPublicPath } from "@/lib/storage/video-storage";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ path: string[] }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { path } = await params;
    const { file, size } = await readVideoByPublicPath(path);

    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": size.toString(),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
