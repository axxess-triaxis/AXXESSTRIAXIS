# Release Pipeline Upgrade: PR Description and Release Notes

## Pull Request Description

### Title
ci(release): enforce binary thresholds, generate release manifest, and finalize single-gate sign-off

### Summary
This PR upgrades the mobile release pipeline into a strict, audit-ready release gate for Android and iOS store submissions.

### What changed

- Enforced per-release build metadata and strict release preflight checks.
- Added final `release-signoff` gate that validates:
  - prerequisite job success,
  - required checklist artifact presence,
  - required binary output presence (`.aab/.apk`, `.ipa/.xcarchive`),
  - checklist JSON content integrity (readiness flags, env checks, plugin count),
  - minimum binary size thresholds to reject placeholder builds.
- Added machine-readable release manifest generation and artifact upload:
  - `release-manifest-<run>.json`.
- Published release summary in `GITHUB_STEP_SUMMARY` for auditable sign-off.

### Binary threshold policy

- Android minimum binary size: `1,000,000` bytes.
- iOS minimum binary size: `2,000,000` bytes.

### Artifacts now produced

- `release-checklist-<run>`
- `capacitor-android-release-<run>`
- `capacitor-ios-release-<run>`
- `release-manifest-<run>`

### Why

This ensures store submissions cannot proceed on partial, placeholder, or misconfigured builds, and gives downstream systems a deterministic manifest contract.

### Risk assessment

- Low functional risk to app runtime; changes are workflow-side.
- Medium release-process strictness increase (intended): invalid release payloads now fail early.

### Rollback

- Revert workflow changes in `.github/workflows/mobile-capacitor-release.yml`.
- Revert related script additions in `scripts/` if needed.

## Release Notes Block

### Release pipeline hardening

- Added a strict final release sign-off gate for mobile production builds.
- Release now fails unless Android and iOS artifacts include valid binaries:
  - Android: `.aab` or `.apk`
  - iOS: `.ipa` or `.xcarchive`
- Added minimum binary size checks to prevent placeholder uploads.
- Added machine-readable `release-manifest.json` artifact with:
  - run metadata,
  - release versions/build numbers,
  - artifact hashes and sizes,
  - checklist snapshots.
- Added richer Actions summary output for faster audit and sign-off decisions.
