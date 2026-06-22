import type { IVoiceProvider } from "@/lib/providers/voice-provider";
import type { VoiceType } from "@/types/media";

const OPENAI_SPEECH_URL = "https://api.openai.com/v1/audio/speech";

export class OpenAIVoiceProvider implements IVoiceProvider {
  readonly providerName = "openai";

  async generateSpeechMp3(inputText: string, voice: VoiceType, speed: number): Promise<Buffer> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is missing.");
    }

    const model = process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts";

    const response = await fetch(OPENAI_SPEECH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: inputText,
        voice,
        speed,
        response_format: "mp3",
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
