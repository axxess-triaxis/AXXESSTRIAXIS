# Wix GitHub Integration

Sprint 14 adds a controlled public website export path for Wix-connected marketing surfaces.

## Export Command

Run:

```bash
pnpm run export:wix
```

The command writes sanitized public JSON files to `public/website/`.

## Safety Rules

- No tenant data
- No secrets
- No service-role keys
- No private documents
- No audit logs

The export is intentionally content-only. Wix can consume these JSON files from GitHub without receiving application credentials or customer data.
