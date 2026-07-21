# Pluto product revamp record

## Goal

Replace the inconsistent prototype styling with one calm, premium, task-aware Pluto experience. The target is a purpose-built intelligent workspace, not a copied Apple, Gemini, or generic AI-template interface.

## Completed visual consolidation

- Replaced the active multi-layer CSS stack with `app/pluto-system.css`.
- Rebuilt the public landing experience around one message, one illustration, clear calls to action, and mission proof.
- Normalised typography, spacing, buttons, status states, navigation, cards, forms, and Proof presentation.
- Made dashboard headers moderate and decision-led instead of applying a giant hero to every screen.
- Kept policy, research, assessment, assignment, and work surfaces compact and task-first.
- Reduced impact analytics to two actionable signals rather than a wall of metrics.
- Preserved honest AI surfaces: mode, evidence count, citations, teacher approval, and Restricted policy behaviour.

## Current UI rules

1. A large visual surface is reserved for the landing page, mission overview, dashboard overview, or Proof.
2. A task page begins with context and the next action, not a decorative hero.
3. Every card must group a meaningful decision, task, or document.
4. Visible interface text stays legible; no tiny decorative labels.
5. AI guidance appears where it helps a decision and explains whether it is live, templated, or restricted.

## Follow-up work

- Move remaining migration-reference screens out of `pluto-complete.tsx` into smaller route-level components.
- Add visual regression snapshots at desktop, tablet, and mobile widths.
- Complete screen-reader and localisation reviews.
- Test real multi-mission and multi-class states before adding more dashboard surfaces.
- Introduce a small component catalog when the active visual primitives are stable.
