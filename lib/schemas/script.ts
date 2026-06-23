import { z } from "zod";
import { scriptGoalList, scriptLengthList, scriptToneList } from "@/types/media";

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