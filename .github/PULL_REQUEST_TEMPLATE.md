## Summary

Describe what changed and why.

## Linear

Linked issue: `AXX-___` or `N/A`

## Type

- [ ] Feature
- [ ] Fix
- [ ] Refactor
- [ ] Documentation
- [ ] Security
- [ ] Infrastructure

## Enterprise Impact

- [ ] UI visual language preserved or approved design change attached
- [ ] Tenant and RBAC impact considered
- [ ] Data model or migration impact documented
- [ ] Environment variable or secret impact documented
- [ ] Accessibility impact considered
- [ ] Audit logging impact considered
- [ ] RLS impact considered
- [ ] This PR does not add a >500 LOC file without a documented reason (`pnpm run repo:large-files`)
- [ ] This PR does not add duplicate surface code (a second implementation of something that already exists)
- [ ] This PR does not add generated/build files to git (`pnpm run repo:bloat:guard`)
- [ ] This PR does not increase memory-heavy imports (large parsers/SDKs pulled into a route or bundle where not needed)
- [ ] If this PR leaves something dead or half-migrated, a deletion/refactor follow-up is named (not silently left for someone else to find)

## Verification

- [ ] `pnpm run typecheck`
- [ ] `pnpm run lint`
- [ ] `pnpm run test`
- [ ] `pnpm run build`

## Screenshots

Add screenshots or recordings for UI-visible changes.

## Notes

Add rollout, migration, or follow-up notes.
