import { z } from "zod";

export const scriptGoalList = ["social", "ad", "youtube", "email", "sales"] as const;
export const scriptToneList = ["professional", "friendly", "bold", "educational", "storytelling"] as const;
export const scriptLengthList = ["short", "medium", "long"] as const;

export const generateScriptSchema = z.object({
  title: z.string().max(120).optional().default(""),
  goal: z.enum(scriptGoalList),
  tone: z.enum(scriptToneList),
  length: z.enum(scriptLengthList),
  audience: z.string().min(1).max(140),
  prompt: z.string().min(1).max(4000),
  callToAction: z.string().max(160).optional().default(""),
});

export type GenerateScriptInput = z.infer<typeof generateScriptSchema>;