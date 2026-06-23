import { z } from "zod";
import { podcastFormatList, podcastLengthList, podcastToneList } from "@/types/media";

export const generatePodcastSchema = z.object({
  title: z.string().max(120).optional().default(""),
  topic: z.string().min(1).max(180),
  audience: z.string().min(1).max(140),
  format: z.enum(podcastFormatList),
  tone: z.enum(podcastToneList),
  length: z.enum(podcastLengthList),
  hosts: z
    .string()
    .max(500)
    .optional()
    .default("Host")
    .transform((value) =>
      value
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .slice(0, 8),
    ),
  outline: z.string().max(2000).optional().default(""),
  prompt: z.string().min(1).max(4000),
});

export type GeneratePodcastInput = z.infer<typeof generatePodcastSchema>;
