import { z } from "zod";

export const providerSchema = z.enum(["FREEMODEL", "OPENAI", "GROQ", "GEMINI"]);
export type Provider = z.infer<typeof providerSchema>;

export const runRequestSchema = z.object({
  task: z.string().trim().min(8).max(4_000),
  providers: z.array(providerSchema).min(1).max(4),
  maxTokens: z.number().int().min(500).max(1_000_000),
  maxCostUsd: z.number().positive().max(100),
  baselineTokens: z.number().int().positive().max(5_000_000).optional(),
});

export type RunRequest = z.infer<typeof runRequestSchema>;
