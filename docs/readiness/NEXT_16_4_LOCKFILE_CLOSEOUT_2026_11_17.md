# Next.js 16.4.x Lockfile - Closeout (2026-11-17)

## External signal

While PR #527 (outreach send window) was being verified on 2026-11-17, `pnpm run build` on `main` stopped on its first run with a Next.js `SecurityFatalError` notice. An unchanged retry then passed. `package.json` asks for `next` `^16.4.5` and `eslint-config-next` `^16.4.5`, but `pnpm-lock.yaml` on `main` (`c4d8bbe4`) resolved both to 16.4.2. This is unrelated to PR #527.

## Root cause

`pnpm-workspace.yaml` `overrides` pinned `next: 16.4.2` and `eslint-config-next: 16.4.2`. That pin was set on 2026-10-23 for the 16.4.1 RCE fixes. pnpm applies overrides ahead of `package.json` ranges, so neither later `package.json` bumps nor `pnpm update next` could move the lockfile off 16.4.2.

## What changed

- `pnpm-workspace.yaml`: both overrides moved from 16.4.2 to **16.4.6**, with a dated comment. npm shows 16.4.6 was published 2026-11-09. It is the newest 16.4.x past the 7-day `minimumReleaseAge` gate (16.4.5 was published 2026-11-03).
- `pnpm-lock.yaml` was regenerated with `pnpm install --no-frozen-lockfile` (+88/-100). It moved:
  - `next` and `eslint-config-next` to 16.4.6.
  - The 8 `@next/swc-*` platform binaries to 16.4.6.
  - Packages under next: `tslib` 2.8.1 to 2.9.1, and `@babel/parser` 7.29.9 and 7.29.11 to 7.29.12 (deduplicated).
  - `baseline-browser-mapping@2.11.33` dropped out of the graph.

## What did not change

- No application code. No `package.json` change, because it already asks for `^16.4.5`.
- No dependency changed major version. `pnpm install` lists other newer versions as available, but this change does not apply them.

## What was verified (worktree `C:\Users\Sudipta Sarmah\wt\axxess-next-lockfile`, 2026-11-17)

`.next` was deleted first, and the build was the first command run after install.

| Gate | Result |
| --- | --- |
| `pnpm run build` | Exit 0 **on the first run**. Banner `Next.js 16.4.6 (Turbopack)`, compiled in 87 s, 192/192 static pages. No `SecurityFatalError` in the output. |
| `pnpm run typecheck` | Exit 0 |
| `pnpm --dir apps/mobile run typecheck` | Exit 0 |
| `pnpm run lint` (`--max-warnings=0`) | Exit 0, zero warnings |
| `pnpm run test` | 378/378 test files, 2303/2303 tests passed (609.7 s) |
| `pnpm run supabase:verify` | `status: passed`: 57 migrations, 124 tables, 124 with RLS. The existing warning on `initial_enterprise_schema.sql` (permissive `using (true)`) is unchanged. |

`node_modules/next/package.json` reports version 16.4.6.

## What remains partial or unverified

- The build was run once after the fix. It passed first time, but one clean run cannot rule out an intermittent fault of a different kind.
- No Dependabot or `pnpm audit` re-check was run for this change.
- Not merged and not deployed. CI on the PR and the founder's go are still needed.

## Follow-up

- When a later Next.js patch is needed, change the override in `pnpm-workspace.yaml` as well as `package.json`. Otherwise the lockfile stays pinned.
