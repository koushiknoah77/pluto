# Pluto quality, privacy, and security

## Non-negotiable boundaries

- Teacher approval gates student access, partner-facing publication, and public Proof sharing.
- Partners do not see private student records or assign grades.
- The client cannot override Restricted AI policy.
- Coaches receive approved evidence only; AI must not invent citations or request sensitive learner data.
- Demo identities, local SQLite data, and local uploads are never production services.
- Public Proof verification reads immutable snapshots and requires the appropriate consent state.

## Required automated checks

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The current test suite includes relational migration coverage. Expand it with API authorisation, assignment constraints, AI-policy, consent/publication, Proof, and file-handling tests as the product matures.

## Manual release checks

- Keyboard-only navigation, clear focus, mobile widths, zoom, and reduced motion.
- Role isolation for partner, teacher, student, and administrator accounts.
- No API key: Template mode is visible and usable.
- Restricted policy: the coach never makes a live model call.
- Teacher approval, assessment release, partner validation, and Proof consent gates.
- Failed requests, empty evidence, invalid roster import, duplicate mapping, and interrupted draft recovery.
- Production readiness endpoint, backup restore drill, and audit export review.

## Production controls still required

Managed identity, encryption at rest and in transit, secure object storage, malware scanning, rate limiting, privacy retention/deletion policies, monitoring, incident response, and supplier review remain required before handling real student data at scale.
