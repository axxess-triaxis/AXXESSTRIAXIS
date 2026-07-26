import { afterEach, describe, expect, it, vi } from "vitest";
import type { BetaFeedback } from "../../domain";
import { renderFeedbackNotificationEmail, sendFeedbackNotificationEmail } from "./feedbackEmail";

const feedback: BetaFeedback = {
  id: "feedback_1",
  organizationId: "org_1",
  userId: "user_1",
  feedbackType: "Bug",
  module: "Dashboard",
  rating: 2,
  message: "The refresh button did not update the numbers.",
  permissionToContact: true,
  status: "new",
  metadata: { route: "/dashboard" },
  createdAt: "2026-07-26T00:00:00.000Z",
};

// RAG Remediation Sprint 3 (A-65): founder's own requirement -- "'Send Feedback' anywhere should
// lead to a form, the responses of which flow to triaxisgrp@gmail.com." Mirrors
// invitationEmail.test.ts's exact pattern since this module mirrors that one's implementation.
describe("feedback notification email", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
    delete process.env.AXXESS_FEEDBACK_NOTIFICATION_EMAIL_TO;
    delete process.env.AXXESS_FEEDBACK_EMAIL_FROM;
  });

  it("routes to triaxisgrp@gmail.com by default", () => {
    const rendered = renderFeedbackNotificationEmail({ feedback, organizationId: "org_1", userId: "user_1", route: "/dashboard" });
    expect(rendered.to).toBe("triaxisgrp@gmail.com");
  });

  it("allows the recipient to be overridden by configuration without code changes", () => {
    process.env.AXXESS_FEEDBACK_NOTIFICATION_EMAIL_TO = "ops@triaxis.ventures";
    const rendered = renderFeedbackNotificationEmail({ feedback, organizationId: "org_1", userId: "user_1" });
    expect(rendered.to).toBe("ops@triaxis.ventures");
  });

  it("renders the real feedback message and context, not a placeholder", () => {
    const rendered = renderFeedbackNotificationEmail({ feedback, organizationId: "org_1", userId: "user_1", route: "/dashboard" });
    expect(rendered.subject).toContain("Bug");
    expect(rendered.subject).toContain("Dashboard");
    expect(rendered.text).toContain("The refresh button did not update the numbers.");
    expect(rendered.text).toContain("org_1");
    expect(rendered.text).toContain("/dashboard");
    expect(rendered.html).not.toContain("RESEND_API_KEY");
  });

  it("returns an honest not-configured status when RESEND_API_KEY is absent -- feedback is never silently dropped by this path", async () => {
    const result = await sendFeedbackNotificationEmail({ feedback, organizationId: "org_1", userId: "user_1" });
    expect(result.status).toBe("not-configured");
    expect(result.provider).toBe("none");
  });

  it("sends through Resend to triaxisgrp@gmail.com when configured", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "email_123" }) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendFeedbackNotificationEmail({ feedback, organizationId: "org_1", userId: "user_1", route: "/dashboard" });

    expect(result.status).toBe("sent");
    expect(fetchMock).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer re_test" }),
    }));
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const sentBody = JSON.parse(String(requestInit.body)) as { to: string };
    expect(sentBody.to).toBe("triaxisgrp@gmail.com");
  });

  it("reports a failed status with the provider's error message when Resend rejects the request", async () => {
    process.env.RESEND_API_KEY = "re_test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({ message: "Invalid recipient" }) }));

    const result = await sendFeedbackNotificationEmail({ feedback, organizationId: "org_1", userId: "user_1" });

    expect(result.status).toBe("failed");
    if (result.status === "failed") expect(result.error).toBe("Invalid recipient");
  });
});
