import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { loginAs, logout, seededUsers } from "../e2e/helpers";
import { loadStackConfig } from "./guard";
import { assertStagingSite, aws, bypassHeaders, countTasksMentioning, regionOf } from "./stackHelpers";
import { fictionalPhone, forgedConversationResult, leadImportCsv, loadTwoOrgConfig, whatsappInboundMessage } from "./twoOrg";

// Customer-fireable stack, PR 6 (2026-11-21). A customer organization ("org B", the seeded
// "Triaxis Enterprise Studio") fires an Omnidamus WhatsApp conversation with "Message with agent".
// The customer replies through the real WhatsApp inbound topic, the agent closes the conversation,
// STILL posts the result to AXXESS, and the task must appear in org B and nowhere else. Staging
// Omnidamus captures every outbound message, so nothing reaches a real person, and the lead's
// number is in the reserved 555-01xx range.
//
// One-time setup, by Triaxis's operator in the staging Agents card: org B has Omnidamus on, the
// WhatsApp line STACK_ORG_B_WHATSAPP_LINE (default +12025550190), a phone-number ID and a template.
loadStackConfig();
const twoOrg = loadTwoOrgConfig();
const runId = `stack-2org-${Date.now()}-${randomUUID().slice(0, 8)}`;
let jobId: string | undefined;

test.describe.configure({ mode: "serial" });
test.skip("skip" in twoOrg, "skip" in twoOrg ? twoOrg.skip : "");

test.beforeAll(async ({ request }) => {
  await assertStagingSite(request);
});

test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.getByRole("button", { name: "Got it" }), (button) => button.click());
  await page.context().request.get("/auth", { headers: bypassHeaders });
});

test("org B's Message with agent becomes a task in org B only", async ({ page }) => {
  if ("skip" in twoOrg) return;
  const marker = `${runId}-orgb`;
  const company = `Stack ${marker}`;
  await loginAs(page, twoOrg.orgBAdmin);

  // Leads from earlier runs stay in org B, and their numbers are refused. Only that refusal gets
  // another number: any other one fails at once.
  const tried: string[] = [twoOrg.orgBWhatsAppLine];
  let phone = "";
  let accepted = false;
  while (!accepted) {
    phone = fictionalPhone(tried);
    tried.push(phone);
    const imported = await page.request.post("/api/crm/leads/import", {
      data: { csv: leadImportCsv({ company, contactName: "Stack Test", email: `${marker}@example.com`, phone }) },
    });
    const importBody = await imported.json() as { imported?: number; rejected?: Array<{ reason?: string }>; error?: string };
    expect(imported.status(), JSON.stringify(importBody)).toBe(200);
    accepted = importBody.imported === 1;
    const repeated = importBody.rejected?.[0]?.reason === "already_a_lead" && tried.length <= 10;
    expect(accepted || repeated, JSON.stringify(importBody)).toBe(true);
  }

  const leads = await (await page.request.get("/api/crm/leads")).json() as { leads: Array<{ id: string; organizationName?: string; title: string }> };
  const lead = leads.leads.find((row) => row.organizationName === company || row.title.includes(marker));
  expect(lead, "the imported lead is listed for org B").toBeTruthy();

  const fired = await page.request.post(`/api/crm/leads/${lead!.id}/agent-messages`, { data: { channel: "whatsapp" } });
  const firedBody = await fired.json() as { jobId?: string; setup?: string[]; reasons?: string[]; error?: string };
  // A 409 here names what is missing: org B's one-time setup (setup[]) or the contactability gate (reasons[]).
  expect(fired.status(), JSON.stringify(firedBody)).toBe(202);
  jobId = firedBody.jobId;
  expect(jobId).toMatch(/^[0-9a-f-]{36}$/);
  test.info().annotations.push({ type: "job", description: jobId! });

  // The agent is a model: it closes when the customer says they are done and an email is known.
  // A reply it answers with a question gets one more closing reply, at most three in all.
  const taskMarker = `Agent message job ${jobId}`;
  const region = regionOf(twoOrg.whatsappTopicArn);
  let found = 0;
  for (let attempt = 1; attempt <= 3 && found === 0; attempt += 1) {
    aws(region, "sns", "publish", "--topic-arn", twoOrg.whatsappTopicArn, "--message", whatsappInboundMessage({
      line: twoOrg.orgBWhatsAppLine,
      from: phone,
      messageId: `${marker}-${attempt}`,
      text: `Thanks, that answers it. My email is ${marker}@example.com. That is everything I need, ` +
        `no further help needed. Reference ${marker}.`,
    }));
    const deadline = Date.now() + (attempt === 3 ? 3 : 2) * 60_000;
    while (Date.now() < deadline && found === 0) {
      found = await countTasksMentioning(page, taskMarker, { allowEmpty: true });
      if (found === 0) await page.waitForTimeout(15_000);
    }
  }
  expect(found, `exactly one task in org B mentions ${taskMarker}`).toBe(1);

  await logout(page);
  await loginAs(page, seededUsers.orgAdminAlpha);
  expect(await countTasksMentioning(page, taskMarker), "org alpha sees no task for org B's job").toBe(0);
  expect(await countTasksMentioning(page, marker), "org alpha sees no task for org B's lead").toBe(0);
});

test("a forged organization or an unknown job is refused by the results route", async ({ request }) => {
  if ("skip" in twoOrg) return;
  test.skip(!twoOrg.resultsSecret, "STACK_RESULTS_SECRET is not set");
  test.skip(!jobId, "the org B conversation did not produce a job");
  const post = (body: object, auth = true) => request.post("/api/stack/results", {
    headers: { ...bypassHeaders, ...(auth ? { authorization: `Bearer ${twoOrg.resultsSecret}` } : {}) },
    data: body,
  });

  // Sent only after org B's task exists, so even a wrongly accepted result could not add a second task.
  const mismatch = await post(forgedConversationResult(jobId!, twoOrg.alphaOrganizationId));
  expect(mismatch.status()).toBe(409);
  expect((await mismatch.json()).error).toBe("organization_mismatch");

  const unknown = await post(forgedConversationResult(randomUUID()));
  expect(unknown.status()).toBe(404);
  expect((await unknown.json()).error).toBe("unknown_job");

  expect((await post(forgedConversationResult(jobId!), false)).status()).toBe(401);
});
