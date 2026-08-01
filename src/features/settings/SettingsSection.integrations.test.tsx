import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsSection } from "./SettingsSection";
import { getProductivityPluginRegistry } from "../../services/integrations/pluginRegistry";

// 2026-07-30: founder flagged the Settings > Integrations tab as "looking patchy" -- Gmail/Outlook
// were entirely absent from this tab (only shown on the separate /integrations page), and
// catalogue-only providers (Jira, Trello, Asana, Salesforce, Zoho, DocuSign, Razorpay) never
// appeared anywhere in Settings at all. Now the full registry renders here, each tile honestly
// labeled per its real state, so nothing is silently missing.
vi.mock("../../auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: { id: "user-1", organizationId: "org-1", role: "Organization Admin" }, status: "authenticated" } }),
}));

vi.mock("../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
}));

vi.mock("../../providers/serviceProvider", () => ({
  applicationServices: {
    organizationsRepository: { getById: async () => undefined },
    projectsRepository: { list: async () => [] },
    documentsRepository: { list: async () => [] },
  },
}));

function setIntegrationsTab() {
  window.history.pushState({}, "", "/settings?tab=integrations");
}

describe("Settings Integrations tab -- full catalogue, real logos (2026-07-30)", () => {
  it("renders a tile for every registered plugin, including Gmail/Outlook which used to be entirely absent", () => {
    setIntegrationsTab();
    render(<SettingsSection />);

    const allPlugins = getProductivityPluginRegistry();
    for (const plugin of allPlugins) {
      expect(screen.getByText(plugin.name)).toBeInTheDocument();
    }
    expect(allPlugins.length).toBeGreaterThanOrEqual(25);
  });

  it("labels catalogue-only (not pilot-enabled) providers honestly, with no working Connect link", () => {
    setIntegrationsTab();
    render(<SettingsSection />);

    expect(screen.getAllByText("catalogued -- not yet available").length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Connect Jira" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Connect Salesforce" })).not.toBeInTheDocument();
    expect(screen.getByText(/No connect flow ships yet for Jira/)).toBeInTheDocument();
  });

  it("gives a real Connect link for pilot-enabled providers, including Gmail (previously excluded)", () => {
    setIntegrationsTab();
    render(<SettingsSection />);

    const gmailLink = screen.getByRole("link", { name: "Connect Gmail" });
    expect(gmailLink).toHaveAttribute("href", "/api/connectors/oauth/start?provider=gmail");
  });

  it("renders a real brand-mark <svg> (not the generic placeholder icon) for providers simple-icons covers, e.g. Notion", () => {
    setIntegrationsTab();
    render(<SettingsSection />);

    const notionCard = screen.getByText("Notion").closest("div.mb-3");
    expect(notionCard?.querySelector("svg[aria-label='Notion logo']")).toBeTruthy();
  });
});
