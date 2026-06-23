import { z } from "zod";
import { presentationGoalList, presentationLengthList, presentationToneList, voiceList } from "@/types/media";

export const generatePresentationSchema = z.object({
  title: z.string().max(120).optional().default(""),
  goal: z.enum(presentationGoalList),
  tone: z.enum(presentationToneList),
  length: z.enum(presentationLengthList),
  audience: z.string().min(1).max(140),
  topic: z.string().min(1).max(200),
  prompt: z.string().min(1).max(4000),
  includeSpeakerNotes: z.boolean().optional().default(true),
  visualStyle: z.string().max(200).optional().default("clean cinematic presentation style"),
  imagePrompt: z.string().max(2000).optional().default(""),
  subtitleSourceLanguage: z.string().max(40).optional().default("English"),
  subtitleTargetLanguages: z.array(z.string().min(2).max(40)).optional().default([]),
  voiceoverVoice: z.enum(voiceList).optional().default("alloy"),
  voiceoverSpeed: z.number().min(0.5).max(2).optional().default(1),
});

export type GeneratePresentationInput = z.infer<typeof generatePresentationSchema>;
