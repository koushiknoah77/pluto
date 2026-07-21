# Contributing to Pluto

Thanks for helping make real-world learning safer and more useful.

## Before you begin

1. Use Node 22.5 or later and pnpm 11.7 or later.
2. Copy .env.example to .env.local only when you need optional live AI features.
3. Never commit API keys, local pilot data, learner information, recordings, or exported Proof records.
4. Treat all seeded accounts and mission data as demonstration material, not real identities.

## Local workflow

1. Install dependencies with pnpm install.
2. Run pnpm dev and open http://127.0.0.1:3000.
3. Make focused changes that preserve the product boundaries: teachers approve missions and assessment; partners never receive individual grades; AI mode and provenance remain visible.
4. Before opening a pull request, run:

   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm build

## Pull requests

- Explain the user problem and the role affected: partner, teacher, student, or school administrator.
- Keep a change small enough to review.
- Include screenshots or a short screen recording for visual changes.
- Add or update tests when changing server behaviour, contracts, assignment constraints, policy enforcement, or data migration.
- Update the documentation when the product flow, API surface, AI policy, data boundary, or deployment path changes.

## Product guardrails

- Do not make a template response look like live AI.
- Enforce Restricted AI policy on the server, not only in the interface.
- Pass only approved evidence to coaching features.
- Keep teacher approval before student publication, assessment, partner delivery, and public Proof.
- Do not add real student data to issues, pull requests, fixtures, screenshots, or demos.
