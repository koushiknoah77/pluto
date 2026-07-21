import { createHmac, randomUUID, timingSafeEqual } from "crypto";
/* JSON migration compatibility is intentionally normalized at this boundary. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFile, rename } from "fs/promises";
import path from "path";
import { createDemoProgram, type ProgramState } from "@/features/program/state";
import {
  auditRecordSchema,
  assignmentProposalSchema,
  collaborationCommentRecordSchema,
  consentRecordSchema,
  integrationRecordSchema,
  programStateSchema,
  storedFileSchema,
  studentAssessmentSchema,
  proofSnapshotSchema,
  studentProfileSchema,
  voiceNoteRecordSchema,
  type AuditRecord,
  type IntegrationRecord,
  type PilotAccount,
  type PilotDatabase,
  type ProgramMutationAction
} from "./contracts";
import { readRelationalSnapshot, relationalUser, relationalUserByEmail, RELATIONAL_DATA_DIRECTORY, writeRelationalSnapshot, type RelationalSnapshot } from "./relational-store";

export const DATA_DIRECTORY = RELATIONAL_DATA_DIRECTORY;
const DATA_FILE = path.join(DATA_DIRECTORY, "platform.json");
const SESSION_COOKIE = "pluto_pilot_session";
const STUDENT_ACCOUNT_ID = "student-asha";
const STUDENT_REFLECTION_KEY = "asha";
const STUDENT_TEAM_MEMBER_ID = "s1";

export const demoAccounts: Array<PilotAccount & { password: string }> = [
  { id: "partner-anitha", email: "partner@pluto.local", name: "Anitha Menon", role: "partner", schoolId: "harbourview", organisationId: "organisation-kochi-municipal-waste-cell", password: "pluto-demo" },
  { id: "teacher-devi", email: "teacher@pluto.local", name: "Ms. Devi Nair", role: "teacher", schoolId: "harbourview", password: "pluto-demo" },
  { id: STUDENT_ACCOUNT_ID, email: "student@pluto.local", name: "Asha Raman", role: "student", schoolId: "harbourview", studentId: STUDENT_TEAM_MEMBER_ID, password: "pluto-demo" },
  { id: "admin-ravi", email: "admin@pluto.local", name: "Ravi Varma", role: "admin", schoolId: "harbourview", password: "pluto-demo" }
];

const limits = new Map<string, { count: number; resetAt: number }>();
let databaseQueue: Promise<void> = Promise.resolve();

function integrations(): IntegrationRecord[] {
  return [
    { id: "google-classroom", label: "Google Classroom", status: "not_connected" },
    { id: "microsoft-teams", label: "Microsoft Teams", status: "not_connected" },
    { id: "lms-gradebook", label: "LMS gradebook", status: "not_connected" },
    { id: "calendar", label: "School calendar", status: "not_connected" }
  ];
}

function freshProgram(): ProgramState {
  return { ...createDemoProgram(), proofId: `proof-${randomUUID()}` };
}

function rosterFromProgram(program: ProgramState) {
  const interestMap: Record<string, string[]> = {
    "Research lead": ["research", "reading"],
    "Data lead": ["data", "math"],
    "Message lead": ["communication", "writing"],
    "Design lead": ["design", "visuals"]
  };
  return program.teams.flatMap((team) => team.members.map((member) => ({
    id: member.id,
    ...(member.id === STUDENT_TEAM_MEMBER_ID ? { userId: STUDENT_ACCOUNT_ID } : {}),
    name: member.name,
    email: `${member.id}@harbourview.local`,
    grade: program.classRoom.grade,
    interests: interestMap[member.role] || ["community projects"],
    strengths: [member.role.replace(" lead", "")],
    availability: "full" as const
  })));
}

export function newDatabase(): PilotDatabase {
  const program = freshProgram();
  return {
    version: 1,
    schoolId: "harbourview",
    program,
    comments: [],
    files: [],
    voiceNotes: [],
    students: rosterFromProgram(program),
    assignmentHistory: [],
    studentAssessments: [],
    proofSnapshots: [],
    consents: [{
      id: "consent-demo-asha",
      learnerId: STUDENT_ACCOUNT_ID,
      basis: "school-authorised",
      // The pilot can start with supervised learning and partner delivery. Public sharing
      // must be an explicit, later teacher/admin consent decision.
      scope: ["learning-record", "partner-delivery"],
      recordedBy: "teacher-devi",
      recordedAt: new Date().toISOString()
    }],
    audits: [],
    integrations: integrations()
  };
}

function normalizeProgram(input: unknown): ProgramState {
  const fallback = freshProgram();
  const candidate = input && typeof input === "object" ? { ...fallback, ...input } : fallback;
  const parsed = programStateSchema.safeParse(candidate);
  return parsed.success ? parsed.data : fallback;
}

function normalizeDatabase(input: unknown): PilotDatabase {
  const fallback = newDatabase();
  if (!input || typeof input !== "object") return fallback;
  const value = input as Partial<PilotDatabase>;
  return {
    version: 1,
    schoolId: typeof value.schoolId === "string" && value.schoolId.length >= 3 ? value.schoolId : fallback.schoolId,
    program: normalizeProgram(value.program),
    comments: Array.isArray(value.comments) ? value.comments.filter((item) => collaborationCommentRecordSchema.safeParse(item).success) as PilotDatabase["comments"] : [],
    files: Array.isArray(value.files) ? value.files.map((item) => ({ publicationState: "private" as const, ...(item as object) })).filter((item) => storedFileSchema.safeParse(item).success) as PilotDatabase["files"] : [],
    voiceNotes: Array.isArray(value.voiceNotes) ? value.voiceNotes.filter((item) => voiceNoteRecordSchema.safeParse(item).success) as PilotDatabase["voiceNotes"] : [],
    students: Array.isArray(value.students) ? value.students.filter((item) => studentProfileSchema.safeParse(item).success) as PilotDatabase["students"] : fallback.students,
    assignmentProposal: assignmentProposalSchema.safeParse(value.assignmentProposal).success ? value.assignmentProposal as PilotDatabase["assignmentProposal"] : undefined,
    assignmentHistory: Array.isArray(value.assignmentHistory) ? value.assignmentHistory.filter((item) => assignmentProposalSchema.safeParse(item).success) as PilotDatabase["assignmentHistory"] : [],
    studentAssessments: Array.isArray(value.studentAssessments) ? value.studentAssessments.filter((item) => studentAssessmentSchema.safeParse(item).success).map((item) => ({ ...(item as any), updatedAt: (item as any).updatedAt || new Date().toISOString(), updatedBy: (item as any).updatedBy || "migration" })) as PilotDatabase["studentAssessments"] : [],
    proofSnapshots: Array.isArray(value.proofSnapshots) ? value.proofSnapshots.filter((item) => proofSnapshotSchema.safeParse(item).success) as PilotDatabase["proofSnapshots"] : [],
    consents: Array.isArray(value.consents) ? value.consents.filter((item) => consentRecordSchema.safeParse(item).success) as PilotDatabase["consents"] : fallback.consents,
    audits: Array.isArray(value.audits) ? value.audits.filter((item) => auditRecordSchema.safeParse(item).success) as PilotDatabase["audits"] : [],
    integrations: Array.isArray(value.integrations) ? value.integrations.filter((item) => integrationRecordSchema.safeParse(item).success) as PilotDatabase["integrations"] : fallback.integrations
  };
}

export async function readDatabase(): Promise<PilotDatabase> {
  const relational = readRelationalSnapshot();
  if (relational) {
    const database = normalizeDatabase(relational);
    return database;
  }
  let raw: string;
  try {
    raw = await readFile(DATA_FILE, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const database = newDatabase();
    await writeDatabase(database);
    return database;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const corruptFile = `${DATA_FILE}.corrupt-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    await rename(DATA_FILE, corruptFile).catch(() => undefined);
    throw new Error(`Pilot database is not valid JSON. A backup was preserved at ${corruptFile}.`);
  }
  const database = normalizeDatabase(parsed);
  if (JSON.stringify(database) !== JSON.stringify(parsed)) await writeDatabase(database);
  return database;
}

export async function writeDatabase(database: PilotDatabase) {
  const snapshot: RelationalSnapshot = {
    version: database.version,
    schoolId: database.schoolId,
    program: database.program,
    students: database.students,
    comments: database.comments,
    files: database.files,
    voiceNotes: database.voiceNotes,
    assignmentProposal: database.assignmentProposal,
    assignmentHistory: database.assignmentHistory,
    studentAssessments: database.studentAssessments,
    proofSnapshots: database.proofSnapshots,
    consents: database.consents,
    audits: database.audits,
    integrations: database.integrations
  };
  writeRelationalSnapshot(snapshot);
}

export async function updateDatabase(change: (database: PilotDatabase) => PilotDatabase | void) {
  let result!: PilotDatabase;
  const operation = databaseQueue.then(async () => {
    const current = await readDatabase();
    const next = change(current) ?? current;
    result = normalizeDatabase(next);
    await writeDatabase(result);
  });
  databaseQueue = operation.catch(() => undefined);
  await operation;
  return result;
}

export function rateLimited(key: string, maximum: number, windowMs: number) {
  const now = Date.now();
  const entry = limits.get(key);
  if (!entry || entry.resetAt <= now) {
    limits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > maximum;
}

export function publicAccount(account: PilotAccount & { password?: string }): PilotAccount {
  return { id: account.id, email: account.email, name: account.name, role: account.role, schoolId: account.schoolId, ...(account.studentId ? { studentId: account.studentId } : {}), ...(account.organisationId ? { organisationId: account.organisationId } : {}) };
}

function sessionSecret() {
  const configured = process.env.PLUTO_SESSION_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") return null;
  return "local-pilot-not-for-production";
}

function sessionSignature(accountId: string) {
  const secret = sessionSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(accountId).digest("base64url");
}

export function sessionValue(account: PilotAccount) {
  const signature = sessionSignature(account.id);
  if (!signature) throw new Error("PLUTO_SESSION_SECRET must be configured in production.");
  return `${account.id}.${signature}`;
}

export function accountFromSession(value: string | undefined): PilotAccount | null {
  if (!value) return null;
  const [id, signature] = value.split(".");
  const expected = sessionSignature(id);
  const account = relationalUser(id) || demoAccounts.find((item) => item.id === id);
  if (!account || !expected || !signature) return null;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  return publicAccount(account);
}

export function accountForEmail(email: string) {
  return relationalUserByEmail(email) || demoAccounts.find((account) => account.email.toLowerCase() === email.trim().toLowerCase()) || null;
}

export function activeConsent(database: PilotDatabase, learnerId: string, scope: "learning-record" | "partner-delivery" | "public-proof" | "media") {
  const now = Date.now();
  return database.consents.some((consent) => consent.learnerId === learnerId && !consent.revokedAt && consent.scope.includes(scope) && (!consent.expiresAt || Date.parse(consent.expiresAt) > now));
}

export function allStudentsHaveConsent(database: PilotDatabase, scope: "learning-record" | "partner-delivery" | "public-proof" | "media") {
  return database.students.length > 0 && database.students.every((student) => {
    const learnerIds = [student.userId, student.id].filter((value): value is string => Boolean(value));
    return learnerIds.some((learnerId) => activeConsent(database, learnerId, scope));
  });
}

function studentTeam(program: ProgramState, studentId = STUDENT_TEAM_MEMBER_ID) {
  return program.teams.find((team) => team.members.some((member) => member.id === studentId));
}

export function studentMissionVisible(program: ProgramState) {
  return !["draft", "awaiting_review"].includes(program.mission.status);
}

export function studentMissionWritable(program: ProgramState) {
  return ["approved", "in_progress"].includes(program.mission.status) && !program.finalSubmitted;
}

function studentIdForAccount(database: PilotDatabase, account: PilotAccount) {
  return account.studentId
    || database.students.find((student) => student.userId === account.id || student.email === account.email)?.id
    || (account.id === STUDENT_ACCOUNT_ID ? STUDENT_TEAM_MEMBER_ID : null);
}

export function canAccessStoredFile(database: PilotDatabase, account: PilotAccount, ownerId: string, publicationState = "private") {
  if (account.role === "teacher" || account.role === "admin") return true;
  if (account.role === "student") {
    const team = studentTeam(database.program, studentIdForAccount(database, account) || undefined);
    return account.id === ownerId || Boolean(team?.members.some((member) => member.id === ownerId));
  }
  const owner = database.students.find((student) => student.id === ownerId || student.userId === ownerId);
  const learnerIds = [owner?.userId, owner?.id, ownerId].filter((value): value is string => Boolean(value));
  return publicationState === "partner_visible" && database.program.finalSubmitted && learnerIds.some((learnerId) => activeConsent(database, learnerId, "partner-delivery"));
}

function notificationsFor(program: ProgramState, account: PilotAccount) {
  return program.notifications.filter((item) => !item.recipientId || item.recipientId === account.id);
}

export function programmeForAccount(program: ProgramState, account: PilotAccount): ProgramState {
  if (account.role === "teacher" || account.role === "admin") return program;
  if (account.role === "student") {
    const team = studentTeam(program, account.studentId || STUDENT_TEAM_MEMBER_ID);
    const reflectionKey = account.studentId && account.studentId !== STUDENT_TEAM_MEMBER_ID ? account.studentId : STUDENT_REFLECTION_KEY;
    return {
      ...program,
      teams: team ? [team] : [],
      reflections: program.reflections[reflectionKey] ? { [reflectionKey]: program.reflections[reflectionKey] } : {},
      activities: program.activities.filter((item) => item.kind !== "safety").map((item) => ({ ...item, actor: item.actor === program.classRoom.teacher ? item.actor : "Student team" })),
      notifications: notificationsFor(program, account)
    };
  }
  return {
    ...program,
    teams: program.teams.map((team) => ({ ...team, members: [] })),
    artifacts: program.artifacts.map((artifact) => ({ ...artifact, owner: "Student team" })),
    reflections: {},
    rubric: program.rubric.map((item) => ({ ...item, score: null, feedback: "" })),
    publicProofConsent: false,
    activities: program.activities.map((item) => ({ ...item, actor: item.kind === "partner" ? program.partner.organisation : "Student team" })),
    notifications: notificationsFor(program, account)
  };
}

function activity(program: ProgramState, actor: string, action: string, kind: ProgramState["activities"][number]["kind"]): ProgramState {
  return { ...program, activities: [{ id: `activity-${randomUUID()}`, actor, action, kind, time: "Just now" }, ...program.activities].slice(0, 200) };
}

export function allRubricScoresPresent(program: ProgramState) {
  return program.rubric.length > 0 && program.rubric.every((item) => item.score !== null);
}

export function applyProgramMutation(current: ProgramState, candidate: ProgramState, account: PilotAccount, action: ProgramMutationAction): ProgramState {
  const reflectionKey = account.studentId && account.studentId !== STUDENT_TEAM_MEMBER_ID ? account.studentId : STUDENT_REFLECTION_KEY;
  if (action === "updated_workflow") {
    if (account.role === "teacher") return applyProgramMutation(current, candidate, account, "teacher_update");
    if (account.role === "admin") return applyProgramMutation(current, candidate, account, "admin_update");
    if (account.role === "partner") {
      if (candidate.mission.id !== current.mission.id) return applyProgramMutation(current, candidate, account, "partner_submit_mission");
      if (candidate.partnerValidated && !current.partnerValidated) return applyProgramMutation(current, candidate, account, "partner_validate");
      if (current.finalSubmitted && !candidate.finalSubmitted) return applyProgramMutation(current, candidate, account, "partner_request_revision");
      throw new Error("Partners can only submit a challenge, request a revision, or validate an assessed delivery.");
    }
    if (candidate.sources.length > current.sources.length) return applyProgramMutation(current, candidate, account, "student_add_source");
    if (candidate.artifacts.length > current.artifacts.length) return applyProgramMutation(current, candidate, account, "student_create_artifact");
    if (candidate.reflections[reflectionKey] !== current.reflections[reflectionKey]) return applyProgramMutation(current, candidate, account, "student_save_reflection");
    if (candidate.finalSubmitted && !current.finalSubmitted) return applyProgramMutation(current, candidate, account, "student_submit");
    const currentTeam = studentTeam(current, account.studentId || STUDENT_TEAM_MEMBER_ID);
    const candidateTeam = candidate.teams.find((team) => team.id === currentTeam?.id);
    if (currentTeam && candidateTeam && candidateTeam.milestone !== currentTeam.milestone) return applyProgramMutation(current, candidate, account, "student_checkpoint");
    throw new Error("This student update did not contain an allowed learning action.");
  }
  if (action === "teacher_update") {
    if (account.role !== "teacher") throw new Error("Only teachers can update learning, assessment, and mission review.");
    if (["approved", "in_progress", "submitted", "validated"].includes(candidate.mission.status) && !candidate.mission.safety.suitable) throw new Error("An unsuitable mission cannot be approved or published to students.");
    if (candidate.mission.status === "validated" && !current.partnerValidated) throw new Error("A mission cannot be marked validated before the partner accepts the result.");
    if (candidate.mission.status === "submitted" && !current.finalSubmitted) throw new Error("A mission cannot be marked submitted before the student team submits its work.");
    const next = {
      ...candidate,
      partnerValidated: current.partnerValidated,
      proofId: current.proofId,
      publicProofConsent: current.publicProofConsent || candidate.publicProofConsent,
      assessmentReleased: candidate.assessmentReleased && current.finalSubmitted && allRubricScoresPresent(candidate),
      finalSubmitted: current.finalSubmitted || candidate.finalSubmitted
    };
    const meaningfulWorkflowChange = candidate.mission.status !== current.mission.status
      || candidate.mission.teacherNote !== current.mission.teacherNote
      || candidate.finalSubmitted !== current.finalSubmitted
      || candidate.publicProofConsent !== current.publicProofConsent;
    return meaningfulWorkflowChange ? activity(next, account.name, "Updated teacher-reviewed mission work", "mission") : next;
  }
  if (action === "admin_update") {
    if (account.role !== "admin") throw new Error("Only administrators can update school governance settings.");
    const next: ProgramState = {
      ...current,
      school: { ...current.school, aiPolicy: candidate.school.aiPolicy, consentStatus: candidate.school.consentStatus },
      partner: { ...current.partner, verified: candidate.partner.verified },
      activities: [{ id: `activity-${randomUUID()}`, actor: account.name, action: "Updated school governance settings", kind: "safety" as const, time: "Just now" }, ...current.activities].slice(0, 200)
    };
    return next;
  }
  if (action === "partner_submit_mission") {
    if (account.role !== "partner") throw new Error("Only partner accounts can submit a community challenge.");
    const mission = { ...candidate.mission, status: "awaiting_review" as const, teacherNote: undefined };
    const next: ProgramState = {
      ...current,
      mission,
      partner: { ...current.partner, organisation: mission.organisation, challengeStatus: "in review" },
      teams: current.teams.map((team) => ({
        ...team,
        milestone: 0,
        health: "waiting" as const,
        lastActivity: "Awaiting teacher assignment",
        members: team.members.map((member, index) => ({
          ...member,
          role: mission.roles[index % Math.max(1, mission.roles.length)]?.title ?? member.role,
          contribution: 0,
          checkIn: "waiting" as const
        }))
      })),
      sources: [],
      artifacts: [],
      reflections: {},
      rubric: mission.rubric.map((item) => ({ criterion: item.criterion, weight: item.weight, score: null, feedback: "" })),
      finalSubmitted: false,
      assessmentReleased: false,
      partnerValidated: false,
      publicProofConsent: false,
      proofIssuedAt: null,
      proofId: `proof-${randomUUID()}`
    };
    return activity(next, account.name, "Submitted a community challenge for teacher review", "partner");
  }
  if (action === "partner_validate") {
    if (account.role !== "partner") throw new Error("Only the partner can validate community usefulness.");
    if (!current.finalSubmitted || !current.assessmentReleased || !allRubricScoresPresent(current)) throw new Error("Teacher assessment must be released before partner validation.");
    const next: ProgramState = { ...current, partnerValidated: true, proofIssuedAt: current.proofIssuedAt ?? new Date().toISOString(), mission: { ...current.mission, status: "validated" as const }, partner: { ...current.partner, challengeStatus: "validated" as const, impactNote: candidate.partner.impactNote } };
    return activity(next, account.name, "Validated the usefulness of the student delivery", "partner");
  }
  if (action === "partner_request_revision") {
    if (account.role !== "partner") throw new Error("Only the partner can request a delivery revision.");
    const next: ProgramState = { ...current, partnerValidated: false, finalSubmitted: false, assessmentReleased: false, mission: { ...current.mission, status: "in_progress" as const }, partner: { ...current.partner, challengeStatus: "active" as const, impactNote: candidate.partner.impactNote } };
    return activity(next, account.name, "Requested a revision to the community delivery", "partner");
  }
  if (account.role !== "student") throw new Error("This student action is not permitted for this account.");
  if (!studentMissionWritable(current)) throw new Error("Student work is available only after teacher approval and before final submission.");
  const team = studentTeam(current, account.studentId || STUDENT_TEAM_MEMBER_ID);
  if (action === "student_checkpoint") {
    const proposed = candidate.teams.find((item) => item.id === team?.id);
    if (!team || !proposed) throw new Error("Your assigned team could not be found.");
    const next = { ...current, teams: current.teams.map((item) => item.id === team.id ? { ...item, milestone: Math.max(item.milestone, Math.min(proposed.milestone, current.mission.milestones.length - 1)), lastActivity: "Student checkpoint saved just now" } : item) };
    return activity(next, account.name, "Saved a team milestone checkpoint", "team");
  }
  if (action === "student_add_source") {
    const added = candidate.sources.find((item) => !current.sources.some((source) => source.id === item.id));
    if (!added) throw new Error("Add one valid source before saving it.");
    const next = { ...current, sources: [{ ...added, confidence: "review" as const, addedBy: account.name }, ...current.sources].slice(0, 500) };
    return activity(next, account.name, "Added a source to the shared evidence log", "team");
  }
  if (action === "student_create_artifact") {
    const added = candidate.artifacts.find((item) => !current.artifacts.some((artifact) => artifact.id === item.id));
    if (!added) throw new Error("Create a named artefact before saving it.");
    const next = { ...current, artifacts: [{ ...added, owner: "Team Sundown", status: "draft" as const, updated: "just now" }, ...current.artifacts].slice(0, 500) };
    return activity(next, account.name, "Created a new artefact draft", "team");
  }
  if (action === "student_save_reflection") {
    const reflection = candidate.reflections[reflectionKey]?.trim();
    if (!reflection) throw new Error("Write a reflection before saving it.");
    const next = { ...current, reflections: { ...current.reflections, [reflectionKey]: reflection } };
    return activity(next, account.name, "Saved an individual project reflection", "submission");
  }
  if (action === "student_submit") {
    if ((current.reflections[reflectionKey] || "").trim().length < 30) throw new Error("Complete a meaningful individual reflection before submitting.");
    if (current.artifacts.length === 0 || current.sources.length === 0) throw new Error("Attach an artefact and source evidence before submitting.");
    const next = { ...current, finalSubmitted: true, assessmentReleased: false, partnerValidated: false, mission: { ...current.mission, status: "submitted" as const }, partner: { ...current.partner, challengeStatus: "delivered" as const } };
    return activity(next, account.name, "Submitted final work for teacher assessment", "submission");
  }
  throw new Error("That programme action is not recognised.");
}

export { SESSION_COOKIE, STUDENT_ACCOUNT_ID };

export function audit(actor: PilotAccount, action: string, target: string, metadata?: AuditRecord["metadata"]): AuditRecord {
  return { id: `audit-${randomUUID()}`, actorId: actor.id, actorRole: actor.role, action, target, createdAt: new Date().toISOString(), metadata };
}
