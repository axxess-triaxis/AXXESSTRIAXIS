import { describe, expect, it } from "vitest";
import { buildConnectorOAuthUrl, getConnectorContract, previewSelectedEmailImport } from "./connectorContract";

describe("connector contract", () => {
  it("exposes reusable Gmail and Microsoft OAuth contracts", () => {
    expect(getConnectorContract("gmail")?.requiredScopes).toContain("https://www.googleapis.com/auth/gmail.readonly");
    expect(getConnectorContract("microsoft")?.requiredScopes).toContain("Mail.Read");
    expect(getConnectorContract("unknown")).toBeUndefined();
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
