export const voiceList = ["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer"] as const;

export type VoiceType = (typeof voiceList)[number];

export type GenerationStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface GenerateVoicePayload {
  title?: string;
  inputText: string;
  voice: VoiceType;
  speed: number;
}

export interface VoiceHistoryItem {
  id: string;
  title: string;
  voice: VoiceType;
  duration: number | null;
  outputUrl: string | null;
  status: GenerationStatus;
  createdAt: string;
}

export interface VoiceStatistics {
  totalAudioGenerated: number;
  totalMinutesGenerated: number;
  mostUsedVoice: string;
  recentFiles: number;
}
