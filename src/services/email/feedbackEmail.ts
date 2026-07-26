import type { BetaFeedback } from "../../domain";

// RAG Remediation Sprint 3 (A-65): founder's own requirement -- "'Send Feedback' anywhere should
// lead to a form, the responses of which flow to triaxisgrp@gmail.com." Feedback was already
// reliably persisted (beta_feedback table, POST /api/beta-feedback) with user/tenant/route/message/
// timestamp; the one missing piece was any attempt at email delivery. This mirrors
// src/services/email/invitationEmail.ts's exact pattern (same Resend provider, same honest
// "not-configured" state when RESEND_API_KEY is absent) rather than inventing a new email path.

export type FeedbackEmailDelivery =
  | { status: "not-configured"; provider: "none" }
  | { status: "sent"; provider: "resend"; providerMessageId?: string }
  | { status: "failed"; provider: "resend"; error: string };

function getFeedbackNotificationRecipient() {
  return process.env.AXXESS_FEEDBACK_NOTIFICATION_EMAIL_TO || "triaxisgrp@gmail.com";
}

function getFeedbackEmailFrom() {
  return process.env.AXXESS_FEEDBACK_EMAIL_FROM || process.env.AXXESS_INVITATION_EMAIL_FROM || "AXXESS by Triaxis <onboarding@resend.dev>";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderFeedbackNotificationEmail(input: { feedback: BetaFeedback; organizationId: string; userId: string; route?: string }) {
  const subject = `[AXXESS Beta Feedback] ${input.feedback.feedbackType} - ${input.feedback.module}`;
  const text = [
    `Feedback type: ${input.feedback.feedbackType}`,
    `Module: ${input.feedback.module}`,
    `Rating: ${input.feedback.rating}/5`,
    `Organization: ${input.organizationId}`,
    `Submitted by user: ${input.userId}`,
    input.route ? `Route: ${input.route}` : undefined,
    `Permission to contact: ${input.feedback.permissionToContact ? "Yes" : "No"}`,
    "",
    input.feedback.message,
  ].filter(Boolean).join("\n");
  const safeMessage = escapeHtml(input.feedback.message).replace(/\n/g, "<br />");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0F1117">
      <p style="font-size:13px;color:#8B1E2D;font-weight:700;text-transform:uppercase;letter-spacing:.06em">AXXESS Beta Feedback</p>
      <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(input.feedback.feedbackType)} - ${escapeHtml(input.feedback.module)}</h1>
      <p><strong>Rating:</strong> ${input.feedback.rating}/5</p>
      <p><strong>Organization:</strong> ${escapeHtml(input.organizationId)}</p>
      <p><strong>Submitted by user:</strong> ${escapeHtml(input.userId)}</p>
      ${input.route ? `<p><strong>Route:</strong> ${escapeHtml(input.route)}</p>` : ""}
      <p><strong>Permission to contact:</strong> ${input.feedback.permissionToContact ? "Yes" : "No"}</p>
      <p style="margin-top:16px;padding:12px;background:#F8F9FA;border-radius:8px">${safeMessage}</p>
    </div>
  `.trim();

  return { subject, text, html, to: getFeedbackNotificationRecipient() };
}

export async function sendFeedbackNotificationEmail(input: { feedback: BetaFeedback; organizationId: string; userId: string; route?: string }): Promise<FeedbackEmailDelivery> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { status: "not-configured", provider: "none" };
  }

  const rendered = renderFeedbackNotificationEmail(input);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `axxess-feedback-${input.feedback.id}`,
    },
    body: JSON.stringify({
      from: getFeedbackEmailFrom(),
      to: rendered.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: [
        { name: "organization_id", value: input.organizationId },
        { name: "feedback_id", value: input.feedback.id },
      ],
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({})) as { id?: string; message?: string; error?: string };
  if (!response.ok) {
    return { status: "failed", provider: "resend", error: payload.message ?? payload.error ?? `Resend request failed with ${response.status}` };
  }

  return { status: "sent", provider: "resend", providerMessageId: payload.id };
}
