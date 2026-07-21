# Pluto delivery plan

## Completed internal-pilot foundation

- One school/community mission definition across partner, teacher, student, and admin workspaces.
- Relational SQLite migration and server-side school/resource authorisation.
- Roster import, supported team proposal, teacher approval history, and undo.
- Honest AI modes, server-enforced Restricted policy, evidence-aware coach context, and provenance audits.
- Per-student assessment foundations, gradebook export, consent controls, partner validation, and immutable Proof snapshots.
- A unified design system that makes landing and dashboard stories deliberate while keeping task pages compact.

## Next: multi-mission pilot

1. Model and present multiple live missions and classes per school.
2. Add teacher-facing conflict handling, assignment diffs, and roster change review.
3. Replace remaining migration-reference component code with route-level components and browser tests.
4. Add accessible and localised content patterns before involving multiple schools.

## Next: production readiness

1. Managed school identity, invitations, role provisioning, and tenant administration.
2. Managed database, encrypted object storage, backup/restore drills, retention, and deletion controls.
3. Moderation and worker queues for voice transcription, file scanning, retrieval, and notifications.
4. Search/retrieval with claim-level citations and an evidence-quality review workflow.
5. Observability, security monitoring, rate controls, CI, load testing, and operational runbooks.

## Integrations

Implement OAuth-backed LMS/SIS, gradebook, calendar, and collaboration integrations only after the school/mission/class model is stable. Current integration controls are pilot placeholders and must not be represented as connected production systems.

## Release gate

Do not release to a real school until a role can complete its full workflow with managed identity, correct resource isolation, consent and publication gates, recovery/backup confidence, accessibility support, and an auditable operating model.
