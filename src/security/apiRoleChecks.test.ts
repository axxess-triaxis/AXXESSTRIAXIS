import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoleName } from "../domain";

// Regression test for audit findings L3, L6, L8, L9, L13 and L18: outside roles are shown "Access
// restricted" on a page, while the API behind it returns the data. Every cell of the approved table
// is listed here, so a change to who gets what has to change this file too.

const senior: RoleName[] = ["Super Admin", "Organization Admin", "Executive", "Manager"];
const outside: RoleName[] = ["Consultant", "Guest"];
const allRoles: RoleName[] = [...senior, "Employee", ...outside];

const state = {
  role: "Guest" as RoleName,
  listCrmLeadsArgs: [] as unknown[][],
  denied: [] as Array<Record<string, unknown>>,
};

vi.mock("../auth/serverSession", () => ({
  getServerAuthSession: async () => ({
    accessToken: "t",
    user: { id: "user-1", organizationId: "org-1", role: state.role },
  }),
}));

vi.mock("../services/audit/auditEvents", () => ({
  recordAuditBestEffort: async () => undefined,
  recordDeniedAttempt: async (_session: unknown, input: Record<string, unknown>) => {
    state.denied.push(input);
  },
  isDatabaseRefusal: () => false,
}));

vi.mock("../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: RoleName }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
  auditLogsRepository: { record: async () => ({ id: "audit-1" }) },
  listRepositoryResource: async () => [],
  createRepositoryResource: async () => ({ id: "row-1" }),
  updateRepositoryResource: async () => ({ id: "row-1" }),
  notificationsRepository: { create: async () => undefined },
  documentPermissionsRepository: {},
  documentsRepository: {},
  documentVersionsRepository: {},
  knowledgeArticlesRepository: {},
  tasksRepository: {},
}));

vi.mock("../repositories/crmRepository", () => ({
  listCrmLeads: async (...args: unknown[]) => {
    state.listCrmLeadsArgs.push(args);
    return [];
  },
  createCrmLead: async () => ({ id: "lead-1", stage: "new", status: "open", priority: "medium" }),
}));

vi.mock("../repositories/financialWatchRepository", () => ({
  listFinancialWatchItems: async () => [],
  createFinancialWatchItem: async () => ({ id: "item-1", category: "accounts_actionable", thresholdType: "above" }),
}));

vi.mock("../repositories/workflowActionRepositories", () => ({
  stakeholderNotesRepository: { list: async () => [], create: async () => ({ id: "note-1" }) },
}));

vi.mock("../services/workflows/liveTenantWorkflow", () => ({
  listWorkflowTimeline: async () => [],
  recordWorkflowTimelineEvent: async () => undefined,
  upsertWorkflowProgressRecords: async () => undefined,
}));

vi.mock("../services/rag/tenantRagWorkflow", () => ({ ingestTenantDocument: async () => undefined }));

vi.mock("../services/dashboard/dashboardSnapshotPeriods", () => ({
  buildSnapshotPeriod: async () => ({ period: "daily" }),
  earliestTenantActivityDate: async () => null,
}));

import { canReadAllLeads, canUseCapability, type ApiCapability } from "./rbac";
import { GET as getLeads, POST as postLead } from "../app/api/crm/leads/route";
import { GET as getWatch, POST as postWatch } from "../app/api/financial-watch/route";
import { GET as getNotes, POST as postNote } from "../app/api/stakeholders/notes/route";
import { GET as getTimeline } from "../app/api/workflows/timeline/route";
import { POST as importEmail } from "../app/api/connectors/email/import/route";
import { GET as getResource } from "../app/api/repositories/[resource]/route";
import { GET as getSnapshot } from "../app/api/dashboard/snapshot-periods/route";

function post(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body) });
}

const resourceContext = (resource: string) => ({ params: Promise.resolve({ resource }) });
const watchBody = { title: "T", category: "accounts_actionable", thresholdType: "above", thresholdAmount: 1 };

const allowedRoles: Record<ApiCapability, RoleName[]> = {
  "crm.read": [...senior, "Employee"],
  "crm.create": [...senior, "Employee"],
  "financial-watch": senior,
  stakeholders: [...senior, "Employee"],
  "email-import": [...senior, "Employee"],
  "workflow-timeline": [...senior, "Employee"],
  "tenant-activity": [...senior, "Employee"],
};

describe("canUseCapability", () => {
  for (const [capability, allowed] of Object.entries(allowedRoles) as Array<[ApiCapability, RoleName[]]>) {
    for (const role of allRoles) {
      it(`${role} ${allowed.includes(role) ? "may use" : "may not use"} ${capability}`, () => {
        expect(canUseCapability(role, capability)).toBe(allowed.includes(role));
      });
    }
  }

  it("lets only senior roles read every lead", () => {
    expect(allRoles.filter(canReadAllLeads)).toEqual(senior);
  });
});

describe("routes follow the table", () => {
  beforeEach(() => {
    state.listCrmLeadsArgs = [];
    state.denied = [];
  });

  afterEach(() => {
    state.role = "Guest";
  });

  const routes: Array<{ name: string; capability: ApiCapability; call: () => Promise<Response>; okStatus: number }> = [
    { name: "GET /api/crm/leads", capability: "crm.read", call: () => getLeads(), okStatus: 200 },
    { name: "POST /api/crm/leads", capability: "crm.create", call: () => postLead(post("/api/crm/leads", { title: "T" })), okStatus: 201 },
    { name: "GET /api/financial-watch", capability: "financial-watch", call: () => getWatch(), okStatus: 200 },
    { name: "POST /api/financial-watch", capability: "financial-watch", call: () => postWatch(post("/api/financial-watch", watchBody)), okStatus: 201 },
    { name: "GET /api/stakeholders/notes", capability: "stakeholders", call: () => getNotes(), okStatus: 200 },
    { name: "POST /api/stakeholders/notes", capability: "stakeholders", call: () => postNote(post("/api/stakeholders/notes", { title: "T", body: "B" })), okStatus: 201 },
    { name: "GET /api/workflows/timeline", capability: "workflow-timeline", call: () => getTimeline(new Request("http://localhost/api/workflows/timeline")), okStatus: 200 },
    { name: "GET /api/dashboard/snapshot-periods daily", capability: "tenant-activity", call: () => getSnapshot(new Request("http://localhost/api/dashboard/snapshot-periods?period=daily")), okStatus: 200 },
    { name: "GET /api/dashboard/snapshot-periods yoy", capability: "tenant-activity", call: () => getSnapshot(new Request("http://localhost/api/dashboard/snapshot-periods?period=yoy")), okStatus: 200 },
    { name: "GET /api/repositories/stakeholders", capability: "stakeholders", call: () => getResource(new Request("http://localhost/api/repositories/stakeholders"), resourceContext("stakeholders")), okStatus: 200 },
  ];

  for (const route of routes) {
    for (const role of allRoles) {
      const allowed = allowedRoles[route.capability].includes(role);
      it(`${route.name} as ${role} returns ${allowed ? route.okStatus : 403}`, async () => {
        state.role = role;
        const response = await route.call();
        expect(response.status).toBe(allowed ? route.okStatus : 403);
      });
    }
  }

  for (const role of outside) {
    it(`POST /api/connectors/email/import as ${role} returns 403`, async () => {
      state.role = role;
      const response = await importEmail(post("/api/connectors/email/import", { subject: "S", from: "a@example.invalid", bodyText: "B" }));
      expect(response.status).toBe(403);
    });
  }

  it("does not refuse an Employee on email import before validating the request", async () => {
    state.role = "Employee";
    const response = await importEmail(post("/api/connectors/email/import", {}));
    expect(response.status).toBe(400);
  });

  it("logs a refused write, but not a refused read", async () => {
    state.role = "Guest";
    await getLeads();
    expect(state.denied).toHaveLength(0);
    await postLead(post("/api/crm/leads", { title: "T" }));
    expect(state.denied).toEqual([expect.objectContaining({ route: "/api/crm/leads", method: "POST" })]);
  });

  it("limits an Employee to their own leads and no one else", async () => {
    state.role = "Employee";
    await getLeads();
    expect(state.listCrmLeadsArgs[0][1]).toEqual({ ownerUserId: "user-1" });
  });

  it("gives a Manager every lead", async () => {
    state.role = "Manager";
    await getLeads();
    expect(state.listCrmLeadsArgs[0][1]).toBeUndefined();
  });

  it("leaves other repository resources to RLS for outside roles", async () => {
    state.role = "Guest";
    const response = await getResource(new Request("http://localhost/api/repositories/tasks"), resourceContext("tasks"));
    expect(response.status).toBe(200);
  });
});
