import type { VoiceType } from "@/types/media";

export interface IVoiceProvider {
  readonly providerName: string;
  generateSpeechMp3(inputText: string, voice: VoiceType, speed: number): Promise<Buffer>;
}
