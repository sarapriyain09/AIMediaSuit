import { z } from "zod";
import { videoAspectRatioList, videoStyleList } from "@/types/media";

export const generateVideoSchema = z.object({
  title: z.string().max(120).optional().default(""),
  topic: z.string().min(1).max(200),
  audience: z.string().min(1).max(140),
  style: z.enum(videoStyleList),
  aspectRatio: z.enum(videoAspectRatioList),
  durationSec: z.number().int().min(15).max(300),
  prompt: z.string().min(1).max(4000),
  includeVoiceover: z.boolean().optional().default(true),
});

export type GenerateVideoInput = z.infer<typeof generateVideoSchema>;
