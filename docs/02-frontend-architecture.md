# Pluto frontend architecture

## Runtime shape

- `app/page.tsx` and `app/dashboard/page.tsx` mount `PlutoApp`.
- `components/pluto-complete.tsx` contains the role-aware product shell and route selection for the internal pilot.
- `components/pluto-realm.tsx` owns the public mission story and landing experience.
- `components/assignment-workspace.tsx` owns the teacher roster-import and team-proposal flow.
- `app/pluto-system.css` is the active visual system. Earlier product-refresh, realm, premium, identity, experience, bevel, onboarding, and globals styles are no longer loaded.

## Page model

The role shell renders a shared header, role navigation, current mission context, and a page body. The public landing and Proof experience deliberately use separate public layouts.

| Role | Main pages |
| --- | --- |
| Partner | Challenge dashboard, mission intake, delivery validation. |
| Teacher | Dashboard, mission review, roster and teams, monitoring, assessment. |
| Student | Mission briefing, team work, research, artefacts, reflection, submission. |
| Administrator | Programme overview, partner directory, AI and safety policy, impact analytics. |

## State and mutation boundary

- Client state is optimistic only until an authenticated server mutation returns the canonical programme projection.
- `features/platform/relational-store.ts` persists the pilot projection to relational SQLite. JSON is a migration input and backup only.
- Debounced or action-specific mutations avoid treating every keystroke as an activity event.
- Local UI state can help the demo stay responsive, but permission and publication decisions are made on the server.

## Presentation rules

- Public landing, mission, dashboard, and Proof surfaces may use a visual narrative.
- Work, form, research, assessment, and policy pages use compact headers and focused content.
- `PageHeader`, `Card`, `Metric`, and status primitives are shared presentational patterns; future cleanup should move migration-reference screens out of `pluto-complete.tsx` into route-level components.

## Client privacy boundary

Students should receive only the approved mission, their assigned team, teacher-approved evidence, and their own reflection/assessment context. Partners receive delivery/publication-approved material only. The browser does not decide access rights.
