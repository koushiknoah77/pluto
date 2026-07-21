# Security policy

## Supported scope

Pluto is currently a local pilot foundation. It is not approved for real school deployment or real student data. Contributions should preserve that boundary until managed identity, production data controls, retention/deletion policies, monitoring, and security review are in place.

## Reporting a vulnerability

Please do not open a public issue for a vulnerability, exposed credential, student-data concern, authorisation bypass, file-upload issue, or AI-policy bypass. Use GitHub's private security advisory flow for this repository, or contact the repository owner through the private channel listed on the repository profile.

Include a concise reproduction path, the affected route or component, impact, and any suggested mitigation. Do not include secrets or personal data.

## Immediate safeguards

- Keep OPENAI_API_KEY and PLUTO_SESSION_SECRET in .env.local only.
- Keep .pluto-pilot and smoke-test data out of version control.
- Do not publish pilot account credentials, uploaded files, voice notes, consent records, or Proof exports.
- Treat server-side authorisation and Restricted policy checks as security-sensitive code.
