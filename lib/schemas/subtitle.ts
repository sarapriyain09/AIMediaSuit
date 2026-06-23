import { z } from "zod";
import { subtitleFormatList, subtitleToneList } from "@/types/media";

export const generateSubtitleSchema = z.object({
  title: z.string().max(120).optional().default(""),
  topic: z.string().min(1).max(200),
  language: z.string().min(1).max(80),
  format: z.enum(subtitleFormatList),
  tone: z.enum(subtitleToneList),
  sourceText: z.string().min(1).max(12000),
  includeTimestamps: z.boolean().optional().default(true),
});

export type GenerateSubtitleInput = z.infer<typeof generateSubtitleSchema>;
