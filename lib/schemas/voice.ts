import { z } from "zod";
import { voiceList } from "@/types/media";

export const generateVoiceSchema = z.object({
  title: z.string().max(120).optional().default(""),
  inputText: z.string().min(1).max(5000),
  voice: z.enum(voiceList),
  speed: z.number().min(0.5).max(2.0),
});
