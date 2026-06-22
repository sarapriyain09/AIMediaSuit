import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth/options";

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return header.slice(7).trim();
}

function parseJwtSubject(jwt: string): string | null {
  const sections = jwt.split(".");
  if (sections.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(sections[1], "base64url").toString("utf8")) as {
      sub?: string;
      userId?: string;
    };

    return payload.sub ?? payload.userId ?? null;
  } catch {
    return null;
  }
}

export async function resolveUserId(request: NextRequest) {
  const token = getBearerToken(request);
  const fromBearer = token ? parseJwtSubject(token) : null;
  if (fromBearer) {
    return fromBearer;
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return session.user.id;
  }

  return process.env.DEMO_USER_ID ?? "00000000-0000-0000-0000-000000000001";
}
