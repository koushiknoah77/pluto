# Pluto

**Turn local problems into real learning.**

Pluto connects schools with community organisations. An organisation shares a real need, Pluto prepares a safe mission draft, a teacher approves the work, students contribute evidence-backed work, and the partner validates whether the result is useful. The completed record becomes a privacy-aware Pluto Proof.

> **Status:** an open, local pilot foundation. It is designed for demonstration and further development; it is not yet approved for real student data or school-wide production use.

![Pluto's learning-community mission illustration](public/images/pluto-learning-community-hero.png)

## Repository guide

This repository is ready for local development and GitHub collaboration. It includes a public-safe configuration example, a contributor guide, security guidance, an MIT license, and a GitHub Actions quality workflow.

- Start with the [local setup](#local-setup), then run the checks before opening a pull request.
- Read [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow.
- Read [SECURITY.md](SECURITY.md) before reporting a vulnerability or handling school data.
- The project remains private in npm configuration on purpose; that prevents accidental package publishing and does not restrict hosting it on GitHub.

## What is in this workspace

- A public mission story for schools and community partners.
- Role-based workspaces for partners, teachers, students, and school administrators.
- Teacher-controlled roster import, balanced team proposals, editable role allocation, approval history, and undo.
- Student work tools for milestones, sources, artefacts, reflection, and final submission.
- Honest AI states: **Live AI**, **Template mode**, and **Restricted** policy.
- Server-enforced evidence, consent, publication, assessment, and Proof boundaries.
- A migration-backed relational SQLite pilot store under `.pluto-pilot/`.
- A single responsive Pluto design system in `app/pluto-system.css`; the old competing CSS layers are not loaded.

The seeded demo is a Kochi waste-separation mission. It exists so every role can be reviewed without creating real school data.

## Product flow

```text
Community need
  -> safety and mission draft
  -> teacher approval
  -> roster and team proposal
  -> teacher approval of assignments
  -> student evidence-backed work
  -> teacher assessment
  -> partner validation
  -> immutable Pluto Proof snapshot
```

Teachers remain responsible for mission approval, student-facing publication, assessment, and partner delivery. Partners validate usefulness, never individual grades.

## AI behaviour

Pluto never presents a template as live AI.

- **Live AI:** uses the configured OpenAI model to draft a mission or provide a bounded coach response.
- **Template mode:** uses a safe local structure when no API key is configured or a live response fails.
- **Restricted:** is enforced on the server. The coach returns safety and reflection guidance only, even if a client attempts to request live AI.
- The coach receives teacher-approved evidence only and returns citations or says that the evidence is insufficient.
- Generation and coaching record model, mode, policy, and evidence provenance in the audit trail.

## Codex contribution

Codex accelerated the project work across the product definition, interface consolidation, API contracts, server-side AI policy boundaries, draft persistence, team assignment workflows, documentation, and verification. The live runtime models are configurable through environment variables; Pluto always distinguishes a live result from a local template fallback.

## Design system

The current UI intentionally separates page purposes:

- The public landing page and mission/proof overviews may use a large visual story.
- Role dashboards use one moderate overview and one or two decision signals.
- Forms, assignment, research, assessment, and work pages use compact task-first headers.
- Labels are never tiny decorative text; cards group decisions or work, not every paragraph.

See [docs/01-ux-ui-spec.md](docs/01-ux-ui-spec.md) for the complete experience specification.

## Local setup

```powershell
pnpm install
pnpm dev
```

Open `http://127.0.0.1:3000`.

### Optional live AI configuration

Create `.env.local` to enable live generation, coaching, and transcription:

```env
OPENAI_API_KEY=your_key
OPENAI_MISSION_MODEL=gpt-5.6
OPENAI_MENTOR_MODEL=gpt-5.6
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
PLUTO_SESSION_SECRET=replace-with-a-long-random-secret
# Optional: PLUTO_DATA_DIRECTORY=D:\pluto-data
```

Without `OPENAI_API_KEY`, Pluto remains usable in clearly labelled Template mode.

### Checks

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

### Vercel deployment

Add PLUTO_SESSION_SECRET in the Vercel project settings for every environment that serves the app, then redeploy. Generate a strong value locally with:

    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

Keep the generated value in Vercel only. Never commit it to .env.example, source control, or a screenshot.

## Pilot accounts

These local-only accounts all use the password `pluto-demo`:

- `partner@pluto.local`
- `teacher@pluto.local`
- `student@pluto.local`
- `admin@pluto.local`

They are not production authentication. Do not expose the local pilot store or these accounts publicly.

## Key API groups

| Area | Routes |
| --- | --- |
| Mission and AI | `/api/missions/generate`, `/api/coach`, `/api/challenges/transcribe` |
| Identity and programme | `/api/platform/session`, `/api/platform/program`, `/api/platform/audits` |
| Roster and assignment | `/api/platform/roster`, `/api/platform/assignments` |
| Evidence and work | `/api/platform/research/check`, `/api/platform/files`, `/api/platform/comments` |
| Assessment and governance | `/api/platform/assessment`, `/api/platform/consents`, `/api/platform/notifications` |
| Proof and exports | `/api/platform/proof/verify/:id`, `/proof/:id`, `/api/platform/exports/grades` |

## Production boundary

This repository is an internal pilot foundation, not a school-wide production deployment. Before real student use, Pluto still needs managed identity, a managed relational database and object store, retention/deletion controls, malware scanning, monitoring, background workers, accessibility validation, localisation, and real LMS/SIS integrations.

`NODE_ENV=production` requires `PLUTO_SESSION_SECRET`. `PLUTO_DATA_DIRECTORY` can move pilot data outside the repository, but neither setting turns the local pilot storage into a production data platform.

## Documentation

The [docs](docs/README.md) directory is the product source of truth. Start with:

1. [Product brief](docs/00-product-brief.md)
2. [Experience and UI specification](docs/01-ux-ui-spec.md)
3. [Frontend architecture](docs/02-frontend-architecture.md)
4. [Backend and AI architecture](docs/03-backend-ai-architecture.md)
5. [Delivery plan](docs/05-delivery-plan.md)
