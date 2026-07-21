-- Pluto relational foundation.
-- The executable migration is embedded in features/platform/relational-store.ts
-- so Next's server bundle does not depend on the working directory. This file
-- remains the human-readable migration contract for operators and future DB
-- tooling.

CREATE TABLE schools (id TEXT PRIMARY KEY, name TEXT NOT NULL, district TEXT NOT NULL, ai_policy TEXT NOT NULL, consent_status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE organisations (id TEXT PRIMARY KEY, school_id TEXT NOT NULL, name TEXT NOT NULL, contact TEXT NOT NULL DEFAULT '', verified INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE users (id TEXT PRIMARY KEY, school_id TEXT NOT NULL, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL, student_id TEXT, organisation_id TEXT, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE classes (id TEXT PRIMARY KEY, school_id TEXT NOT NULL, name TEXT NOT NULL, grade TEXT NOT NULL, teacher_user_id TEXT, deadline TEXT NOT NULL, student_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE missions (id TEXT PRIMARY KEY, school_id TEXT NOT NULL, organisation_id TEXT, class_id TEXT, status TEXT NOT NULL, generation_mode TEXT, payload_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE students (id TEXT PRIMARY KEY, school_id TEXT NOT NULL, email TEXT, name TEXT NOT NULL, grade TEXT NOT NULL, interests_json TEXT NOT NULL, strengths_json TEXT NOT NULL, availability TEXT NOT NULL, accessibility_notes TEXT, status TEXT NOT NULL DEFAULT 'active', payload_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE enrollments (id TEXT PRIMARY KEY, class_id TEXT NOT NULL, student_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL, UNIQUE(class_id, student_id));
CREATE TABLE program_state (id TEXT PRIMARY KEY CHECK (id = 'active'), version INTEGER NOT NULL, payload_json TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE assignment_proposals (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, status TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE assignment_history (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, status TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE student_assessments (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, student_id TEXT NOT NULL, payload_json TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE proof_snapshots (proof_id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, issued_at TEXT NOT NULL, revoked_at TEXT, payload_json TEXT NOT NULL);
CREATE TABLE comments (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, thread TEXT NOT NULL, author_id TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE files (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, owner_id TEXT NOT NULL, artifact_id TEXT, publication_state TEXT NOT NULL DEFAULT 'private', payload_json TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE voice_notes (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, status TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE consents (id TEXT PRIMARY KEY, learner_id TEXT NOT NULL, payload_json TEXT NOT NULL, recorded_at TEXT NOT NULL);
CREATE TABLE audits (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, actor_role TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE integrations (id TEXT PRIMARY KEY, status TEXT NOT NULL, payload_json TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE activity_events (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, kind TEXT NOT NULL, occurred_at TEXT NOT NULL);
