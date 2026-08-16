import { describe, expect, it } from "vitest";
import type { RoleName } from "../domain";
import type { TenantScope } from "../repositories/interfaces";
import { synthesizeChatbotAgentScope } from "./chatbotAgentScope";

const baseScope: TenantScope = { organizationId: "org-1", userId: "user-1", role: "Employee" };

function capabilitiesFor(role: RoleName): string[] {
  return [...synthesizeChatbotAgentScope(baseScope, role).capabilities].sort();
}

describe("synthesizeChatbotAgentScope", () => {
  it("never persists to a real agent_connections row -- agentConnectionId is clearly synthetic", () => {
    const scope = synthesizeChatbotAgentScope(baseScope, "Employee");
    expect(scope.agentConnectionId).toBe("inapp:user-1");
    expect(scope.provider).toBe("axxess_copilot_inapp");
    expect(scope.organizationId).toBe("org-1");
    expect(scope.issuedByUserId).toBe("user-1");
    expect(scope.issuedByRole).toBe("Employee");
  });

  it("Super Admin gets every capability except query_external_model", () => {
    expect(capabilitiesFor("Super Admin")).toEqual([
      "add_stakeholder_note", "create_meeting", "create_project", "create_stakeholder", "create_task",
      "get_dashboard_snapshot", "list_documents", "list_meetings", "list_projects", "list_stakeholders",
      "list_tasks", "query_knowledge_hub", "search_audit_logs", "update_task_status",
    ].sort());
  });

  it("Organization Admin gets the same full set as Super Admin in this table", () => {
    expect(capabilitiesFor("Organization Admin")).toEqual(capabilitiesFor("Super Admin"));
  });

  it("Executive loses only search_audit_logs relative to Super Admin", () => {
    const caps = capabilitiesFor("Executive");
    expect(caps).not.toContain("search_audit_logs");
    expect(caps).toEqual(capabilitiesFor("Super Admin").filter((c) => c !== "search_audit_logs"));
  });

  it("Manager matches Executive's capability set exactly", () => {
    expect(capabilitiesFor("Manager")).toEqual(capabilitiesFor("Executive"));
  });

  it("Employee loses stakeholder tools and audit logs relative to Executive", () => {
    expect(capabilitiesFor("Employee")).toEqual([
      "create_meeting", "create_project", "create_task", "get_dashboard_snapshot", "list_documents",
      "list_meetings", "list_projects", "list_tasks", "query_knowledge_hub", "update_task_status",
    ].sort());
  });

  it("Consultant matches Employee's capability set exactly", () => {
    expect(capabilitiesFor("Consultant")).toEqual(capabilitiesFor("Employee"));
  });

  it("Guest is limited to read-only dashboard/knowledge/documents capabilities", () => {
    expect(capabilitiesFor("Guest")).toEqual(["get_dashboard_snapshot", "list_documents", "query_knowledge_hub"].sort());
  });

  it("never offers stakeholder tools to Employee, Consultant, or Guest -- must not silently gain capability", () => {
    for (const role of ["Employee", "Consultant", "Guest"] as RoleName[]) {
      const caps = capabilitiesFor(role);
      expect(caps).not.toContain("list_stakeholders");
      expect(caps).not.toContain("create_stakeholder");
      expect(caps).not.toContain("add_stakeholder_note");
    }
  });

  it("never offers search_audit_logs to any non-admin role", () => {
    for (const role of ["Executive", "Manager", "Employee", "Consultant", "Guest"] as RoleName[]) {
      expect(capabilitiesFor(role)).not.toContain("search_audit_logs");
    }
  });

  it("never offers query_external_model to any role, including Super Admin", () => {
    for (const role of ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee", "Consultant", "Guest"] as RoleName[]) {
      expect(capabilitiesFor(role)).not.toContain("query_external_model");
    }
  });
});
