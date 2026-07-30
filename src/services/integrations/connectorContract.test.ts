import { describe, expect, it } from "vitest";
import { buildConnectorOAuthUrl, getConnectorContract, previewSelectedEmailImport } from "./connectorContract";

describe("connector contract", () => {
  it("exposes reusable Gmail and Microsoft OAuth contracts", () => {
    expect(getConnectorContract("gmail")?.requiredScopes).toContain("https://www.googleapis.com/auth/gmail.readonly");
    expect(getConnectorContract("microsoft")?.requiredScopes).toContain("Mail.Read");
    expect(getConnectorContract("unknown")).toBeUndefined();
  });

  it("exposes Slack and Calendly OAuth contracts (Sprint 3 A13/A14)", () => {
    expect(getConnectorContract("slack")?.requiredScopes).toContain("chat:write");
    // Calendly's OAuth grants access to the whole scheduling account -- no discrete scopes exist.
    expect(getConnectorContract("calendly")?.requiredScopes).toEqual([]);
  });

  it("builds provider OAuth URLs only when credentials are configured", () => {
    const emptyEnv = { NODE_ENV: "test" } as unknown as NodeJS.ProcessEnv;
    expect(buildConnectorOAuthUrl("gmail", "state", emptyEnv)).toBeUndefined();
    const url = buildConnectorOAuthUrl("gmail", "state-123", {
      NODE_ENV: "test",
      GOOGLE_CLIENT_ID: "google-client",
      NEXT_PUBLIC_APP_URL: "https://app.axxess.local",
    } as unknown as NodeJS.ProcessEnv);
    expect(url).toContain("client_id=google-client");
    expect(url).toContain("state=state-123");
    // access_type/prompt are Google-specific OAuth extensions -- must not leak onto other providers.
    expect(url).toContain("access_type=offline");
  });

  it("builds Slack and Calendly OAuth URLs using their own client id env vars, without Google-only params", () => {
    const slackUrl = buildConnectorOAuthUrl("slack", "state-slack", {
      NODE_ENV: "test",
      SLACK_CLIENT_ID: "slack-client",
      NEXT_PUBLIC_APP_URL: "https://app.axxess.local",
    } as unknown as NodeJS.ProcessEnv);
    expect(slackUrl).toContain("client_id=slack-client");
    expect(slackUrl).toContain("scope=chat%3Awrite");
    expect(slackUrl).not.toContain("access_type");
    expect(slackUrl).not.toContain("prompt");

    const calendlyUrl = buildConnectorOAuthUrl("calendly", "state-calendly", {
      NODE_ENV: "test",
      CALENDLY_CLIENT_ID: "calendly-client",
      NEXT_PUBLIC_APP_URL: "https://app.axxess.local",
    } as unknown as NodeJS.ProcessEnv);
    expect(calendlyUrl).toContain("client_id=calendly-client");
    // No requiredScopes -- the scope param should be omitted entirely, not sent empty.
    expect(calendlyUrl).not.toContain("scope=");
  });

  it("exposes tenant-owned Google Calendar, Zoom, and Microsoft Teams meeting/scheduling contracts (Sprint SI-1)", () => {
    // 2026-07-29: each tenant links their own meeting/scheduling provider rather than a single
    // shared Calendly link. Google Calendar and Teams reuse the existing gmail/microsoft OAuth
    // endpoints and client credentials (one Google/Microsoft app can request multiple scopes);
    // Zoom is a brand-new provider with its own client credentials.
    expect(getConnectorContract("google_calendar")?.requiredScopes).toContain("https://www.googleapis.com/auth/calendar.events");
    expect(getConnectorContract("google_calendar")?.authorizationUrl).toBe(getConnectorContract("gmail")?.authorizationUrl);
    expect(getConnectorContract("zoom")?.requiredScopes).toContain("meeting:write");
    expect(getConnectorContract("teams")?.requiredScopes).toContain("OnlineMeetings.ReadWrite");
    expect(getConnectorContract("teams")?.authorizationUrl).toBe(getConnectorContract("microsoft")?.authorizationUrl);
    expect(getConnectorContract("google_drive")?.requiredScopes).toContain("https://www.googleapis.com/auth/drive.readonly");
    expect(getConnectorContract("google_drive")?.authorizationUrl).toBe(getConnectorContract("gmail")?.authorizationUrl);
  });

  it("builds a Google Calendar OAuth URL with the same offline/consent params as Gmail, and a standalone Zoom URL with its own client id", () => {
    const env = {
      NODE_ENV: "test",
      GOOGLE_CLIENT_ID: "google-client",
      ZOOM_CLIENT_ID: "zoom-client",
      NEXT_PUBLIC_APP_URL: "https://app.axxess.local",
    } as unknown as NodeJS.ProcessEnv;

    const calendarUrl = buildConnectorOAuthUrl("google_calendar", "state-cal", env);
    expect(calendarUrl).toContain("client_id=google-client");
    expect(calendarUrl).toContain("access_type=offline");
    expect(calendarUrl).toContain("redirect_uri=");
    expect(calendarUrl).toContain("provider%3Dgoogle_calendar");

    const zoomUrl = buildConnectorOAuthUrl("zoom", "state-zoom", env);
    expect(zoomUrl).toContain("client_id=zoom-client");
    expect(zoomUrl).not.toContain("access_type");
  });

  it("exposes the 2026-07-30 connector batch (Linear, GitHub, Google Sheets/Docs/Slides, WhatsApp Business, X)", () => {
    expect(getConnectorContract("linear")?.requiredScopes).toEqual(["read", "write"]);
    expect(getConnectorContract("github")?.requiredScopes).toContain("repo");
    // Full read-write scopes (not .readonly): editability, not just import -- founder requirement.
    expect(getConnectorContract("google_sheets")?.requiredScopes).toContain("https://www.googleapis.com/auth/spreadsheets");
    expect(getConnectorContract("google_sheets")?.authorizationUrl).toBe(getConnectorContract("gmail")?.authorizationUrl);
    expect(getConnectorContract("google_docs")?.requiredScopes).toContain("https://www.googleapis.com/auth/documents");
    expect(getConnectorContract("google_slides")?.requiredScopes).toContain("https://www.googleapis.com/auth/presentations");
    expect(getConnectorContract("whatsapp_business")?.requiredScopes).toContain("whatsapp_business_messaging");
    // X mandates PKCE for OAuth 2.0 user-context authorization, same branch as Airtable.
    expect(getConnectorContract("x_twitter")?.requiresPkce).toBe(true);
    expect(getConnectorContract("x_twitter")?.requiredScopes).toContain("tweet.write");
  });

  it("builds a GitHub OAuth URL and a PKCE-required X OAuth URL", () => {
    const env = {
      NODE_ENV: "test",
      GITHUB_CLIENT_ID: "github-client",
      X_CLIENT_ID: "x-client",
      NEXT_PUBLIC_APP_URL: "https://app.axxess.local",
    } as unknown as NodeJS.ProcessEnv;

    const githubUrl = buildConnectorOAuthUrl("github", "state-github", env);
    expect(githubUrl).toContain("client_id=github-client");
    expect(githubUrl).not.toContain("access_type");

    // X requires a code_challenge -- without one, buildConnectorOAuthUrl must return undefined
    // rather than send an invalid PKCE-less request, same as Airtable's existing behavior.
    expect(buildConnectorOAuthUrl("x_twitter", "state-x", env)).toBeUndefined();
    const xUrl = buildConnectorOAuthUrl("x_twitter", "state-x", env, { codeChallenge: "challenge-value" });
    expect(xUrl).toContain("client_id=x-client");
    expect(xUrl).toContain("code_challenge=challenge-value");
    expect(xUrl).toContain("code_challenge_method=S256");
  });

  it("previews selected emails before creating workspace records", () => {
    const preview = previewSelectedEmailImport({
      providerId: "gmail",
      from: "Dr. Purnima Bora <purnima@example.org>",
      subject: "Dibrugarh oxygen review approved",
      bodyText: "Please schedule the biomedical review. The Mission Secretariat approved the oxygen resilience budget. Share the vendor checklist with Dr. Purnima Bora.",
    });

    expect(preview.tasks.length).toBeGreaterThan(0);
    expect(preview.decisions.join(" ")).toMatch(/approved/i);
    expect(preview.stakeholders).toContain("Dr. Purnima Bora");
  });
});
