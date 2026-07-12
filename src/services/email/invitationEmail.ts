import type { Invitation } from "../../domain";
import type { UserContext } from "../../security/rbac";

export type InvitationEmailDelivery =
  | { status: "not-configured"; provider: "none"; invitationUrl: string }
  | { status: "sent"; provider: "resend"; providerMessageId?: string; invitationUrl: string }
  | { status: "failed"; provider: "resend"; error: string; invitationUrl: string };

type InvitationEmailInput = {
  invitation: Invitation;
  invitationToken: string;
  invitedBy: UserContext;
};

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function getInvitationEmailFrom() {
  return process.env.AXXESS_INVITATION_EMAIL_FROM || "AXXESS by Triaxis <onboarding@resend.dev>";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildInvitationAcceptUrl(invitationToken: string) {
  const url = new URL("/api/invitations/accept", getAppUrl());
  url.searchParams.set("token", invitationToken);
  return url.toString();
}

export function renderInvitationEmail(input: InvitationEmailInput) {
  const invitationUrl = buildInvitationAcceptUrl(input.invitationToken);
  const invitedByName = input.invitedBy.displayName || input.invitedBy.email || "your AXXESS administrator";
  const expiresOn = input.invitation.expiresAt.slice(0, 10);
  const safeInvitedByName = escapeHtml(invitedByName);
  const safeRole = escapeHtml(input.invitation.role);
  const safeInvitationUrl = escapeHtml(invitationUrl);
  const subject = "You have been invited to AXXESS";
  const text = [
    `You have been invited to AXXESS by ${invitedByName}.`,
    `Role: ${input.invitation.role}`,
    `This invitation expires on ${expiresOn}.`,
    `Accept invitation: ${invitationUrl}`,
  ].join("\n\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0F1117">
      <p style="font-size:13px;color:#8B1E2D;font-weight:700;text-transform:uppercase;letter-spacing:.06em">AXXESS Invitation</p>
      <h1 style="font-size:22px;margin:0 0 12px">You have been invited to AXXESS</h1>
      <p>${safeInvitedByName} invited you to join their AXXESS workspace as <strong>${safeRole}</strong>.</p>
      <p>This invitation expires on <strong>${expiresOn}</strong>.</p>
      <p><a href="${safeInvitationUrl}" style="display:inline-block;background:#8B1E2D;color:white;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:700">Accept invitation</a></p>
      <p style="font-size:12px;color:#5F6B73">If you were not expecting this invitation, you can ignore this email.</p>
    </div>
  `.trim();

  return { subject, text, html, invitationUrl };
}

export async function sendInvitationEmail(input: InvitationEmailInput): Promise<InvitationEmailDelivery> {
  const rendered = renderInvitationEmail(input);
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { status: "not-configured", provider: "none", invitationUrl: rendered.invitationUrl };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `axxess-invitation-${input.invitation.id}`,
    },
    body: JSON.stringify({
      from: getInvitationEmailFrom(),
      to: input.invitation.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      reply_to: process.env.AXXESS_INVITATION_EMAIL_REPLY_TO || undefined,
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({})) as { id?: string; message?: string; error?: string };
  if (!response.ok) {
    return {
      status: "failed",
      provider: "resend",
      error: payload.message ?? payload.error ?? `Resend request failed with ${response.status}`,
      invitationUrl: rendered.invitationUrl,
    };
  }

  return { status: "sent", provider: "resend", providerMessageId: payload.id, invitationUrl: rendered.invitationUrl };
}
