import { z } from "zod";

const shortText = (length: number) => z.string().trim().min(2).max(length);

export const missionRequestSchema = z.object({
  organisation: shortText(120),
  challenge: shortText(1_800),
  locality: shortText(120),
  gradeLevel: z.enum(["Grades 6–8", "Grades 9–10", "Grades 11–12"]),
  subjects: z.array(z.enum(["Science", "Mathematics", "English", "Social studies", "Design", "Computer science"])).min(1).max(5),
  language: shortText(60).default("English")
});

const milestoneSchema = z.object({
  week: z.string().max(40),
  title: z.string().max(100),
  outcome: z.string().max(240),
  studentActions: z.array(z.string().max(180)).min(2).max(4)
});

const roleSchema = z.object({
  title: z.string().max(60),
  responsibility: z.string().max(180),
  evidence: z.string().max(140)
});

const rubricSchema = z.object({
  criterion: z.string().max(100),
  evidence: z.string().max(180),
  weight: z.number().int().min(5).max(50)
});

export const safetyReviewSchema = z.object({
  suitable: z.boolean(),
  concerns: z.array(z.string().max(180)).max(5),
  safeguards: z.array(z.string().max(180)).min(2).max(6),
  requiresAdultSupport: z.boolean()
});

export const generatedMissionSchema = z.object({
  title: z.string().min(5).max(120),
  summary: z.string().min(30).max(500),
  drivingQuestion: z.string().min(10).max(220),
  partnerNeed: z.string().min(10).max(300),
  duration: z.string().max(60),
  subjectLinks: z.array(z.object({ subject: z.string().max(60), learningOutcome: z.string().max(180) })).min(2).max(5),
  roles: z.array(roleSchema).min(3).max(5),
  researchQuestions: z.array(z.string().max(180)).min(3).max(5),
  milestones: z.array(milestoneSchema).min(3).max(5),
  deliverables: z.array(z.string().max(180)).min(2).max(4),
  sourceGuidance: z.array(z.string().max(180)).min(2).max(4),
  rubric: z.array(rubricSchema).min(3).max(5),
  safety: safetyReviewSchema
});

export const missionStatusSchema = z.enum(["draft", "awaiting_review", "approved", "in_progress", "submitted", "validated"]);

export const missionSchema = generatedMissionSchema.extend({
  id: z.string().min(8).max(120),
  organisation: z.string().max(120),
  locality: z.string().max(120),
  gradeLevel: z.string().max(30),
  language: z.string().max(60),
  status: missionStatusSchema,
  createdAt: z.string().datetime(),
  teacherNote: z.string().max(500).optional(),
  generationMode: z.enum(["live", "template"]).optional()
});

export const coachRequestSchema = z.object({
  missionTitle: shortText(120),
  milestone: shortText(100),
  learnerQuestion: shortText(500),
  teamRole: shortText(60).optional(),
  evidence: z.string().max(900).optional()
});

export const coachResponseSchema = z.object({
  acknowledgement: z.string().min(1).max(260),
  question: z.string().min(1).max(260),
  nextStep: z.string().min(1).max(260),
  sourceReminder: z.string().min(1).max(200),
  escalation: z.boolean(),
  mode: z.enum(["live", "template", "restricted"]).optional(),
  evidenceCount: z.number().int().min(0).max(20).optional(),
  citations: z.array(z.object({ sourceId: z.string().min(1).max(120), title: z.string().min(1).max(240), url: z.string().url().max(2_000) })).max(4).optional()
});

export type MissionRequest = z.infer<typeof missionRequestSchema>;
export type GeneratedMission = z.infer<typeof generatedMissionSchema>;
export type Mission = z.infer<typeof missionSchema>;
export type CoachResponse = z.infer<typeof coachResponseSchema>;
