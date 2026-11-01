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

## Practice Standards (`CLAUDE.md`, "Paxel 9.5 Practice Standards")

- [ ] Acceptance criteria were stated before the work began, and are met
- [ ] Bug fix: a regression test fails before the fix and passes after it (or the reason none is possible is given)
- [ ] Every error hit while making this change is fixed, or recorded with an ID and owner
- [ ] Deploy-facing: an independent live check against the deployed SHA is recorded (not only a green run)
- [ ] Each decision or product insight has an Outcome, or `Pending, review by <date>` in `docs/readiness/DECISION_OUTCOME_LEDGER.md`

## Evidence

See `docs/readiness/EVIDENCE_INDEX.md`, `docs/readiness/CLOSEOUT_TEMPLATE.md`.

- Issue ID:
- Plan:
- Research:
- Closeout:
- Readiness matrix row:
- Test commands and results (raw, not "tests pass"):
- Playwright result (if UI/routing/auth/onboarding/dashboard change):
- Lint:
- Typecheck:
- Build:
- Deploy/live proof (if deploy-facing):
- Remaining risk:

## Screenshots

Add screenshots or recordings for UI-visible changes.

## Notes

Add rollout, migration, or follow-up notes.
