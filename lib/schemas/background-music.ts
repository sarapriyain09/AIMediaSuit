import { z } from "zod";
import { backgroundMusicCategoryList, backgroundMusicOutputFormatList } from "@/types/media";

export const generateBackgroundMusicSchema = z.object({
  title: z.string().max(120).optional().default(""),
  prompt: z.string().min(1).max(6000),
  category: z.enum(backgroundMusicCategoryList),
  voiceAudioUrl: z.string().url().optional().or(z.literal("")).default(""),
  musicVolume: z.number().min(0).max(100).optional().default(30),
  voiceVolume: z.number().min(0).max(100).optional().default(100),
  fadeInSec: z.number().min(0).max(10).optional().default(0),
  fadeOutSec: z.number().min(0).max(10).optional().default(0),
  loopMusic: z.boolean().optional().default(true),
  outputFormat: z.enum(backgroundMusicOutputFormatList).optional().default("mp3"),
});

export type GenerateBackgroundMusicInput = z.infer<typeof generateBackgroundMusicSchema>;
