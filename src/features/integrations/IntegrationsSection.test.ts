import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/features/integrations/IntegrationsSection.tsx"), "utf8");

describe("IntegrationsSection (Sprint 3 -- does not hang, no raw backend error text)", () => {
  it("never throws the raw backend error/message string for any connector action", () => {
    expect(source).not.toContain("throw new Error(result.message ?? \"Microsoft mailbox listing failed.\")");
    expect(source).not.toContain("throw new Error(result.error ?? \"Email import failed.\")");
    expect(source).not.toContain("throw new Error(result.message ?? \"Notion page listing failed.\")");
    expect(source).not.toContain("throw new Error(result.error ?? \"Notion page preview failed.\")");
    expect(source).not.toContain("throw new Error(result.error ?? \"Notion page import failed.\")");
    expect(source).not.toContain("throw new Error(result.error ?? result.message ?? \"Saving credentials failed.\")");
  });

  it("maps unauthorized/forbidden connector failures to safe, specific copy and logs the raw detail", () => {
    expect(source).toContain("Sign in to list Microsoft mailbox messages.");
    expect(source).toContain("Sign in to import email.");
    expect(source).toContain("Sign in to list Notion pages.");
    expect(source).toContain("Sign in to preview this Notion page.");
    expect(source).toContain("Sign in to import this Notion page.");
    expect(source).toContain("Sign in to configure connector credentials.");
    expect(source).toContain("Your role does not have permission to configure connector credentials.");
    const consoleErrorCount = (source.match(/console\.error\(/g) ?? []).length;
    expect(consoleErrorCount).toBeGreaterThanOrEqual(6);
  });

  it("never exposes the raw credential-save error string, since this panel handles provider secrets", () => {
    const saveBlock = source.slice(source.indexOf("async function saveCredentials"), source.indexOf("async function revokeCredentials"));
    expect(saveBlock).not.toContain("throw new Error(result.error ?? result.message");
    expect(saveBlock).toContain("Saving connector credentials failed.");
  });

  it("gates the illustrative sample mailbox messages behind demo mode, not shown to real tenants (SA-2b, 2026-07-29)", () => {
    // A real tenant who connected a real Gmail/Microsoft account and hadn't loaded a real inbox
    // yet used to see the seeded NEMH sample messages (@nemh.example) as if they were their own --
    // indistinguishable, no "example" labeling. Same failure class as A-28/DEMO_DATA_LEAKAGE_AUDIT.md.
    const mailboxBlock = source.slice(source.indexOf("const mailboxMessages ="), source.indexOf("const mailboxMessages =") + 400);
    expect(mailboxBlock).toContain("isDemoModeEnabled()");
    expect(mailboxBlock).toContain("selectedMailboxMessages");
  });

  it("shows an honest empty state for a real tenant with no loaded mailbox messages", () => {
    expect(source).toContain("Connect Gmail or Microsoft above, then load your inbox to see real messages here.");
  });

  it("Agentic Infrastructure Phase 1 (2026-07-30): Agent Connections panel talks to the real /api/agents/connections endpoint, gated to admins", () => {
    expect(source).toContain("<AgentConnectionsPanel />");
    expect(source).toContain('fetch("/api/agents/connections"');
    expect(source).toContain('["Super Admin", "Organization Admin"].includes(session.user.role)');
    expect(source).toContain("shown once below and never stored");
  });

  it("uses real brand logos (simple-icons) on the pilot/infrastructure connector cards and agent connection rows, not text-only tiles (2026-07-30)", () => {
    expect(source).toContain('import { BrandIcon } from "../../components/ui/BrandIcon"');
    expect(source).toContain('import { brandIcons } from "../../components/ui/brandIcons"');
    expect(source).toContain("brandIcons[plugin.id]");
    expect(source).toContain("brandIcons[provider.providerId]");
    expect(source).toContain("brandIcons[connection.provider]");
  });

  it("Agentic Infrastructure Phase 2 (2026-07-30): Agent Connections panel surfaces and can revoke Always Allow grants, and is honest that critical actions need approval", () => {
    expect(source).toContain('fetch(`/api/agents/connections/${connectionId}/grants`');
    expect(source).toContain("Always-allowed tools");
    expect(source).toContain("need your approval the first time");
    expect(source).toContain("void revokeToolGrant(connection.id, grant.id)");
  });

  it("A-97 (2026-08-06): reads the OAuth callback's provider/status/reason query params and surfaces a real toast instead of leaving the page looking unchanged after a successful connect", () => {
    expect(source).toContain("window.location.search");
    expect(source).toContain('status === "connected"');
    expect(source).toContain('status === "not_configured"');
    expect(source).toContain("window.history.replaceState(null, \"\", window.location.pathname)");
  });

  it("A-97 (2026-08-06): fetches real per-provider connected state from /api/connectors/status and shows a Connected badge instead of relying on a side effect like 'Load Microsoft inbox' succeeding", () => {
    expect(source).toContain('fetch("/api/connectors/status?provider=gmail&provider=microsoft&provider=notion"');
    expect(source).toContain("function ConnectedBadge(");
    expect(source).toContain('"gmail" in connectedProviders ? <ConnectedBadge connectedAt={connectedProviders.gmail} /> : null');
    expect(source).toContain('"microsoft" in connectedProviders ? <ConnectedBadge connectedAt={connectedProviders.microsoft} /> : null');
    expect(source).toContain('"notion" in connectedProviders ? <ConnectedBadge connectedAt={connectedProviders.notion} /> : null');
  });

  it("A-98 (2026-08-06): the Pilot Integrations and Enterprise Data & Billing catalogue grids show just icon and name -- no status badge, category label, or self-description text", () => {
    expect(source).not.toContain('{plugin.configured ? "configured" : "gated"}');
    expect(source).not.toContain("{plugin.useCases.join(\" - \")}");
    expect(source).not.toContain("{plugin.category}");
    expect(source).not.toContain('status === "configured" ? "configured" : status === "revoked" ? "revoked" : "not configured"');
    expect(source).not.toContain("{provider.purpose}</p>");
    expect(source).not.toContain("{provider.category}");
  });
});
