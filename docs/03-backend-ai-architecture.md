# Pluto backend and AI architecture

## System boundary

```text
Browser
  -> authenticated API route
  -> resource authorisation
  -> relational pilot store
  -> policy and evidence gate
  -> OpenAI model or safe template fallback
  -> schema validation and provenance audit
  -> canonical programme response
```

The browser never receives an OpenAI key and cannot choose an AI mode that the school policy disallows.

## AI modes

| Mode | When it is used | Product behaviour |
| --- | --- | --- |
| `live` | An API key is configured and school policy permits assistance. | Use the configured model after validation; record model and provenance. |
| `template` | No key is configured, a request fails, or a response does not validate. | Return a safe structured mission draft or Socratic coach fallback. |
| `restricted` | The school's policy is Restricted. | Enforce the policy server-side and return safety/reflection guidance only. |

`/api/missions/generate` accepts a bounded partner challenge and produces a teacher-review mission draft. It rejects clearly unsafe, exploitative, privacy-invasive, or age-inappropriate prompts before a model call.

`/api/coach` receives only the learner question and approved evidence available to that learner. It returns one bounded next step with citations or states that approved evidence is insufficient. A Restricted policy cannot be bypassed by client parameters.

`/api/challenges/transcribe` is optional live transcription. Voice notes are handled as a queued private input and should be backed by durable workers before production use.

## Authorisation and persistence

- `features/platform/server-auth.ts` resolves the signed pilot session.
- `features/platform/resource-auth.ts` applies school, role, mission, class, and learner boundaries at API routes.
- `features/platform/relational-store.ts` migrates and persists the relational SQLite pilot store.
- `features/platform/server-store.ts` centralises programme updates, consent checks, publication conditions, and Proof snapshot logic.

The pilot data root defaults to `.pluto-pilot/`. `PLUTO_DATA_DIRECTORY` can relocate it. In production mode, `PLUTO_SESSION_SECRET` is required before the server will create or verify pilot sessions.

## Provenance

Mission generation and coach responses record the actor, action, mission, policy, AI mode, model when live, and evidence count in the audit trail. Proof snapshots preserve the state at issuance time rather than reading mutable live records later.

## Production follow-up

Replace local sessions and SQLite with managed identity and a managed relational database. Move file storage and background work to appropriate services, add worker retries and moderation queues, and introduce full retrieval/search infrastructure before claiming grounded AI at scale.
