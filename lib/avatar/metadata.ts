import type {
  AvatarAspectRatio,
  AvatarBackground,
  AvatarHistoryItem,
  AvatarLanguage,
  AvatarPreset,
  AvatarRenderMode,
} from "@/types/media";

const defaults = {
  script: "",
  preset: "business-male" as AvatarPreset,
  background: "studio" as AvatarBackground,
  language: "english" as AvatarLanguage,
  aspectRatio: "16:9" as AvatarAspectRatio,
  voiceAudioUrl: null as string | null,
  backgroundImageUrl: null as string | null,
  renderMode: "sync" as AvatarRenderMode,
};

export function buildAvatarInputText(input: {
  script: string;
  preset: AvatarPreset;
  background: AvatarBackground;
  language: AvatarLanguage;
  aspectRatio: AvatarAspectRatio;
  voiceAudioUrl: string;
  backgroundImageUrl: string;
  renderMode: AvatarRenderMode;
}) {
  return JSON.stringify(input);
}

export function parseAvatarInputText(inputText: string) {
  try {
    const parsed = JSON.parse(inputText) as Partial<typeof defaults>;

    return {
      script: typeof parsed.script === "string" ? parsed.script : defaults.script,
      preset:
        parsed.preset === "business-male" ||
        parsed.preset === "business-female" ||
        parsed.preset === "teacher" ||
        parsed.preset === "trainer" ||
        parsed.preset === "support"
          ? parsed.preset
          : defaults.preset,
      background:
        parsed.background === "office" ||
        parsed.background === "studio" ||
        parsed.background === "classroom" ||
        parsed.background === "home"
          ? parsed.background
          : defaults.background,
      language:
        parsed.language === "english" ||
        parsed.language === "tamil" ||
        parsed.language === "hindi" ||
        parsed.language === "spanish"
          ? parsed.language
          : defaults.language,
      aspectRatio: parsed.aspectRatio === "9:16" ? "9:16" : "16:9",
      voiceAudioUrl: typeof parsed.voiceAudioUrl === "string" ? parsed.voiceAudioUrl : defaults.voiceAudioUrl,
      backgroundImageUrl:
        typeof parsed.backgroundImageUrl === "string" ? parsed.backgroundImageUrl : defaults.backgroundImageUrl,
      renderMode: parsed.renderMode === "queue" ? "queue" : "sync",
    };
  } catch {
    return defaults;
  }
}

export function buildAvatarHistoryItem(row: {
  id: string;
  title: string;
  inputText: string;
  outputUrl: string | null;
  duration: number | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: Date;
}): AvatarHistoryItem {
  const parsed = parseAvatarInputText(row.inputText);
  return {
    id: row.id,
    title: row.title,
    script: parsed.script,
    preset: parsed.preset,
    background: parsed.background,
    language: parsed.language,
    aspectRatio: parsed.aspectRatio,
    voiceAudioUrl: parsed.voiceAudioUrl,
    backgroundImageUrl: parsed.backgroundImageUrl,
    renderMode: parsed.renderMode,
    outputUrl: row.outputUrl,
    duration: row.duration,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}
