// Lead-sourcing worker (2026-11-17). AWS Lambda on a schedule: claims the oldest queued run from
// AXXESS, crawls it (headless Chromium from @sparticuz/chromium for JavaScript-built sites), verifies
// guessed addresses under the run's credit cap, and posts the result back. Secrets are read at run
// time from Secrets Manager by ARN; nothing secret is in the template or the bundle.
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { verifyEmails } from "../../scripts/check-leads-csv.mts";
import { USER_AGENT } from "../../src/services/leadSourcing/crawl.ts";
import type { FetchText, RenderHtml } from "../../src/services/leadSourcing/types.ts";
import { processRun, type ClaimedRun } from "./process.ts";

const secrets = new SecretsManagerClient({});
const cache = new Map<string, string>();

async function secret(arn: string | undefined): Promise<string | undefined> {
  if (!arn) return undefined;
  if (!cache.has(arn)) {
    const out = await secrets.send(new GetSecretValueCommand({ SecretId: arn }));
    // Trimmed: a value stored with a trailing line break would otherwise never match AXXESS.
    cache.set(arn, (out.SecretString ?? "").trim());
  }
  return cache.get(arn) || undefined;
}

const fetchText: FetchText = async (url) => {
  try {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" }, redirect: "follow", signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return "";
    const type = response.headers.get("content-type") ?? "";
    if (type && !/text|html|xml/.test(type)) return "";
    return (await response.text()).slice(0, 800_000);
  } catch {
    return "";
  }
};

type Browser = import("playwright-core").Browser;

async function browserRenderer(): Promise<{ render: RenderHtml; close: () => Promise<void> }> {
  let browser: Browser | undefined;
  const get = async () => {
    if (!browser) {
      const [{ chromium }, sparticuz] = await Promise.all([import("playwright-core"), import("@sparticuz/chromium")]);
      browser = await chromium.launch({ executablePath: await sparticuz.default.executablePath(), args: sparticuz.default.args, headless: true });
    }
    return browser;
  };
  return {
    render: async (url) => {
      try {
        const context = await (await get()).newContext({ userAgent: USER_AGENT });
        try {
          const page = await context.newPage();
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
          await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
          return await page.content();
        } finally {
          await context.close();
        }
      } catch {
        return "";
      }
    },
    close: async () => {
      await browser?.close();
    },
  };
}

async function post(base: string, path: string, token: string, body: unknown): Promise<Response> {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
}

type LambdaContext = { getRemainingTimeInMillis: () => number };

export async function handler(_event: unknown, context: LambdaContext): Promise<{ claimed: boolean; runId?: string; status?: number }> {
  const base = (process.env.AXXESS_BASE_URL ?? "").replace(/\/$/, "");
  const token = await secret(process.env.WORKER_SECRET_ARN);
  if (!base || !token) throw new Error("AXXESS_BASE_URL and WORKER_SECRET_ARN must be set.");

  const claim = await post(base, "/api/lead-sourcing/worker/claim", token, {});
  if (!claim.ok) throw new Error(`Claim failed: HTTP ${claim.status}`);
  const { run } = (await claim.json()) as { run: ClaimedRun | null };
  if (!run) return { claimed: false };

  const qevKey = run.verifyCap > 0 ? await secret(process.env.QEV_SECRET_ARN) : undefined;
  const renderer = process.env.RENDER_DISABLED === "true" ? undefined : await browserRenderer();
  // Leave 2 minutes to verify guesses and report back.
  const deadline = Date.now() + Math.max(0, context.getRemainingTimeInMillis() - 120_000);
  try {
    const result = await processRun(run, {
      fetchText,
      render: renderer?.render,
      verify: qevKey ? (emails) => verifyEmails(emails, { apiKey: qevKey }) : undefined,
      now: () => Date.now(),
      deadline,
    });
    const done = await post(base, `/api/lead-sourcing/worker/runs/${run.id}`, token, result);
    console.log(JSON.stringify({ runId: run.id, status: done.status, ...result.stats, creditsSpent: result.creditsSpent }));
    return { claimed: true, runId: run.id, status: done.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await post(base, `/api/lead-sourcing/worker/runs/${run.id}`, token, { failure: message.slice(0, 300) }).catch(() => undefined);
    throw error;
  } finally {
    await renderer?.close();
  }
}
