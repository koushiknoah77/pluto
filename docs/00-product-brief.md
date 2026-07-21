# Pluto product brief

## Product

Pluto is a supervised learning platform for school-and-community work. A verified organisation shares a local challenge. Pluto structures it as a safeguarded, curriculum-linked mission. A teacher decides whether it is suitable, students complete evidence-backed work in assigned teams, and the partner validates the usefulness of the final delivery.

## Core promise

Turn a real local need into meaningful learning that is easy to understand, assess, and verify.

## Roles

- **School administrator:** manages school policy, consent, partner directory, integrations, and programme reporting.
- **Teacher:** reviews and approves missions, imports a roster, approves team proposals, supports teams, assesses work, and controls delivery.
- **Community organisation:** shares the need, follows approved progress, requests revision, and validates usefulness without seeing private student records.
- **Student:** completes an assigned role, records evidence and reflection, and submits work for teacher review.

## Core records

Schools own organisations, users, classes, enrollments, students, missions, teams, assignments, evidence, artefacts, assessments, consents, notifications, audits, and immutable Pluto Proof snapshots. Records are scoped to the school and, where relevant, to a mission and class.

## Lifecycle

```text
Organisation intake
  -> safety review and mission draft
  -> teacher approval
  -> roster import and assignment proposal
  -> teacher approval of teams
  -> student work and evidence
  -> teacher assessment
  -> partner validation
  -> immutable Pluto Proof snapshot
```

## AI contract

AI can draft and coach only when the school policy allows it. Every response declares `live`, `template`, or `restricted` mode. Restricted policy is enforced on the server. Coaches receive teacher-approved evidence only and return citations or state that evidence is insufficient. Teachers approve missions, student-facing work, partner delivery, and public sharing.

## Explicitly out of scope until implemented

- Unsupervised student-to-partner contact.
- Automatic grading or AI-only assessment.
- Unverified citations or invented evidence.
- Public student data or raw household data collection.
- Production use of demo identities, local SQLite storage, or local file uploads.
