import { z } from "zod";

export const mentorRequestSchema = z.object({
  sessionId: z.string().min(8).max(120),
  attemptCount: z.number().int().min(0).max(20),
  task: z.object({
    id: z.string().max(80),
    title: z.string().max(120),
    objective: z.string().max(500),
    concepts: z.array(z.string().max(60)).max(6),
    successChecks: z.array(z.string().max(200)).max(6)
  }),
  files: z.record(z.string(), z.string().max(12000)).refine((files) => Object.keys(files).length <= 8),
  learnerGoal: z.string().max(500).optional(),
  learningStyle: z.enum(["Guide me step-by-step", "Give me hints only", "Challenge me", "Minimal help"]).optional(),
  validation: z.object({
    passed: z.boolean(),
    code: z.string().max(80),
    summary: z.string().max(500),
    evidence: z.array(z.string().max(300)).max(4),
    concept: z.string().max(80)
  }),
  question: z.string().max(500).optional()
});

export const mentorResponseSchema = z.object({
  mode: z.enum(["question", "nudge", "celebrate", "clarify"]),
  message: z.string().min(1).max(700),
  evidence: z.string().min(1).max(320),
  nextAction: z.string().min(1).max(240),
  conceptTags: z.array(z.string().max(80)).max(4),
  hintLevel: z.number().int().min(1).max(4)
});

export type MentorRequest = z.infer<typeof mentorRequestSchema>;
