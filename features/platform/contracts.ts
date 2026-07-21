import { z } from "zod";
import type { AppRole, ProgramState } from "@/features/program/state";
import { missionSchema } from "@/features/missions/schema";

export const roles = ["partner", "teacher", "student", "admin"] as const;
export const appRoleSchema = z.enum(roles);

export const pilotAccountSchema = z.object({
  id: z.string().min(3),
  email: z.string().email(),
  name: z.string().min(2).max(80),
  role: appRoleSchema,
  schoolId: z.string().min(3),
  studentId: z.string().min(2).max(120).optional(),
  organisationId: z.string().min(3).max(160).optional()
});

export type PilotAccount = z.infer<typeof pilotAccountSchema>;

const teamMemberSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  role: z.string().min(1).max(120),
  contribution: z.number().int().min(0).max(100),
  checkIn: z.enum(["on track", "needs support", "waiting"])
});

const teamSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  colour: z.string().min(1).max(40),
  members: z.array(teamMemberSchema).max(12),
  milestone: z.number().int().min(0).max(12),
  health: z.enum(["on track", "needs support", "waiting"]),
  lastActivity: z.string().min(1).max(200)
});

export const studentProfileSchema = z.object({
  id: z.string().min(2).max(120),
  userId: z.string().min(3).max(120).optional(),
  name: z.string().min(2).max(120),
  email: z.string().email().optional(),
  grade: z.string().min(2).max(80),
  interests: z.array(z.string().trim().min(1).max(80)).max(12),
  strengths: z.array(z.string().trim().min(1).max(80)).max(12),
  availability: z.enum(["full", "limited"]),
  availabilityWindows: z.array(z.string().trim().min(1).max(80)).max(14).optional(),
  preferredRoles: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
  avoidStudentIds: z.array(z.string().trim().min(2).max(120)).max(20).optional(),
  accommodations: z.array(z.string().trim().min(1).max(120)).max(12).optional(),
  accessibilityNotes: z.string().max(500).optional(),
  status: z.enum(["active", "archived"]).optional()
});

export type StudentProfile = z.infer<typeof studentProfileSchema>;

const assignmentTeamSchema = z.object({
  id: z.string().min(2).max(120),
  name: z.string().min(2).max(120),
  colour: z.enum(["violet", "blue", "mint", "amber", "rose"]),
  memberIds: z.array(z.string().min(2).max(120)).min(1).max(50),
  roles: z.record(z.string(), z.string().min(1).max(80)),
  rationale: z.string().min(1).max(500)
});

export const assignmentProposalSchema = z.object({
  id: z.string().min(3).max(160),
  missionId: z.string().min(3).max(120),
  className: z.string().min(2).max(160),
  createdBy: z.string().min(3).max(120),
  createdAt: z.string().datetime(),
  status: z.enum(["draft", "approved"]),
  teamCount: z.number().int().min(1).max(20),
  teams: z.array(assignmentTeamSchema).min(1).max(20)
});

export type AssignmentProposal = z.infer<typeof assignmentProposalSchema>;

const sourceSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(240),
  publisher: z.string().min(1).max(160),
  url: z.string().url().max(2_000),
  claim: z.string().min(1).max(800),
  confidence: z.enum(["verified", "review", "unverified"]),
  addedBy: z.string().min(1).max(120),
  retrievedAt: z.string().datetime().optional(),
  approvedAt: z.string().datetime().optional(),
  approvedBy: z.string().max(120).optional(),
  evidenceExcerpt: z.string().max(2_000).optional()
});

const artifactSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(240),
  type: z.enum(["Poster", "Social tiles", "Report", "Data summary", "Presentation"]),
  status: z.enum(["draft", "ready", "submitted"]),
  owner: z.string().min(1).max(120),
  updated: z.string().min(1).max(120)
});

export const rubricScoreSchema = z.object({
  criterion: z.string().min(1).max(100),
  weight: z.number().int().min(5).max(50),
  score: z.number().int().min(1).max(4).nullable(),
  feedback: z.string().max(1_200)
});

export const studentAssessmentSchema = z.object({
  missionId: z.string().min(3).max(120),
  studentId: z.string().min(2).max(120),
  criterion: z.string().min(1).max(100),
  score: z.number().int().min(1).max(4).nullable(),
  feedback: z.string().max(1_200),
  evidenceIds: z.array(z.string().min(1).max(160)).max(20)
});

export type StudentAssessment = z.infer<typeof studentAssessmentSchema> & { updatedAt: string; updatedBy: string };

export const proofSnapshotSchema = z.object({
  proofId: z.string().regex(/^proof-[a-z0-9-]{12,120}$/),
  missionId: z.string().min(3).max(120),
  missionTitle: z.string().min(2).max(240),
  schoolName: z.string().min(2).max(160),
  partnerOrganisation: z.string().min(2).max(160),
  issuedAt: z.string().datetime(),
  snapshotJson: z.string().min(2).max(200_000),
  revokedAt: z.string().datetime().optional()
});

export type ProofSnapshot = z.infer<typeof proofSnapshotSchema>;

const activitySchema = z.object({
  id: z.string().min(1).max(120),
  action: z.string().min(1).max(400),
  actor: z.string().min(1).max(120),
  time: z.string().min(1).max(120),
  kind: z.enum(["mission", "team", "safety", "submission", "partner"])
});

const notificationSchema = z.object({
  id: z.string().min(1).max(120),
  text: z.string().min(1).max(400),
  unread: z.boolean(),
  recipientId: z.string().min(3).max(120).optional()
});

export const programStateSchema = z.object({
  version: z.literal(1),
  mission: missionSchema,
  school: z.object({
    name: z.string().min(2).max(160),
    district: z.string().min(2).max(160),
    students: z.number().int().min(1).max(100_000),
    aiPolicy: z.enum(["Teacher reviewed", "Restricted"]),
    consentStatus: z.enum(["Complete", "Needs review"])
  }),
  partner: z.object({
    organisation: z.string().min(2).max(160),
    contact: z.string().max(160),
    verified: z.boolean(),
    challengeStatus: z.enum(["draft", "in review", "active", "delivered", "validated"]),
    impactNote: z.string().max(1_200)
  }),
  classRoom: z.object({
    name: z.string().min(2).max(160),
    grade: z.string().min(2).max(80),
    teacher: z.string().min(2).max(120),
    deadline: z.string().min(2).max(80),
    studentCount: z.number().int().min(1).max(1_000)
  }),
  teams: z.array(teamSchema).min(1).max(50),
  sources: z.array(sourceSchema).max(500),
  artifacts: z.array(artifactSchema).max(500),
  reflections: z.record(z.string(), z.string().max(1_200)),
  rubric: z.array(rubricScoreSchema).min(1).max(12),
  activities: z.array(activitySchema).max(200),
  notifications: z.array(notificationSchema).max(200),
  partnerValidated: z.boolean(),
  finalSubmitted: z.boolean(),
  assessmentReleased: z.boolean(),
  publicProofConsent: z.boolean(),
  proofIssuedAt: z.string().datetime().nullable(),
  proofId: z.string().regex(/^proof-[a-z0-9-]{12,120}$/)
}).strict();

export const programMutationActionSchema = z.enum([
  "updated_workflow",
  "teacher_update",
  "admin_update",
  "partner_submit_mission",
  "partner_validate",
  "partner_request_revision",
  "student_checkpoint",
  "student_add_source",
  "student_create_artifact",
  "student_save_reflection",
  "student_submit"
]);

export type ProgramMutationAction = z.infer<typeof programMutationActionSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200)
});

export const commentSchema = z.object({
  missionId: z.string().min(3).max(120),
  thread: z.enum(["team", "teacher", "partner"]),
  body: z.string().trim().min(1).max(1_000),
  parentId: z.string().max(120).optional()
});

export type CollaborationComment = z.infer<typeof commentSchema> & {
  id: string;
  author: Pick<PilotAccount, "id" | "name" | "role">;
  createdAt: string;
};

export const collaborationCommentRecordSchema = commentSchema.extend({
  id: z.string().min(3).max(160),
  author: z.object({ id: z.string().min(3).max(120), name: z.string().min(2).max(80), role: appRoleSchema }),
  createdAt: z.string().datetime()
});

export const citationCheckSchema = z.object({
  url: z.string().url().max(2_000),
  claim: z.string().trim().min(3).max(800)
});

export type CitationCheck = {
  host: string;
  rating: "strong" | "review" | "weak";
  reasons: string[];
  citation: string;
  requiresTeacherReview: boolean;
};

export const consentSchema = z.object({
  learnerId: z.string().min(3).max(120),
  basis: z.enum(["school-authorised", "parental-consent", "adult-consent"]),
  scope: z.array(z.enum(["learning-record", "partner-delivery", "public-proof", "media"])).min(1),
  expiresAt: z.string().datetime().optional()
});

export type ConsentRecord = z.infer<typeof consentSchema> & {
  id: string;
  recordedBy: string;
  recordedAt: string;
  revokedAt?: string;
};

export const consentRecordSchema = consentSchema.extend({
  id: z.string().min(3).max(160),
  recordedBy: z.string().min(3).max(120),
  recordedAt: z.string().datetime(),
  revokedAt: z.string().datetime().optional()
});

export type AuditRecord = {
  id: string;
  actorId: string;
  actorRole: AppRole;
  action: string;
  target: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean>;
};

export type StoredFile = {
  id: string;
  missionId: string;
  ownerId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  version: number;
  artifactId?: string;
  publicationState: "private" | "teacher_approved" | "partner_visible";
  createdAt: string;
};

export const storedFileSchema = z.object({
  id: z.string().min(3).max(160),
  missionId: z.string().min(3).max(120),
  ownerId: z.string().min(3).max(120),
  originalName: z.string().min(1).max(120),
  storedName: z.string().min(1).max(220),
  mimeType: z.string().min(1).max(160),
  size: z.number().int().min(0).max(10 * 1024 * 1024),
  version: z.number().int().min(1).max(500),
  artifactId: z.string().min(3).max(120).optional(),
  publicationState: z.enum(["private", "teacher_approved", "partner_visible"]),
  createdAt: z.string().datetime()
});

export type VoiceNoteRecord = {
  id: string;
  ownerId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  status: "queued" | "transcribed";
  transcript?: string;
  createdAt: string;
};

export const voiceNoteRecordSchema = z.object({
  id: z.string().min(3).max(160),
  ownerId: z.string().min(3).max(120),
  originalName: z.string().min(1).max(120),
  storedName: z.string().min(1).max(220),
  mimeType: z.string().min(1).max(160),
  size: z.number().int().min(0).max(25 * 1024 * 1024),
  status: z.enum(["queued", "transcribed"]),
  transcript: z.string().max(10_000).optional(),
  createdAt: z.string().datetime()
});

export const assessmentDraftSchema = z.object({
  rubric: z.array(rubricScoreSchema).min(1).max(12),
  release: z.boolean().optional()
});

export const rosterImportSchema = z.object({
  csv: z.string().trim().min(2).max(100_000).optional(),
  students: z.array(studentProfileSchema).min(1).max(200).optional(),
  mode: z.enum(["replace", "merge"]).optional().default("replace"),
  archiveMissing: z.boolean().optional().default(false)
}).refine((value) => Boolean(value.csv || value.students), { message: "Provide a roster CSV or student records." });

export const assignmentMutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("propose"), teamCount: z.number().int().min(1).max(20).optional() }),
  z.object({ action: z.literal("approve"), proposalId: z.string().min(3).max(160), proposal: assignmentProposalSchema.optional() }),
  z.object({ action: z.literal("undo"), historyId: z.string().min(3).max(160) })
]);

export type IntegrationRecord = {
  id: "google-classroom" | "microsoft-teams" | "lms-gradebook" | "calendar";
  label: string;
  status: "not_connected" | "configured";
  configuredBy?: string;
  updatedAt?: string;
};

export const integrationRecordSchema = z.object({
  id: z.enum(["google-classroom", "microsoft-teams", "lms-gradebook", "calendar"]),
  label: z.string().min(1).max(120),
  status: z.enum(["not_connected", "configured"]),
  configuredBy: z.string().min(3).max(120).optional(),
  updatedAt: z.string().datetime().optional()
});

export const auditRecordSchema = z.object({
  id: z.string().min(3).max(160),
  actorId: z.string().min(3).max(120),
  actorRole: appRoleSchema,
  action: z.string().min(1).max(160),
  target: z.string().min(1).max(160),
  createdAt: z.string().datetime(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional()
});

export type PilotDatabase = {
  version: 1;
  schoolId: string;
  program: ProgramState;
  comments: CollaborationComment[];
  files: StoredFile[];
  voiceNotes: VoiceNoteRecord[];
  students: StudentProfile[];
  assignmentProposal?: AssignmentProposal;
  assignmentHistory: AssignmentProposal[];
  studentAssessments: StudentAssessment[];
  proofSnapshots: ProofSnapshot[];
  consents: ConsentRecord[];
  audits: AuditRecord[];
  integrations: IntegrationRecord[];
};
