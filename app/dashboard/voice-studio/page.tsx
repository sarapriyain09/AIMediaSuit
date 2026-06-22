import { ModuleType } from "@prisma/client";
import { VoiceStudioClient } from "@/components/voice-studio/voice-studio-client";
import { prisma } from "@/lib/db/prisma";
import type { VoiceHistoryItem } from "@/types/media";

const defaultUserId = process.env.DEMO_USER_ID ?? "00000000-0000-0000-0000-000000000001";

export const dynamic = "force-dynamic";

export default async function VoiceStudioPage() {
  let history: Array<{
    id: string;
    title: string;
    voice: string;
    duration: number | null;
    outputUrl: string | null;
    status: string;
    createdAt: Date;
  }> = [];

  if (process.env.DATABASE_URL) {
    try {
      history = await prisma.mediaGeneration.findMany({
        where: {
          userId: defaultUserId,
          moduleType: ModuleType.VOICE,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } catch {
      history = [];
    }
  }

  const completed = history.filter((item) => item.status === "COMPLETED");
  const voiceUsage = new Map<string, number>();
  for (const row of completed) {
    voiceUsage.set(row.voice, (voiceUsage.get(row.voice) ?? 0) + 1);
  }

  const mostUsedVoice = [...voiceUsage.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";
  const totalSeconds = completed.reduce((sum, item) => sum + (item.duration ?? 0), 0);
  const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const stats = {
    totalAudioGenerated: completed.length,
    totalMinutesGenerated: Number((totalSeconds / 60).toFixed(2)),
    mostUsedVoice,
    recentFiles: completed.filter((item) => item.createdAt.getTime() >= recentCutoff).length,
  };

  const initialHistory: VoiceHistoryItem[] = history.map((item) => ({
    id: item.id,
    title: item.title,
    voice: item.voice as VoiceHistoryItem["voice"],
    duration: item.duration,
    outputUrl: item.outputUrl,
    status: item.status as VoiceHistoryItem["status"],
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <VoiceStudioClient
      initialHistory={initialHistory}
      initialStats={stats}
    />
  );
}
