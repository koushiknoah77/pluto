# Pluto data and API contracts

## Core records

| Record | Scope | Purpose |
| --- | --- | --- |
| School | School | Policy, consent posture, integrations, and programme ownership. |
| Organisation | School | Verified community partner and challenge owner. |
| User and student | School | Authenticated identity and learner profile. |
| Class and enrollment | School and class | Teaching context and roster lifecycle. |
| Mission | School and organisation | Approved local learning brief, milestones, safeguards, roles, and deliverables. |
| Assignment proposal | Mission and class | Teacher-reviewable team/role proposal with history and undo. |
| Evidence and artefact | Mission and learner/team | Claims, sources, files, and learning work. |
| Assessment | Mission and learner | Teacher judgement and feedback. |
| Consent and publication state | Learner and mission | Permission for learning, partner delivery, and public Proof. |
| Audit and Proof snapshot | School and mission | Immutable accountability and verification record. |

## API responsibility map

| Route group | Responsibility |
| --- | --- |
| `/api/platform/session` | Signed local-pilot session lifecycle and role-aware demo identity. |
| `/api/platform/program` | Canonical programme projection and authorised workflow updates. |
| `/api/platform/roster` | Roster import, validation, stable mapping, and lifecycle controls. |
| `/api/platform/assignments` | Proposal, teacher approval, history, and undo. |
| `/api/platform/research/check` | Evidence/source review boundary. |
| `/api/platform/files` and `/comments` | Versioned work metadata and collaboration records. |
| `/api/platform/assessment` | Per-student teacher assessment and release controls. |
| `/api/platform/consents` | Consent recording and publication gates. |
| `/api/platform/proof/verify/:id` | Privacy-preserving public Proof verification. |
| `/api/missions/generate` and `/api/coach` | AI draft/coach services with policy and provenance controls. |

## Mutation principles

- Authorise before loading or mutating protected data.
- Use action-specific requests rather than saving a full programme for every field change.
- Return the canonical updated programme projection after mutation.
- Keep partner-facing data separate from student-private data.
- Gate public and partner delivery with teacher approval and active consent.

## Contract validation

`features/platform/contracts.ts` and `features/missions/schema.ts` use Zod to bound public inputs and persisted projections. API routes must reject malformed, cross-school, or role-incompatible inputs rather than attempting to repair them silently.
