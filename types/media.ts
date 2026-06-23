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

export const scriptGoalList = ["social", "ad", "youtube", "email", "sales"] as const;
export const scriptToneList = ["professional", "friendly", "bold", "educational", "storytelling"] as const;
export const scriptLengthList = ["short", "medium", "long"] as const;

export type ScriptGoal = (typeof scriptGoalList)[number];
export type ScriptTone = (typeof scriptToneList)[number];
export type ScriptLength = (typeof scriptLengthList)[number];

export interface GenerateScriptPayload {
  title?: string;
  goal: ScriptGoal;
  tone: ScriptTone;
  length: ScriptLength;
  audience: string;
  prompt: string;
  callToAction?: string;
}

export interface ScriptHistoryItem {
  id: string;
  title: string;
  goal: ScriptGoal;
  tone: ScriptTone;
  length: ScriptLength;
  audience: string;
  prompt: string;
  outputText: string;
  callToAction: string | null;
  status: GenerationStatus;
  createdAt: string;
}

export interface ScriptStatistics {
  totalScriptsGenerated: number;
  mostUsedGoal: string;
  recentScripts: number;
}
