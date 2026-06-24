import { z } from "zod";
import {
  avatarAspectRatioList,
  avatarBackgroundList,
  avatarLanguageList,
  avatarPresetList,
  avatarRenderModeList,
} from "@/types/media";

export const generateAvatarSchema = z.object({
  title: z.string().max(120).optional().default(""),
  script: z.string().min(1).max(12000),
  preset: z.enum(avatarPresetList),
  background: z.enum(avatarBackgroundList),
  language: z.enum(avatarLanguageList),
  aspectRatio: z.enum(avatarAspectRatioList).optional().default("16:9"),
  voiceAudioUrl: z.string().url().optional().or(z.literal("")).default(""),
  backgroundImageUrl: z.string().url().optional().or(z.literal("")).default(""),
  renderMode: z.enum(avatarRenderModeList).optional().default("sync"),
});

export type GenerateAvatarInput = z.infer<typeof generateAvatarSchema>;
