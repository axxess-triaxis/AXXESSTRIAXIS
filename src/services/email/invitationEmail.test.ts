import { afterEach, describe, expect, it, vi } from "vitest";
import type { Invitation } from "../../domain";
import type { UserContext } from "../../security/rbac";
import { buildInvitationAcceptUrl, renderInvitationEmail, sendInvitationEmail } from "./invitationEmail";

const invitation: Invitation = {
  id: "invitation_1",
  organizationId: "org_1",
  email: "pilot.lead@example.org",
  role: "Manager",
  invitedByUserId: "user_1",
  status: "pending",
  expiresAt: "2026-07-18T00:00:00.000Z",
  createdAt: "2026-07-11T00:00:00.000Z",
  updatedAt: "2026-07-11T00:00:00.000Z",
};

const invitedBy: UserContext = {
  id: "user_1",
  organizationId: "org_1",
  role: "Organization Admin",
  email: "admin@example.org",
  displayName: "Pilot Admin",
};

describe("invitation email", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.AXXESS_INVITATION_EMAIL_FROM;
  });

  it("builds an acceptance URL from the configured app URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.axxess.local";
    expect(buildInvitationAcceptUrl("token_123")).toBe("https://app.axxess.local/api/invitations/accept?token=token_123");
  });

  it("renders institutional invitation copy without exposing provider secrets", () => {
    const rendered = renderInvitationEmail({ invitation, invitationToken: "token_123", invitedBy });
    expect(rendered.subject).toBe("You have been invited to AXXESS");
    expect(rendered.text).toContain("Pilot Admin");
    expect(rendered.text).toContain("Manager");
    expect(rendered.html).toContain("Accept invitation");
    expect(rendered.html).not.toContain("RESEND_API_KEY");
  });

  it("returns a manual delivery URL when Resend is not configured", async () => {
    const result = await sendInvitationEmail({ invitation, invitationToken: "token_123", invitedBy });
    expect(result.status).toBe("not-configured");
    expect(result.provider).toBe("none");
    expect(result.invitationUrl).toContain("token=token_123");
  });

  it("sends through Resend when configured", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.AXXESS_INVITATION_EMAIL_FROM = "AXXESS <pilot@example.org>";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "email_123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendInvitationEmail({ invitation, invitationToken: "token_123", invitedBy });

    expect(result.status).toBe("sent");
    expect(fetchMock).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        Authorization: "Bearer re_test",
        "Idempotency-Key": "axxess-invitation-invitation_1",
      }),
    }));
  });
});
