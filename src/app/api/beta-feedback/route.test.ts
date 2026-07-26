import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const routeSource = readFileSync(join(process.cwd(), "src", "app", "api", "beta-feedback", "route.ts"), "utf8");

describe("beta feedback API privacy and validation", () => {
  it("validates feedback type, module, rating, and message", () => {
    expect(routeSource).toContain("Feedback type is required.");
    expect(routeSource).toContain("Module is required.");
    expect(routeSource).toContain("Rating must be between 1 and 5.");
    expect(routeSource).toContain("Feedback message is required.");
  });

  it("does not write feedback message into audit metadata", () => {
    const metadataBlock = routeSource.slice(routeSource.indexOf("metadata: {"), routeSource.indexOf("}).catch"));
    expect(metadataBlock).not.toContain("message");
    expect(metadataBlock).toContain("feedback_type");
    expect(metadataBlock).toContain("rating");
  });

  // RAG Remediation Sprint 3 (A-65): founder's own requirement -- feedback should route toward
  // triaxisgrp@gmail.com. Full behavioral coverage (sent/not-configured/failed states) lives in
  // feedbackEmail.test.ts; this confirms the route actually wires the send attempt and records its
  // outcome in the audit trail rather than silently ignoring delivery.
  it("attempts email delivery and records the delivery outcome in audit metadata", () => {
    expect(routeSource).toContain("sendFeedbackNotificationEmail");
    const metadataBlock = routeSource.slice(routeSource.indexOf("metadata: {"), routeSource.indexOf("}).catch"));
    expect(metadataBlock).toContain("email_delivery_status");
  });

  it("does not let an email-send exception fail the feedback submission itself", () => {
    expect(routeSource).toContain("try {");
    expect(routeSource).toContain("emailDelivery = await sendFeedbackNotificationEmail");
    expect(routeSource).toContain("} catch (error) {");
  });
});
