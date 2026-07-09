# Wix Local Environment Setup

The Wix setup modal should point to the AXXESS repository, not the older `triaxis-ventures` repository.

Use this setup:

```bash
npm install -g @wix/cli
git clone https://github.com/axxess-triaxis/AXXESSTRIAXIS.git
cd AXXESSTRIAXIS
pnpm install
```

If Wix is being used as a deployment or integration surface for AXXESS, start the local Wix editor from this repository after the Wix CLI is authenticated:

```bash
wix dev
```

## Dashboard Correction

In the Wix dashboard or connected project settings, replace any stale GitHub reference like:

```text
git@github.com:axxess-triaxis/triaxis-ventures.git
```

with:

```text
https://github.com/axxess-triaxis/AXXESSTRIAXIS.git
```

This keeps Wix, GitHub, Expo, Vercel, Supabase, and Bitrise pointed at the same source of truth.

