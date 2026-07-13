# Expo Auto Builds

Expo GitHub integration connects the repository to Expo, but it does not automatically build every commit by itself. Auto-builds require an EAS workflow with an `on.push` trigger.

## Preview Builds

AXXESS mobile preview builds are defined in:

```text
apps/mobile/.eas/workflows/create-preview-builds.yml
```

This workflow runs on pushes to `main` only when mobile-relevant files change:

- `apps/mobile/**`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`

It creates Android and iOS preview builds with the `preview` EAS profile and the `preview` EAS environment.

## Production Builds

Production builds remain manual through:

```text
apps/mobile/.eas/workflows/create-production-builds.yml
```

That workflow uses `workflow_dispatch` only, so production releases must be started intentionally from Expo or with:

```bash
pnpm --dir apps/mobile run eas:workflow:production
```

## What Will Not Trigger Mobile Builds

If a commit changes only web, docs, or other non-mobile files, the preview mobile workflow will not start because the `paths` filter intentionally excludes those changes.

## Credentials

If Android or iOS signing credentials are missing in Expo, EAS may still queue the workflow and then fail at the credential stage. Configure Expo-managed credentials before relying on automated preview builds for regular testing.
