import type { BackgroundMusicCategory, BackgroundMusicHistoryItem } from "@/types/media";

const defaultMetadata = {
  prompt: "",
  category: "corporate" as BackgroundMusicCategory,
  voiceAudioUrl: null as string | null,
  musicVolume: 30,
  voiceVolume: 100,
  fadeInSec: 0,
  fadeOutSec: 0,
  loopMusic: true,
  outputFormat: "mp3" as const,
};

export function buildBackgroundMusicInputText(input: {
  prompt: string;
  category: BackgroundMusicCategory;
  voiceAudioUrl: string;
  musicVolume: number;
  voiceVolume: number;
  fadeInSec: number;
  fadeOutSec: number;
  loopMusic: boolean;
  outputFormat: "mp3";
}) {
  return JSON.stringify({
    prompt: input.prompt,
    category: input.category,
    voiceAudioUrl: input.voiceAudioUrl || null,
    musicVolume: input.musicVolume,
    voiceVolume: input.voiceVolume,
    fadeInSec: input.fadeInSec,
    fadeOutSec: input.fadeOutSec,
    loopMusic: input.loopMusic,
    outputFormat: input.outputFormat,
  });
}

export function parseBackgroundMusicMetadata(inputText: string) {
  try {
    const value = JSON.parse(inputText) as Partial<typeof defaultMetadata>;
    return {
      prompt: typeof value.prompt === "string" ? value.prompt : defaultMetadata.prompt,
      category:
        value.category === "corporate" ||
        value.category === "motivational" ||
        value.category === "ambient" ||
        value.category === "podcast" ||
        value.category === "cinematic" ||
        value.category === "technology" ||
        value.category === "happy"
          ? value.category
          : defaultMetadata.category,
      voiceAudioUrl: typeof value.voiceAudioUrl === "string" ? value.voiceAudioUrl : defaultMetadata.voiceAudioUrl,
      musicVolume: typeof value.musicVolume === "number" ? value.musicVolume : defaultMetadata.musicVolume,
      voiceVolume: typeof value.voiceVolume === "number" ? value.voiceVolume : defaultMetadata.voiceVolume,
      fadeInSec: typeof value.fadeInSec === "number" ? value.fadeInSec : defaultMetadata.fadeInSec,
      fadeOutSec: typeof value.fadeOutSec === "number" ? value.fadeOutSec : defaultMetadata.fadeOutSec,
      loopMusic: typeof value.loopMusic === "boolean" ? value.loopMusic : defaultMetadata.loopMusic,
      outputFormat: "mp3" as const,
    };
  } catch {
    return defaultMetadata;
  }
}

export function buildBackgroundMusicHistoryItem(row: {
  id: string;
  title: string;
  inputText: string;
  outputUrl: string | null;
  duration: number | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: Date;
}): BackgroundMusicHistoryItem {
  const metadata = parseBackgroundMusicMetadata(row.inputText);
  return {
    id: row.id,
    title: row.title,
    prompt: metadata.prompt,
    category: metadata.category,
    voiceAudioUrl: metadata.voiceAudioUrl,
    outputUrl: row.outputUrl,
    duration: row.duration,
    musicVolume: metadata.musicVolume,
    voiceVolume: metadata.voiceVolume,
    fadeInSec: metadata.fadeInSec,
    fadeOutSec: metadata.fadeOutSec,
    loopMusic: metadata.loopMusic,
    outputFormat: metadata.outputFormat,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}
