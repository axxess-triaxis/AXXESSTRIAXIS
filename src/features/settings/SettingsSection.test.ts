import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initialTabFromLocation } from "./SettingsSection";

const source = readFileSync(join(process.cwd(), "src/features/settings/SettingsSection.tsx"), "utf8");

function setLocationSearch(search: string) {
  window.history.pushState({}, "", `/settings${search}`);
}

describe("initialTabFromLocation (A-36/A-37 fix -- respects ?tab= intent instead of always defaulting to Security)", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/settings");
  });

  it("defaults to security when no tab is requested", () => {
    setLocationSearch("");
    expect(initialTabFromLocation()).toBe("security");
  });

  it("honors ?tab=users (the real Invite Pilot Team / role-change destination)", () => {
    setLocationSearch("?tab=users");
    expect(initialTabFromLocation()).toBe("users");
  });

  it("honors ?tab=permissions", () => {
    setLocationSearch("?tab=permissions");
    expect(initialTabFromLocation()).toBe("permissions");
  });

  it("falls back to security for an unrecognized tab value rather than rendering nothing", () => {
    setLocationSearch("?tab=not-a-real-tab");
    expect(initialTabFromLocation()).toBe("security");
  });
});

describe("SettingsSection (Sprint 3 -- audited, does not hang)", () => {
  it("does not gate its main render behind an unresolved loading flag", () => {
    // Settings renders its form/user-admin state unconditionally and populates it asynchronously --
    // there is no `if (loading) return <LoadingState .../>` style gate that could get stuck. If a
    // future change introduces one, it must also guarantee a terminal (timeout/error) fallback.
    expect(source).not.toMatch(/if \(loading\) return/);
    expect(source).not.toMatch(/state\.loading \? <LoadingState/);
  });

  it("shows a user-facing error toast rather than hanging when user-admin data fails to load", () => {
    const loadUsersBlock = source.slice(source.indexOf("const loadUsers"), source.indexOf("const loadUsers") + 700);
    expect(loadUsersBlock).toContain("catch {");
    expect(loadUsersBlock).toContain("Unable to load user administration data.");
  });
});

describe("inviteUser (A-08/A-65 fix -- 'Send Invite' must actually send the invite email)", () => {
  // invitationsRepository.create() is a raw Supabase write with no email step; only
  // POST /api/invitations calls sendInvitationEmail(). Before this fix, inviteUser() called the
  // repository directly and only fell back to the route if that direct write *threw* -- meaning a
  // normal, successful invite never sent an email. This locks in that the route is now the one
  // and only path, not a catch-block fallback.
  const inviteBlock = source.slice(source.indexOf("const inviteUser ="), source.indexOf("const revokeInvitation ="));

  it("calls POST /api/invitations as the primary path", () => {
    expect(inviteBlock).toContain('fetch("/api/invitations"');
    expect(inviteBlock).toContain('method: "POST"');
  });

  it("does not write directly to invitationsRepository.create, bypassing email delivery", () => {
    expect(inviteBlock).not.toContain("invitationsRepository.create");
  });

  it("surfaces the real email-delivery outcome to the admin instead of a blanket 'created' toast", () => {
    expect(inviteBlock).toContain("emailDelivery");
    expect(inviteBlock).toContain("not-configured");
  });
});

describe("Integrations quick-connect (outlook -> microsoft OAuth provider id, live-confirmed 2026-07-31)", () => {
  // Real bug: pluginRegistry.ts's catalogue id for the Microsoft Outlook tile is "outlook" (a
  // display-only id), but connectorContract.ts's real OAuth provider id for it is "microsoft"
  // (one Entra app registration backs Outlook + Teams). The "Connect Microsoft Outlook" button
  // built its link straight from the catalogue id, so GET /api/connectors/oauth/start?provider=
  // outlook always 400'd ("Unsupported connector provider.") -- confirmed via live production
  // logs, not assumed.
  it("maps the display-only 'outlook' catalogue id to the real 'microsoft' OAuth provider id", () => {
    expect(source).toContain('CONNECTOR_OAUTH_PROVIDER_ID: Record<string, string> = { outlook: "microsoft" }');
  });

  it("builds the connect link through the mapping, not the raw catalogue id", () => {
    expect(source).toContain("href={`/api/connectors/oauth/start?provider=${CONNECTOR_OAUTH_PROVIDER_ID[plugin.id] ?? plugin.id}`}");
    expect(source).not.toContain("href={`/api/connectors/oauth/start?provider=${plugin.id}`}");
  });
});
