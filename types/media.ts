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
  isFavorite: boolean;
  status: GenerationStatus;
  createdAt: string;
}

export interface ScriptStatistics {
  totalScriptsGenerated: number;
  mostUsedGoal: string;
  recentScripts: number;
}

export const podcastFormatList = ["interview", "solo", "panel", "storytelling"] as const;
export const podcastToneList = ["professional", "conversational", "energetic", "educational"] as const;
export const podcastLengthList = ["short", "medium", "long"] as const;

export type PodcastFormat = (typeof podcastFormatList)[number];
export type PodcastTone = (typeof podcastToneList)[number];
export type PodcastLength = (typeof podcastLengthList)[number];

export interface GeneratePodcastPayload {
  title?: string;
  topic: string;
  audience: string;
  format: PodcastFormat;
  tone: PodcastTone;
  length: PodcastLength;
  hosts?: string;
  outline?: string;
  prompt: string;
  synthesizeAudio?: boolean;
}

export interface PodcastSegment {
  speaker: string;
  voice: VoiceType;
  text: string;
  outputUrl: string | null;
  duration: number;
}

export interface PodcastHistoryItem {
  id: string;
  title: string;
  topic: string;
  audience: string;
  format: PodcastFormat;
  tone: PodcastTone;
  length: PodcastLength;
  hosts: string[];
  outline: string;
  prompt: string;
  script: string;
  outputUrl: string | null;
  duration: number | null;
  segmentCount: number;
  segments: PodcastSegment[];
  isFavorite: boolean;
  status: GenerationStatus;
  createdAt: string;
}

export interface PodcastStatistics {
  totalEpisodesGenerated: number;
  mostUsedFormat: string;
  recentEpisodes: number;
}

export const presentationGoalList = ["pitch", "training", "webinar", "sales", "report"] as const;
export const presentationToneList = ["professional", "persuasive", "educational", "storytelling"] as const;
export const presentationLengthList = ["short", "medium", "long"] as const;

export type PresentationGoal = (typeof presentationGoalList)[number];
export type PresentationTone = (typeof presentationToneList)[number];
export type PresentationLength = (typeof presentationLengthList)[number];

export interface GeneratePresentationPayload {
  title?: string;
  goal: PresentationGoal;
  tone: PresentationTone;
  length: PresentationLength;
  audience: string;
  topic: string;
  prompt: string;
  includeSpeakerNotes?: boolean;
}

export interface PresentationHistoryItem {
  id: string;
  title: string;
  goal: PresentationGoal;
  tone: PresentationTone;
  length: PresentationLength;
  audience: string;
  topic: string;
  prompt: string;
  outputText: string;
  slideCount: number;
  includeSpeakerNotes: boolean;
  isFavorite: boolean;
  status: GenerationStatus;
  createdAt: string;
}

export interface PresentationStatistics {
  totalDecksGenerated: number;
  mostUsedGoal: string;
  recentDecks: number;
}

export const subtitleFormatList = ["srt", "vtt", "captions"] as const;
export const subtitleToneList = ["verbatim", "readable", "engaging"] as const;

export type SubtitleFormat = (typeof subtitleFormatList)[number];
export type SubtitleTone = (typeof subtitleToneList)[number];

export interface GenerateSubtitlePayload {
  title?: string;
  topic: string;
  language: string;
  format: SubtitleFormat;
  tone: SubtitleTone;
  sourceText: string;
  includeTimestamps?: boolean;
}

export interface SubtitleHistoryItem {
  id: string;
  title: string;
  topic: string;
  language: string;
  format: SubtitleFormat;
  tone: SubtitleTone;
  sourceText: string;
  outputText: string;
  cueCount: number;
  includeTimestamps: boolean;
  isFavorite: boolean;
  status: GenerationStatus;
  createdAt: string;
}

export interface SubtitleStatistics {
  totalSubtitlesGenerated: number;
  mostUsedFormat: string;
  recentSubtitles: number;
}
