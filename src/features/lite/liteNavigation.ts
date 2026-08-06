// XL-5 (2026-08-06): moved to packages/features-lite/src/liteNavigation.ts as Phase 1 of the
// shared-core extraction (docs/readiness/AXXESS_LITE_SHARED_CORE_EXTRACTION_PLAN_2026_08_06.md).
// This file is now a thin backward-compat re-export so existing consumers (LiteShell.tsx,
// LiteHomeSection.tsx) keep working without any import-path changes -- deliberately not updated
// this pass, per the extraction plan's "update imports only where low-risk" guidance weighed
// against "don't touch more files than necessary." See src/features/lite/liteNavigation.test.ts
// for the test proving this re-export is intact.
export * from "@axxess/features-lite";
