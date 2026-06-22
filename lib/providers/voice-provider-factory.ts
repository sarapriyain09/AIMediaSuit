import type { IVoiceProvider } from "@/lib/providers/voice-provider";
import { OpenAIVoiceProvider } from "@/lib/openai/openai-voice-provider";

export class VoiceProviderFactory {
  private static providers: Record<string, IVoiceProvider> = {
    openai: new OpenAIVoiceProvider(),
  };

  static resolve(): IVoiceProvider {
    const selectedProvider = (process.env.VOICE_PROVIDER ?? "openai").toLowerCase();
    const provider = this.providers[selectedProvider];

    if (!provider) {
      throw new Error(`Voice provider '${selectedProvider}' is not configured.`);
    }

    return provider;
  }
}
