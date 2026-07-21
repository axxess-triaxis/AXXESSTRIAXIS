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
