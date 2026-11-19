// Lead-sourcing worker (2026-11-17). AWS Lambda on a schedule: claims the oldest queued run from
// AXXESS, crawls it (headless Chromium from @sparticuz/chromium for JavaScript-built sites), verifies
// guessed addresses under the run's credit cap, and posts the result back. Secrets are read at run
// time from Secrets Manager by ARN; nothing secret is in the template or the bundle.
// 2026-11-18: with DISCOVERY_ENABLED=true it first runs the AXXESS scheduler tick, then takes a
// discovery run (a model on Bedrock + AgentCore web search) before any crawl run. One unit per call.
import { BedrockAgentCoreClient, InvokeWebSearchCommand } from "@aws-sdk/client-bedrock-agentcore";
import { BedrockRuntimeClient, ConverseCommand, type ConverseCommandInput } from "@aws-sdk/client-bedrock-runtime";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { verifyEmails } from "../../scripts/check-leads-csv.mts";
import { USER_AGENT } from "../../src/services/leadSourcing/crawl.ts";
import type { FetchText, RenderHtml } from "../../src/services/leadSourcing/types.ts";
import type { Converse, ConverseResponse, WebSearch } from "../../src/services/leadSourcing/discover.ts";
import { runDiscovery, type ClaimedDiscovery } from "./discovery.ts";
import { processRun, settleWithin, type ClaimedRun } from "./process.ts";

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
      const launched = await chromium.launch({ executablePath: await sparticuz.default.executablePath(), args: sparticuz.default.args, headless: true });
      // A crashed browser is relaunched for the next page instead of being reused.
      launched.on("disconnected", () => {
        if (browser === launched) browser = undefined;
      });
      browser = launched;
    }
    return browser;
  };
  const renderOnce = async (url: string) => {
    const context = await (await get()).newContext({ userAgent: USER_AGENT });
    try {
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 });
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
      return await page.content();
    } finally {
      await context.close();
    }
  };
  return {
    // Launch (cold start unpacks Chromium) plus goto plus idle wait stays well under 60 s.
    render: (url) => settleWithin(renderOnce(url), 60_000, ""),
    close: () => settleWithin(browser?.close() ?? Promise.resolve(), 10_000, undefined),
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

const bedrock = new BedrockRuntimeClient({});
const agentcore = new BedrockAgentCoreClient({});

const converse: Converse = async (request) =>
  (await bedrock.send(new ConverseCommand(request as unknown as ConverseCommandInput))) as unknown as ConverseResponse;

const search: WebSearch = async (query) => {
  const out = await agentcore.send(new InvokeWebSearchCommand({ webSearchId: "web-search.v1", searchQuery: query, maxResults: 8 }));
  return (out.results ?? []).map((r) => ({ title: r.title ?? "", url: r.url ?? "", text: r.text ?? "" }));
};

/** CloudWatch embedded metric (written to stdout directly: Text-format console.log would prefix it). */
function metric(values: Record<string, number>) {
  process.stdout.write(
    JSON.stringify({
      _aws: { Timestamp: Date.now(), CloudWatchMetrics: [{ Namespace: "AXXESS/LeadSourcing", Dimensions: [["Stage"]], Metrics: Object.keys(values).map((Name) => ({ Name, Unit: "Count" })) }] },
      Stage: process.env.STAGE ?? "unknown",
      ...values,
    }) + "\n",
  );
}

async function discoverOne(base: string, token: string): Promise<{ claimed: boolean; runId?: string; status?: number }> {
  const tick = await post(base, "/api/lead-sourcing/worker/tick", token, {});
  if (!tick.ok) console.error(`Scheduler tick failed: HTTP ${tick.status}`);
  else console.log(JSON.stringify({ tick: await tick.json() }));

  const claim = await post(base, "/api/lead-sourcing/worker/claim-discovery", token, {});
  if (!claim.ok) throw new Error(`Discovery claim failed: HTTP ${claim.status}`);
  const { run } = (await claim.json()) as { run: ClaimedDiscovery | null };
  if (!run) return { claimed: false };
  try {
    const payload = await runDiscovery(run, { converse, search, fetchText, modelId: process.env.DISCOVERY_MODEL_ID ?? "openai.gpt-oss-20b-1:0" });
    const done = await post(base, `/api/lead-sourcing/worker/runs/${run.id}/seeds`, token, payload);
    metric({ DiscoverySearches: payload.searchCount, DiscoveryCompanies: payload.companies.length, DiscoveryFailures: 0 });
    console.log(JSON.stringify({ discoveryRunId: run.id, status: done.status, ...payload.stats, inputTokens: payload.llmInputTokens, outputTokens: payload.llmOutputTokens }));
    return { claimed: true, runId: run.id, status: done.status };
  } catch (error) {
    metric({ DiscoverySearches: 0, DiscoveryCompanies: 0, DiscoveryFailures: 1 });
    const message = error instanceof Error ? error.message : String(error);
    await post(base, `/api/lead-sourcing/worker/runs/${run.id}/seeds`, token, { failure: message.slice(0, 300) }).catch(() => undefined);
    throw error;
  }
}

export async function handler(_event: unknown, context: LambdaContext): Promise<{ claimed: boolean; runId?: string; status?: number }> {
  const base = (process.env.AXXESS_BASE_URL ?? "").replace(/\/$/, "");
  const token = await secret(process.env.WORKER_SECRET_ARN);
  if (!base || !token) throw new Error("AXXESS_BASE_URL and WORKER_SECRET_ARN must be set.");

  if (process.env.DISCOVERY_ENABLED === "true") {
    const discovered = await discoverOne(base, token);
    if (discovered.claimed) return discovered;
  }

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
