# Security Policy

AXXESS is designed for enterprise and public-sector deployment. Please treat security issues with care and avoid public disclosure until a fix is available.

## Supported Versions

During pre-1.0 development, only the latest mainline version is actively maintained.

| Version | Supported |
| ------- | --------- |
| main    | Yes       |
| < main  | No        |

## Reporting a Vulnerability

Do not open public issues for vulnerabilities. Send a private report to the project maintainers with:

- Affected area or route.
- Reproduction steps.
- Expected impact.
- Any known tenant, RBAC, data exposure, or escalation path.
- Suggested mitigation, if known.

Maintainers should acknowledge valid reports, assess severity, prepare a fix privately, and publish release notes once the issue is resolved.

## Secret Handling

- Never commit `.env`, `.env.local`, service role keys, API keys, private certificates, or tenant exports.
- Only `NEXT_PUBLIC_*` variables may be exposed to browser code.
- Server-side credentials must be provided through local environment files or managed deployment secrets.
- Use least-privilege keys for development and production integrations.

## Security Architecture Status

- Authentication: architecture prepared, not connected.
- RBAC: mock route guard architecture in place.
- Supabase RLS: draft migration prepared.
- Secrets: documented in `.env.example`.
- CSP and security headers: configured in `next.config.mjs`.
- Production tenant isolation: planned before connecting live data.
