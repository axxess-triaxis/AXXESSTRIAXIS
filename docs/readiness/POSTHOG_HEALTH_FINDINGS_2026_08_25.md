# PostHog Health Findings -- 2026-08-25

Three separate PostHog signals, all founder-relayed (email/screenshot), reviewed and actioned this
session. Recorded together since they surfaced in the same conversation, but they are three
independent issues with different fix owners -- not one incident.

## 1. GitHub data warehouse syncs paused -- founder action required, not fixable from this repo

**Source:** PostHog Cloud email, "Data warehouse syncs paused in project 'AXXESS TRIaxis'," Sat,
Aug 22, 3:49 PM. Confirmed live in PostHog's own Health dashboard
(`us.posthog.com/project/498426/health`, screenshot shared 2026-08-25): Pipelines shows 5 issues.

**Failures:**
- `commits`, `issues`, `pull_requests`, `releases` -- "Repository not found. Please verify the
  repository name and access permissions." (status: Paused, action required)
- `stargazers` -- "Access forbidden. Your token may lack required permissions or have hit rate
  limits." (status: Paused, action required)

**Diagnosis (this session, verified against the real repo, not assumed):** `gh repo view
axxess-triaxis/AXXESSTRIAXIS` confirms the repo is real, public, correctly named, and has not been
renamed or moved -- ruling out the most common cause of "repository not found." The pattern (four
endpoints failing identically, a fifth failing differently on the same underlying source) is
consistent with a broken GitHub App/OAuth connection on PostHog's side losing visibility into this
specific repo -- not a repo-side problem.

**Fix -- requires the founder's own login, cannot be performed by an agent in this repo:**
1. GitHub side: check `github.com/settings/installations` (or the org's GitHub Apps settings) for
   the PostHog app's repository access list. Confirm `AXXESSTRIAXIS` is included; if the app shows
   "Only select repositories" and this one isn't checked, add it. If the app isn't installed at all,
   reinstall it from PostHog's side.
2. PostHog side: Data warehouse -> the GitHub source -> Reconnect/Reauthorize, after step 1 is
   confirmed. Since 4 of 5 syncs share the identical error, a single reconnect should clear all of
   them at once.

**Status:** Open, founder action required. Not tracked as a code defect -- there is no code fix for
a third-party integration's own app-authorization state.

## 2. `posthog-node` SDK critically outdated -- fixed this session

**Source:** Same PostHog Health dashboard screenshot -- SDKs card, 1 critical issue: "SDK outdated
-- Node.js SDK: latest 5.50.0. Latest in-use version 5.46.1 is behind 5.50.0 (31 days old).
Outdated versions still handling >=10% of traffic."

**Fix:** `posthog-node` bumped from `5.46.1` to `5.49.1` in `package.json` and the
`pnpm-workspace.yaml` catalog pin (both needed -- the catalog entry is what actually controls
resolution here, confirmed by observing `pnpm install` leave the lockfile unchanged when only
`package.json` was edited).

**Why 5.49.1, not the newest 5.51.1:** this repo enforces a `minimumReleaseAge` supply-chain policy
in its pnpm config. At install time, `posthog-node@5.51.1` (published 2026-08-24, ~1 day old) and
`5.51.0`/`5.49.2` through `5.50.0` all fell inside the enforced aging window and were rejected by
pnpm itself (`ERR_PNPM_NO_MATURE_MATCHING_VERSION`). `5.49.1` (published 2026-08-14) is the newest
version old enough to pass that policy -- a real security control working as intended, not a
workaround. `5.51.1` remains available once it ages past the cutoff; this is a partial fix (closes
the "critically outdated, >31 days behind" finding down to a few days behind an actively-guarded
threshold) rather than jumping straight to latest.

**Verified:** `pnpm install` resolved cleanly (`posthog-node 5.46.1 -> 5.49.1 (5.51.1 is
available)`); `tsc --noEmit` clean; `eslint --max-warnings=0` clean; lockfile confirmed to record
`posthog-node: 5.49.1`.

**Follow-up:** re-run this same bump once `5.51.1` (or a newer patch) clears the release-age
window, to fully close the gap rather than leaving it at 5.49.1 indefinitely.

## 3. Weekly error digest -- "Java object is..." errors, needs the full error text to diagnose

**Source:** PostHog Cloud weekly error-tracking digest for Triaxis Ventures Private Limited, Mon,
Aug 24, 2:03 PM, covering the prior week. AXXESS TRIaxis: 103 total exceptions (down 12% week over
week), 639 sessions (down 2%), 85.6% crash-free sessions (up 3%).

**Top issues this week:**
- "Script error." -- 42 occurrences. Almost certainly noise: a generic cross-origin script-failure
  message browsers emit when an error's real detail is stripped due to CORS (ad blockers, blocked
  third-party scripts, etc.) -- not usually actionable without source-map/CORS configuration
  specific to whichever third-party script is failing, which the digest does not identify.
- "Error invoking postMessage: Java object is..." (message truncated in the digest, exact ending
  not visible) -- occurring **four separate times** with different volumes (35, 20, 3, 2
  occurrences) plus **one new instance this week** (1 occurrence). This is the one worth real
  attention.

**What this session could verify about the postMessage error, and what it couldn't:**
- Grepped this codebase's own TypeScript/TSX source for direct `postMessage` calls: **zero
  matches.** This app's own code does not call `postMessage` anywhere -- the error does not
  originate from application-level code written in this repo.
- "Error invoking postMessage: Java object is..." is a known Android WebView symptom: it fires when
  JavaScript calls a method on a Java-backed bridge object (exposed via `addJavascriptInterface`,
  the mechanism Capacitor's own native bridge and third-party JS SDKs both rely on inside an Android
  WebView) after that Java object has already been invalidated -- typically during WebView
  reload/destroy or an Activity lifecycle transition (backgrounding/foregrounding the app).
- This app runs `posthog-js` with session replay/autocapture enabled
  (`src/services/analytics/PostHogSessionReplayInit.tsx`), which uses `rrweb` internally and is a
  plausible source of postMessage-style bridge activity inside a WebView. **However, this session's
  own MN-5 sprint (`docs/readiness/ANDROID_BETA_0_9_SECURITY_HARDENING_CLOSEOUT_2026_08_23.md`,
  merged to `main` before this branch's own history diverged from `main`) already disabled session
  replay specifically inside the native Capacitor app.** Whether this week's errors predate that fix
  reaching production, or represent a residual postMessage code path the fix doesn't cover (e.g.
  autocapture or the SDK's own network/heartbeat behavior, as opposed to replay recording
  specifically), **is not established by this session** -- the digest's truncated error text and
  lack of timestamps relative to the MN-5 deploy make this unresolvable from the data available.

**What is needed to actually diagnose this, not yet obtained:**
1. The full, untruncated error message and stack trace from PostHog's error tracking detail view
   (not just the digest summary) -- specifically what follows "Java object is..." (e.g. "...is gone,"
   "...is null," a specific exception class).
2. Exact timestamps for when these errors occurred, to check them against the MN-5 session-replay
   deploy timestamp and determine whether this is stale (pre-fix) or ongoing (post-fix, unresolved).
3. Which SDK/code path is actually implicated -- PostHog's own `posthog-js`/`rrweb`, Capacitor's
   native bridge itself, or a different third-party script.

**Status:** Open, root cause not established. Recorded here as a real, non-trivial finding worth
investigating further with the fuller error detail from PostHog's dashboard, not as a diagnosed and
closed issue.
