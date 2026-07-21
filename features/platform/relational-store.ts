import { backup, DatabaseSync } from "node:sqlite";
/* SQLite's untyped row/JSON boundary is isolated in this adapter. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync } from "fs";
import { mkdir, readdir } from "fs/promises";
import path from "path";
import type { PilotAccount } from "./contracts";

/**
 * The pilot used a JSON document as its source of truth.  The application
 * still consumes the PilotDatabase contract while this adapter moves storage
 * to SQLite, so the migration is reversible and API consumers do not need to
 * change all at once.
 */
export type RelationalSnapshot = {
  version: number;
  schoolId: string;
  program: unknown;
  students: unknown[];
  comments: unknown[];
  files: unknown[];
  voiceNotes: unknown[];
  assignmentProposal?: unknown;
  assignmentHistory: unknown[];
  studentAssessments: unknown[];
  proofSnapshots: unknown[];
  consents: unknown[];
  audits: unknown[];
  integrations: unknown[];
};

// Vercel's deployed function filesystem is read-only except for /tmp. The
// pilot store is intentionally lightweight, so keep its demo data writable in
// the serverless runtime instead of failing every authenticated API request.
// This is ephemeral storage; a durable production deployment should provide a
// real database through a future adapter (or an explicit PLUTO_DATA_DIRECTORY).
const configuredDirectory = process.env.PLUTO_DATA_DIRECTORY?.trim();
const DATA_DIRECTORY = configuredDirectory
  ? path.resolve(configuredDirectory)
  : process.env.VERCEL
    ? path.join("/tmp", "pluto-pilot")
    : path.join(process.cwd(), ".pluto-pilot");
const SQLITE_FILE = path.join(DATA_DIRECTORY, "platform.sqlite");

const migrations: Array<{ name: string; sql: string }> = [
  {
    name: "001_relational_foundation",
    sql: `
      CREATE TABLE IF NOT EXISTS schools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        district TEXT NOT NULL,
        ai_policy TEXT NOT NULL,
        consent_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS organisations (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        contact TEXT NOT NULL DEFAULT '',
        verified INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        student_id TEXT,
        organisation_id TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        grade TEXT NOT NULL,
        teacher_user_id TEXT,
        deadline TEXT NOT NULL,
        student_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (teacher_user_id) REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE TABLE IF NOT EXISTS missions (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        organisation_id TEXT REFERENCES organisations(id) ON DELETE SET NULL,
        class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
        status TEXT NOT NULL,
        generation_mode TEXT,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        email TEXT,
        name TEXT NOT NULL,
        grade TEXT NOT NULL,
        interests_json TEXT NOT NULL,
        strengths_json TEXT NOT NULL,
        availability TEXT NOT NULL,
        accessibility_notes TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS enrollments (
        id TEXT PRIMARY KEY,
        class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        UNIQUE(class_id, student_id)
      );
      CREATE TABLE IF NOT EXISTS program_state (
        id TEXT PRIMARY KEY CHECK (id = 'active'),
        version INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS assignment_proposals (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS assignment_history (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS student_assessments (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS proof_snapshots (
        proof_id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL,
        issued_at TEXT NOT NULL,
        revoked_at TEXT,
        payload_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL,
        thread TEXT NOT NULL,
        author_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        artifact_id TEXT,
        publication_state TEXT NOT NULL DEFAULT 'private',
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS voice_notes (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS consents (
        id TEXT PRIMARY KEY,
        learner_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        recorded_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audits (
        id TEXT PRIMARY KEY,
        actor_id TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        action TEXT NOT NULL,
        target TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS integrations (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS activity_events (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        kind TEXT NOT NULL,
        occurred_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
      CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);
      CREATE INDEX IF NOT EXISTS idx_missions_school ON missions(school_id);
      CREATE INDEX IF NOT EXISTS idx_comments_mission ON comments(mission_id);
      CREATE INDEX IF NOT EXISTS idx_files_mission ON files(mission_id);
      CREATE INDEX IF NOT EXISTS idx_audits_created ON audits(created_at);
      `
  },
  {
    name: "002_assignment_history",
    sql: `CREATE TABLE IF NOT EXISTS assignment_history (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, status TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS student_assessments (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, student_id TEXT NOT NULL, payload_json TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS proof_snapshots (proof_id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, issued_at TEXT NOT NULL, revoked_at TEXT, payload_json TEXT NOT NULL);`
  }
];

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "record";
}

function now() {
  return new Date().toISOString();
}

function openDatabase() {
  mkdirSync(DATA_DIRECTORY, { recursive: true });
  const database = new DatabaseSync(SQLITE_FILE);
  database.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;");
  database.exec("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);");
  for (const migration of migrations) {
    const applied = database.prepare("SELECT 1 AS present FROM schema_migrations WHERE name = ?").get(migration.name) as { present?: number } | undefined;
    if (!applied) {
      database.exec("BEGIN IMMEDIATE;");
      try {
        database.exec(migration.sql);
        database.prepare("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)").run(migration.name, now());
        database.exec("COMMIT;");
      } catch (error) {
        database.exec("ROLLBACK;");
        database.close();
        throw error;
      }
    }
  }
  const columns = (table: string) => new Set((database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((column) => column.name));
  if (!columns("students").has("payload_json")) database.exec("ALTER TABLE students ADD COLUMN payload_json TEXT NOT NULL DEFAULT '{}';");
  if (!columns("students").has("status")) database.exec("ALTER TABLE students ADD COLUMN status TEXT NOT NULL DEFAULT 'active';");
  if (!columns("files").has("publication_state")) database.exec("ALTER TABLE files ADD COLUMN publication_state TEXT NOT NULL DEFAULT 'private';");
  if (!columns("users").has("student_id")) database.exec("ALTER TABLE users ADD COLUMN student_id TEXT;");
  if (!columns("users").has("organisation_id")) database.exec("ALTER TABLE users ADD COLUMN organisation_id TEXT;");
  return database;
}

function json(value: unknown) {
  return JSON.stringify(value ?? null);
}

function parse(value: unknown) {
  try { return JSON.parse(String(value)); } catch { return null; }
}

function insertRows(database: DatabaseSync, table: string, rows: unknown[], fields: string[], values: (row: any) => unknown[]) {
  database.exec(`DELETE FROM ${table};`);
  const placeholders = fields.map(() => "?").join(", ");
  const statement = database.prepare(`INSERT INTO ${table} (${fields.join(", ")}) VALUES (${placeholders})`);
  for (const row of rows) statement.run(...(values(row) as any[]));
}

export function readRelationalSnapshot(): RelationalSnapshot | null {
  const database = openDatabase();
  try {
    const state = database.prepare("SELECT version, payload_json FROM program_state WHERE id = 'active'").get() as { version: number; payload_json: string } | undefined;
    if (!state) return null;
    const rows = (table: string) => database.prepare(`SELECT payload_json FROM ${table}`).all() as Array<{ payload_json: string }>;
    const proposal = database.prepare("SELECT payload_json FROM assignment_proposals ORDER BY updated_at DESC LIMIT 1").get() as { payload_json: string } | undefined;
    const school = database.prepare("SELECT id FROM schools ORDER BY updated_at DESC LIMIT 1").get() as { id?: string } | undefined;
    return {
      version: state.version,
      schoolId: school?.id || "harbourview",
      program: parse(state.payload_json),
      students: rows("students").map((row) => parse(row.payload_json)),
      comments: rows("comments").map((row) => parse(row.payload_json)),
      files: rows("files").map((row) => parse(row.payload_json)),
      voiceNotes: rows("voice_notes").map((row) => parse(row.payload_json)),
      assignmentProposal: proposal ? parse(proposal.payload_json) : undefined,
      assignmentHistory: rows("assignment_history").map((row) => parse(row.payload_json)),
      studentAssessments: rows("student_assessments").map((row) => parse(row.payload_json)),
      proofSnapshots: rows("proof_snapshots").map((row) => parse(row.payload_json)),
      consents: rows("consents").map((row) => parse(row.payload_json)),
      audits: rows("audits").map((row) => parse(row.payload_json)),
      integrations: rows("integrations").map((row) => parse(row.payload_json))
    };
  } finally {
    database.close();
  }
}

export function relationalUser(accountId: string): PilotAccount | null {
  const database = openDatabase();
  try {
    const row = database.prepare("SELECT id, email, name, role, school_id, student_id, organisation_id FROM users WHERE id = ? AND status = 'active'").get(accountId) as { id: string; email: string; name: string; role: PilotAccount["role"]; school_id: string; student_id?: string; organisation_id?: string } | undefined;
    return row ? { id: row.id, email: row.email, name: row.name, role: row.role, schoolId: row.school_id, ...(row.student_id ? { studentId: row.student_id } : {}), ...(row.organisation_id ? { organisationId: row.organisation_id } : {}) } : null;
  } finally {
    database.close();
  }
}

export function relationalUserByEmail(email: string): PilotAccount | null {
  const database = openDatabase();
  try {
    const row = database.prepare("SELECT id, email, name, role, school_id, student_id, organisation_id FROM users WHERE lower(email) = lower(?) AND status = 'active'").get(email.trim()) as { id: string; email: string; name: string; role: PilotAccount["role"]; school_id: string; student_id?: string; organisation_id?: string } | undefined;
    return row ? { id: row.id, email: row.email, name: row.name, role: row.role, schoolId: row.school_id, ...(row.student_id ? { studentId: row.student_id } : {}), ...(row.organisation_id ? { organisationId: row.organisation_id } : {}) } : null;
  } finally {
    database.close();
  }
}

export function writeRelationalSnapshot(snapshot: RelationalSnapshot) {
  const database = openDatabase();
  const timestamp = now();
  const program = snapshot.program as any;
  const schoolId = snapshot.schoolId || "harbourview";
  const organisationId = `organisation-${slug(String(program?.partner?.organisation || "community-partner"))}`;
  const classId = `class-${slug(String(program?.classRoom?.name || "active-class"))}`;
  const missionId = String(program?.mission?.id || "mission-active");
  const teacherId = "teacher-devi";
  database.exec("BEGIN IMMEDIATE;");
  try {
    database.prepare(`INSERT INTO schools (id, name, district, ai_policy, consent_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, district=excluded.district, ai_policy=excluded.ai_policy, consent_status=excluded.consent_status, updated_at=excluded.updated_at`)
      .run(schoolId, program?.school?.name || "School", program?.school?.district || "District", program?.school?.aiPolicy || "Teacher reviewed", program?.school?.consentStatus || "Needs review", timestamp, timestamp);
    const upsertUser = database.prepare(`INSERT INTO users (id, school_id, email, name, role, student_id, organisation_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, email=excluded.email, role=excluded.role, student_id=excluded.student_id, organisation_id=excluded.organisation_id, school_id=excluded.school_id, updated_at=excluded.updated_at`);
    upsertUser.run("partner-anitha", schoolId, "partner@pluto.local", "Anitha Menon", "partner", null, organisationId, timestamp, timestamp);
    upsertUser.run(teacherId, schoolId, "teacher@pluto.local", "Ms. Devi Nair", "teacher", null, null, timestamp, timestamp);
    upsertUser.run("student-asha", schoolId, "student@pluto.local", "Asha Raman", "student", "s1", null, timestamp, timestamp);
    upsertUser.run("admin-ravi", schoolId, "admin@pluto.local", "Ravi Varma", "admin", null, null, timestamp, timestamp);
    for (const student of snapshot.students as any[]) if (student.userId) upsertUser.run(student.userId, schoolId, student.email || `${student.userId}@school.local`, student.name, "student", student.id, null, timestamp, timestamp);
    database.prepare(`INSERT INTO organisations (id, school_id, name, contact, verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, contact=excluded.contact, verified=excluded.verified, updated_at=excluded.updated_at`)
      .run(organisationId, schoolId, program?.partner?.organisation || "Community partner", program?.partner?.contact || "", program?.partner?.verified ? 1 : 0, timestamp, timestamp);
    database.prepare(`INSERT INTO classes (id, school_id, name, grade, teacher_user_id, deadline, student_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, grade=excluded.grade, teacher_user_id=excluded.teacher_user_id, deadline=excluded.deadline, student_count=excluded.student_count, updated_at=excluded.updated_at`)
      .run(classId, schoolId, program?.classRoom?.name || "Active class", program?.classRoom?.grade || "", teacherId, program?.classRoom?.deadline || "", program?.classRoom?.studentCount || 0, timestamp, timestamp);
    database.prepare(`INSERT INTO missions (id, school_id, organisation_id, class_id, status, generation_mode, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET organisation_id=excluded.organisation_id, class_id=excluded.class_id, status=excluded.status, generation_mode=excluded.generation_mode, payload_json=excluded.payload_json, updated_at=excluded.updated_at`)
      .run(missionId, schoolId, organisationId, classId, program?.mission?.status || "draft", program?.mission?.generationMode || null, json(program?.mission || {}), program?.mission?.createdAt || timestamp, timestamp);

    insertRows(database, "students", snapshot.students, ["id", "school_id", "email", "name", "grade", "interests_json", "strengths_json", "availability", "accessibility_notes", "status", "created_at", "updated_at", "payload_json"], (student: any) => [student.id, schoolId, student.email || null, student.name, student.grade || program?.classRoom?.grade || "", json(student.interests || []), json(student.strengths || []), student.availability || "full", student.accessibilityNotes || null, student.status || "active", timestamp, timestamp, json(student)]);
    database.prepare("DELETE FROM enrollments").run();
    const enrollment = database.prepare("INSERT INTO enrollments (id, class_id, student_id, status, created_at) VALUES (?, ?, ?, 'active', ?)");
    for (const student of snapshot.students as any[]) if ((student.status || "active") !== "archived") enrollment.run(`enrollment-${classId}-${student.id}`, classId, student.id, timestamp);
    database.prepare("INSERT INTO program_state (id, version, payload_json, updated_at) VALUES ('active', ?, ?, ?) ON CONFLICT(id) DO UPDATE SET version=excluded.version, payload_json=excluded.payload_json, updated_at=excluded.updated_at").run(snapshot.version, json(program), timestamp);
    insertRows(database, "comments", snapshot.comments, ["id", "mission_id", "thread", "author_id", "payload_json", "created_at"], (row: any) => [row.id, row.missionId || missionId, row.thread || "team", row.author?.id || "unknown", json(row), row.createdAt || timestamp]);
    insertRows(database, "files", snapshot.files, ["id", "mission_id", "owner_id", "artifact_id", "publication_state", "payload_json", "created_at"], (row: any) => [row.id, row.missionId || missionId, row.ownerId || "unknown", row.artifactId || null, row.publicationState || "private", json(row), row.createdAt || timestamp]);
    insertRows(database, "voice_notes", snapshot.voiceNotes, ["id", "owner_id", "status", "payload_json", "created_at"], (row: any) => [row.id, row.ownerId || "unknown", row.status || "queued", json(row), row.createdAt || timestamp]);
    insertRows(database, "consents", snapshot.consents, ["id", "learner_id", "payload_json", "recorded_at"], (row: any) => [row.id, row.learnerId || "unknown", json(row), row.recordedAt || timestamp]);
    insertRows(database, "audits", snapshot.audits, ["id", "actor_id", "actor_role", "action", "target", "payload_json", "created_at"], (row: any) => [row.id, row.actorId || "unknown", row.actorRole || "admin", row.action || "unknown", row.target || "unknown", json(row), row.createdAt || timestamp]);
    insertRows(database, "integrations", snapshot.integrations, ["id", "status", "payload_json", "updated_at"], (row: any) => [row.id, row.status || "not_connected", json(row), row.updatedAt || timestamp]);
    database.prepare("DELETE FROM assignment_proposals").run();
    if (snapshot.assignmentProposal) {
      const proposal: any = snapshot.assignmentProposal;
      database.prepare("INSERT INTO assignment_proposals (id, mission_id, status, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(proposal.id, proposal.missionId || missionId, proposal.status || "draft", json(proposal), proposal.createdAt || timestamp, timestamp);
    }
    insertRows(database, "assignment_history", snapshot.assignmentHistory, ["id", "mission_id", "status", "payload_json", "created_at"], (proposal: any) => [proposal.id, proposal.missionId || missionId, proposal.status || "approved", json(proposal), proposal.createdAt || timestamp]);
    insertRows(database, "student_assessments", snapshot.studentAssessments, ["id", "mission_id", "student_id", "payload_json", "updated_at"], (assessment: any) => [`${assessment.missionId}-${assessment.studentId}-${assessment.criterion}`, assessment.missionId || missionId, assessment.studentId || "unknown", json(assessment), assessment.updatedAt || timestamp]);
    insertRows(database, "proof_snapshots", snapshot.proofSnapshots, ["proof_id", "mission_id", "issued_at", "revoked_at", "payload_json"], (snapshot: any) => [snapshot.proofId, snapshot.missionId || missionId, snapshot.issuedAt || timestamp, snapshot.revokedAt || null, json(snapshot)]);
    database.exec("COMMIT;");
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  } finally {
    database.close();
  }
}

export async function createRelationalBackup() {
  const directory = path.join(DATA_DIRECTORY, "backups");
  await mkdir(directory, { recursive: true });
  const target = path.join(directory, `platform-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite`);
  const database = openDatabase();
  try { await backup(database, target); } finally { database.close(); }
  return target;
}

export async function listRelationalBackups() {
  const directory = path.join(DATA_DIRECTORY, "backups");
  const names = await readdir(directory).catch(() => [] as string[]);
  return names.filter((name) => name.endsWith(".sqlite")).sort().reverse();
}

export { DATA_DIRECTORY as RELATIONAL_DATA_DIRECTORY, SQLITE_FILE };
