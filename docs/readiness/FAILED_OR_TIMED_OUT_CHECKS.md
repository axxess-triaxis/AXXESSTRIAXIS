# Failed or Timed-Out Checks Log

Governed by: `docs/readiness/TEST_GOVERNANCE.md`, `docs/readiness/PRODUCTION_DEPLOY_EXCEPTION_POLICY.md`.
Created 2026-08-20. Records genuine, individually-investigated CI/test failures and timeouts so a
full-suite timeout is never misread as "the underlying work is untested" -- each entry states explicitly
whether the failure reflects a real code defect or an infra condition.

## Template

```markdown
Command:
Duration:
Last output:
Likely cause:
Was code failure:
Follow-up command:
Targeted verification result:
Decision:
```

## Known recurring pattern: Vitest "Worker exited unexpectedly"

```markdown
Command: pnpm run test (full untargeted suite, CI runner)
Duration: crashes ~4-5 minutes into the run, after all listed unit tests have already reported passing
Last output:
  node:events:497
        throw er; // Unhandled 'error' event
  Error: Worker exited unexpectedly
      at Worker.emitUnexpectedExit (.../vitest/dist/chunks/cli-api.BK8pd4xc.js:3023:33)
Likely cause: Vitest worker-pool crash under CI's full-parallel-suite runner, not tied to any specific
  test file's logic
Was code failure: No -- confirmed across multiple PRs (#264, #265, #266) where the crash occurs on
  diffs that never touch the files near the crash point, and the same signature repeats verbatim
  regardless of what changed
Follow-up command: Targeted `vitest run <specific-file>.test.ts` for the files actually changed in the
  diff
Targeted verification result: PASS in every instance checked this session (e.g. `invitationEmail.test.ts`
  4/4, `ProductAnalyticsSection.test.tsx` 13/13)
Decision: Treated as a known pre-existing infra flake per `docs/readiness/PRODUCTION_DEPLOY_EXCEPTION_POLICY.md`;
  not chased as a regression, but also not silently ignored -- documented here each time it recurs so a
  future session can recognize the pattern instantly instead of re-diagnosing it from scratch
```

## Known recurring pattern: Sprint 27 golden path Playwright timeout

```markdown
Command: pnpm exec playwright test tests/e2e/sprint27-golden-path.spec.ts
Duration: fails after 3 attempts (initial + 2 retries), ~24s total
Last output:
  Error: expect(locator).toBeVisible() failed
    at tests/e2e/sprint27-golden-path.spec.ts:24:61
    27 |     await page.goto("/ai-workspace/review-inbox");
Likely cause: A locator-visibility timing issue at the review-inbox navigation step, reproduced
  identically across PRs #264, #265, and #266 -- none of which touched this route or its rendering code
Was code failure: Not attributable to any of those three diffs specifically (same failure predates and
  postdates all three unrelated changes); whether it reflects an underlying app defect in the
  review-inbox route itself (as opposed to a test-environment timing issue) has not been separately
  root-caused -- flagged here as an open item, not asserted as definitely infra-only
Follow-up command: Not yet run in isolation outside CI to confirm local reproducibility
Targeted verification result: Not yet obtained
Decision: Treated as non-blocking precedent per the Production Deploy Exception Policy on the three PRs
  above; genuinely investigating root cause is a follow-up, not resolved by this entry
```

## How to add an entry

Every full-suite timeout or unexpected CI failure gets an entry here, using the template, before it is
waved through as "known flake." The first time a given failure signature appears, it should get a real
investigation (targeted command, actual result) -- only repeats of an already-documented signature can
be waved through quickly by citing this file.
