import { z } from "zod";
import { presentationGoalList, presentationLengthList, presentationToneList } from "@/types/media";

export const generatePresentationSchema = z.object({
  title: z.string().max(120).optional().default(""),
  goal: z.enum(presentationGoalList),
  tone: z.enum(presentationToneList),
  length: z.enum(presentationLengthList),
  audience: z.string().min(1).max(140),
  topic: z.string().min(1).max(200),
  prompt: z.string().min(1).max(4000),
  includeSpeakerNotes: z.boolean().optional().default(true),
});

export type GeneratePresentationInput = z.infer<typeof generatePresentationSchema>;
