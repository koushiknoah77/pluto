# Pluto delivery backlog

`[x]` is implemented in this workspace. `[~]` is a usable internal-pilot foundation. `[ ]` is required before a school-wide production release.

## Product and experience

- [x] Define one school/community mission product and retire the active coding-studio experience.
- [x] Consolidate the running UI into the Pluto design system: public story, dashboard hierarchy, compact task pages, and responsive shell.
- [x] Reserve large visual heroes for the landing page, mission overviews, and dashboards; keep forms and work pages task-first.
- [~] Split the remaining migration-reference components in `components/pluto-complete.tsx` into route-level files without changing behaviour.
- [ ] Complete accessibility audits, keyboard testing, screen-reader review, localisation, and multilingual content design.

## Identity, data, and operations

- [x] Move the pilot source of truth to migration-backed SQLite with school, organisation, mission, class, enrollment, user, student, assignment, evidence, consent, audit, assessment, and Proof tables.
- [x] Add active school/mission authorisation checks and stable student identity links at the API boundary.
- [ ] Replace demo sessions with managed school-scoped identity, invitations, managed database, and object storage.
- [ ] Finish restore drills, retention/deletion policies, encryption, audit export, monitoring, alerting, and CI.

## Mission, roster, and learning work

- [~] Roster import supports stable user mapping, merge/replace, active/archive state, validation, and accommodations; add SIS/LMS preview, sync, and conflict resolution.
- [x] Add deterministic assignment constraints, accommodations, teacher approval history, and undo.
- [ ] Support multiple missions and classes per school in the main UI; the current UI projects one active mission.
- [ ] Add optimistic concurrency, conflict detection, and teacher approval diffs.

## Evidence, AI, and publication

- [x] Make AI mode visible and auditable, enforce Restricted policy server-side, and pass approved evidence to the coach.
- [~] Retrieve public HTTPS evidence and record citations; add search, claim-level grounding, moderation queues, and durable retrieval storage.
- [x] Store AI mode, policy, evidence count, model, and moderation provenance audits.
- [~] Add recipient-scoped notifications, versioned file metadata, per-student assessment rows, gradebook exports, and immutable Proof snapshots.
- [ ] Add worker retries, malware scanning, moderation review, full delivery packages, appeals, and real OAuth-backed LMS/SIS integrations.
