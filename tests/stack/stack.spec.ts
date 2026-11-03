import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { loginAs, seededUsers } from "../e2e/helpers";
import { loadStackConfig } from "./guard";

// Triggers each product through its real entry point, then checks the result in the AXXESS UI.
// Uses the AWS CLI so the app's own dependencies do not grow for a staging-only test.
// Tasks stay in staging afterwards: AXXESS has no delete tool, and each run's are marked by its ID.
const config = loadStackConfig();
const runId = `stack-${Date.now()}-${randomUUID().slice(0, 8)}`;

function regionOf(arn: string): string {
  return arn.split(":")[3];
}

function aws(region: string, ...args: string[]): string {
  return execFileSync("aws", [...args, "--region", region, "--output", "json"], { encoding: "utf8" });
}

// A number that cannot belong to anyone: 555-0100 to 555-0199 are reserved for fiction.
function testPhone(): string {
  return `+120255501${String(Math.floor(Math.random() * 100)).padStart(2, "0")}`;
}

function invokeLambda(region: string, functionName: string, payload: object): Record<string, unknown> {
  const dir = mkdtempSync(join(tmpdir(), "stack-e2e-"));
  const outFile = join(dir, "response.json");
  aws(
    region, "lambda", "invoke", "--function-name", functionName,
    "--cli-binary-format", "raw-in-base64-out", "--payload", JSON.stringify(payload), outFile,
  );
  const response = JSON.parse(readFileSync(outFile, "utf8")) as Record<string, unknown>;
  rmSync(dir, { recursive: true });
  return response;
}

function putEvent(source: string, type: string, envelope: object): void {
  const entries = [{ EventBusName: config.busArn, Source: source, DetailType: type, Detail: JSON.stringify(envelope) }];
  const response = JSON.parse(aws(regionOf(config.busArn), "events", "put-events", "--entries", JSON.stringify(entries)));
  expect(response.FailedEntryCount).toBe(0);
}

async function triage(sender: string, messageId: string, text: string) {
  const adminKey = process.env.STACK_CALLISMATIC_ADMIN_KEY;
  if (!adminKey) throw new Error("Missing STACK_CALLISMATIC_ADMIN_KEY");
  const url = JSON.parse(aws("us-east-1", "lambda", "get-function-url-config", "--function-name", config.callismaticFunction)).FunctionUrl;
  const response = await fetch(`${url}api/triage/text`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": adminKey },
    body: JSON.stringify({ channel: "sms", sender, message_id: messageId, text, place_callbacks: false }),
  });
  expect(response.status).toBe(200);
  return (await response.json()) as { error: string | null; callback_result: unknown; triage: { category: string; needs_decision: boolean } | null };
}

// A task's description only shows once it is opened, so each row is opened in turn.
async function countTasksMentioning(page: Page, marker: string): Promise<number> {
  await page.goto("/tasks");
  const rows = page.locator("button.min-w-0.flex-1.text-left");
  await expect(rows.first()).toBeVisible({ timeout: 30_000 });
  let found = 0;
  for (let index = 0; index < (await rows.count()); index += 1) {
    await rows.nth(index).click();
    if (await page.getByText(marker).first().isVisible().catch(() => false)) found += 1;
  }
  return found;
}

async function expectExactlyOneTask(page: Page, marker: string, timeoutMs = 3 * 60_000) {
  await expect.poll(() => countTasksMentioning(page, marker), { timeout: timeoutMs, intervals: [15_000] }).toBe(1);
}

function leadEnvelope(id: string, marker: string, overrides: object = {}) {
  const now = new Date().toISOString();
  return {
    specversion: "1.0",
    id,
    source: "triaxis.callismatic",
    type: "lead.triaged.v1",
    time: now,
    data: {
      source_ref: marker,
      triaged_at: now,
      channel: "text",
      caller_number: null,
      triage: {
        category: "lead",
        summary: `Stack test event ${marker}: a synthetic lead.`,
        key_facts: { test: "true" },
        needs_decision: true,
        decision_reason: "Stack end-to-end test.",
        suggested_action: `Stack test ${marker}`,
        callback_recommended: false,
        callback_task: null,
        block_recommended: false,
        urgency: "low",
      },
    },
    ...overrides,
  };
}

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await loginAs(page, seededUsers.orgAdminAlpha);
});

test("a Callismatic lead becomes one AXXESS task", async ({ page }) => {
  const messageId = `${runId}-lead`;
  const result = await triage(
    testPhone(),
    messageId,
    "Hello, I run a 40-bed hospital and we want to buy your platform for all our staff this quarter. " +
      "We have budget approved. Please confirm whether we can sign a contract by Friday.",
  );
  expect(result.error).toBeNull();
  expect(result.callback_result).toBeNull();
  expect(result.triage?.category).toMatch(/lead|important/);
  expect(result.triage?.needs_decision).toBe(true);
  await expectExactlyOneTask(page, `sms:${messageId}`);
});

test("a completed Omnidamus conversation becomes one task, and no real message is sent", async ({ page }) => {
  const phone = testPhone();
  const marker = `${runId}-conversation`;
  const topicRegion = regionOf(config.omnidamusSmsTopicArn);
  const opened = invokeLambda(topicRegion, config.omnidamusFunction, {
    action: "start_conversation",
    phone,
    notification: "Thanks for your interest. When would you like your demo?",
    context: `Stack test ${marker}: book a demo time, then close the conversation.`,
  });
  expect(String(opened.message_id)).toMatch(/^captured-/);

  aws(topicRegion, "sns", "publish", "--topic-arn", config.omnidamusSmsTopicArn, "--message", JSON.stringify({
    originationNumber: phone,
    messageBody: "Thursday at 3pm works. That is everything I need, thank you. No further help needed.",
    inboundMessageId: `${marker}-1`,
  }));
  await expectExactlyOneTask(page, marker);
});

test("the same event delivered twice makes one task", async ({ page }) => {
  const marker = `${runId}-replay`;
  const envelope = leadEnvelope(randomUUID(), marker);
  putEvent("triaxis.callismatic", "lead.triaged.v1", envelope);
  putEvent("triaxis.callismatic", "lead.triaged.v1", envelope);
  await expectExactlyOneTask(page, marker);
  await page.waitForTimeout(30_000);
  expect(await countTasksMentioning(page, marker)).toBe(1);
});

test("spam makes no task", async ({ page }) => {
  const messageId = `${runId}-spam`;
  const result = await triage(
    testPhone(),
    messageId,
    "CONGRATULATIONS you won a free gift card!!! Click this link now and send your bank password to claim it.",
  );
  expect(result.error).toBeNull();
  expect(result.triage?.category).not.toMatch(/lead|important/);
  await page.waitForTimeout(90_000);
  expect(await countTasksMentioning(page, `sms:${messageId}`)).toBe(0);
});

test("a malformed event reaches the failure queue and makes no task", async ({ page }) => {
  const marker = `${runId}-malformed`;
  const id = randomUUID();
  // Still matches the rule on the bus, but fails the adapter's schema check: JSON drops the undefined time.
  putEvent("triaxis.callismatic", "lead.triaged.v1", leadEnvelope(id, marker, { time: undefined }));

  // Lambda retries twice, with backoff, before the failure destination.
  await expect.poll(() => {
    const response = JSON.parse(aws(
      regionOf(config.busArn), "sqs", "receive-message", "--queue-url", config.adapterFailureQueueUrl,
      "--max-number-of-messages", "10", "--wait-time-seconds", "10",
    ) || "{}") as { Messages?: { Body: string }[] };
    return (response.Messages ?? []).some((message) => message.Body.includes(id));
  }, { timeout: 6 * 60_000, intervals: [15_000] }).toBe(true);
  expect(await countTasksMentioning(page, marker)).toBe(0);
});
