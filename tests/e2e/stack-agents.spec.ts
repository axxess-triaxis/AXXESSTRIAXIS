import { expect, test } from "@playwright/test";
import { loginAs, seededUsers, skipUnlessSeeded } from "./helpers";

// Customer-fireable stack, PR 5 (2026-11-20). Needs migrations 20261120120000_stack_org_routing.sql and
// 20261120140000_org_agent_settings_details.sql on the seeded database.
//
// An organization admin sees the Agents card and what each agent still needs, and cannot link its
// own caller ID or record its own registrations. A manager cannot change agent settings. Nobody in a
// seeded customer organization can use Triaxis's operator routes. The spec changes no settings, so
// nothing is left on for the shared seeded organization.
test.describe("stack agents", () => {
  test.beforeEach(() => {
    skipUnlessSeeded();
  });

  test("an organization admin sees the Agents card and cannot self-declare a registration", async ({ page }) => {
    await loginAs(page, seededUsers.orgAdminAlpha);
    await page.goto("/integrations");
    const card = page.getByTestId("agents-card");
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect(card.getByText(/Call with agent:/)).toBeVisible();
    await expect(card.getByText(/Registrations recorded: India DLT/)).toBeVisible();
    await expect(page.getByTestId("agents-operator-panel")).toHaveCount(0);

    const settings = await page.request.get("/api/stack/agent-settings");
    expect(settings.ok()).toBe(true);
    const body = await settings.json() as { operator: boolean; readiness: { call: string[] } };
    expect(body.operator).toBe(false);
    expect(Array.isArray(body.readiness.call)).toBe(true);

    for (const data of [{ dltIndiaRegistered: true }, { callerIdE164: "+919800000001" }]) {
      expect((await page.request.patch("/api/stack/agent-settings", { data })).status()).toBe(403);
    }
    expect((await page.request.get("/api/stack/organizations")).status()).toBe(403);
    expect((await page.request.patch(`/api/stack/agent-settings/${"0".repeat(8)}-0000-4000-8000-${"0".repeat(12)}`, { data: { dltIndiaRegistered: true } })).status()).toBe(403);
  });

  test("a manager cannot read or change agent settings and gets no Agents card", async ({ page }) => {
    await loginAs(page, seededUsers.managerAlpha);
    expect((await page.request.get("/api/stack/agent-settings")).status()).toBe(403);
    expect((await page.request.patch("/api/stack/agent-settings", { data: { callismaticEnabled: true } })).status()).toBe(403);
    await page.goto("/integrations");
    await expect(page.getByRole("heading", { name: "Integrations" }).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("agents-card")).toHaveCount(0);
  });

  test("Message with agent explains what is not set up, and messages nobody", async ({ page }) => {
    await loginAs(page, seededUsers.managerAlpha);
    const leads = await page.request.get("/api/crm/leads");
    expect(leads.ok()).toBe(true);
    const [lead] = (await leads.json() as { leads: Array<{ id: string }> }).leads;
    test.skip(!lead, "The seeded organization has no lead to open.");
    const res = await page.request.post(`/api/crm/leads/${lead.id}/agent-messages`, { data: { channel: "sms" } });
    expect(res.status()).toBe(409);
    const body = await res.json() as { setup?: string[]; reasons?: string[] };
    expect(body.setup ?? body.reasons).toBeTruthy();
  });
});
