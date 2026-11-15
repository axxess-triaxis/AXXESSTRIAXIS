import { rmSync } from "node:fs";
import { request, type FullConfig } from "@playwright/test";

// Opt-in for running this suite against a protected Vercel deployment (staging). When
// VERCEL_AUTOMATION_BYPASS_SECRET is set, one request asks Vercel to set its bypass cookie and the
// resulting storage state is loaded into every test's browser context. The header itself is not sent
// browser-wide: it would also reach Supabase, whose CORS rules reject it (see tests/stack/stack.spec.ts).
export const vercelBypassStatePath = "node_modules/.cache/playwright-vercel-bypass-state.json";

export default async function globalSetup(config: FullConfig) {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!secret) return;
  const baseURL = config.projects[0]?.use.baseURL;
  const context = await request.newContext({ baseURL });
  const response = await context.get("/auth", {
    headers: { "x-vercel-protection-bypass": secret, "x-vercel-set-bypass-cookie": "true" },
  });
  if (!response.ok()) {
    await context.dispose();
    throw new Error(`Vercel bypass request to ${baseURL}/auth returned ${response.status()}. Check the bypass secret.`);
  }
  await context.storageState({ path: vercelBypassStatePath });
  await context.dispose();
  // The state file holds a bypass cookie, so it never outlives the run.
  return () => rmSync(vercelBypassStatePath, { force: true });
}
