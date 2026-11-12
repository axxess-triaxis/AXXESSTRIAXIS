// Handles one email.received event (GTM plan 2026-11-11, Day 3 item 1): fetch the body, match the
// sender to a lead, sort the reply, apply the actions, store it, and forward a copy to a person.
// Storing comes before any lead change, so a retried webhook finds the row and does nothing twice.
import {
  createOwnerTask, findLeadByEmail, insertReply, recordSystemAudit, replyAlreadyStored, stopActiveEnrollments, updateLeadFromReply,
} from "../../repositories/replyRepository";
import { addSuppression } from "../../repositories/outboundRepository";
import { emailAddress, fetchReceivedEmail, forwardViaResend, htmlToText } from "../email/resendInbound";
import { classifyReply } from "./replyClassifier";
import { actionsForCategory, type ReplyCategory } from "./replySorting";

const BODY_LIMIT = 20_000;
const DAY = 86_400_000;

export const CATEGORY_LABELS: Record<ReplyCategory, string> = {
  interested: "Interested", not_now: "Not now", unsubscribe: "Unsubscribe", out_of_office: "Out of office", other: "Needs reading",
};

export type ReplyIntakeConfig = {
  organizationId: string; resendApiKey: string; replyTo: string; forwardTo: string | null; forwardFrom: string;
};

export type ReplyEvent = { emailId: string; to: string[] };

export function parseReceivedEvent(payload: unknown): ReplyEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const { type, data } = payload as { type?: unknown; data?: { email_id?: unknown; to?: unknown } };
  if (type !== "email.received" || !data || typeof data.email_id !== "string") return null;
  const to = Array.isArray(data.to) ? data.to.map(String) : typeof data.to === "string" ? [data.to] : [];
  return { emailId: data.email_id, to };
}

export type IntakeResult =
  | { status: "ignored"; reason: "not_reply_address" | "duplicate" | "no_sender" }
  | { status: "stored"; category: ReplyCategory; leadId: string | null; forwarded: boolean };

export async function handleInboundReply(event: ReplyEvent, config: ReplyIntakeConfig, now = new Date()): Promise<IntakeResult> {
  const replyAddress = config.replyTo.toLowerCase();
  if (!event.to.some((to) => emailAddress(to) === replyAddress)) return { status: "ignored", reason: "not_reply_address" };
  if (await replyAlreadyStored(config.organizationId, event.emailId)) return { status: "ignored", reason: "duplicate" };

  const email = await fetchReceivedEmail(config.resendApiKey, event.emailId);
  const fromEmail = emailAddress(email.from);
  if (!fromEmail) return { status: "ignored", reason: "no_sender" };

  const fullText = email.text || htmlToText(email.html);
  const bodyText = fullText.slice(0, BODY_LIMIT);
  const lead = await findLeadByEmail(config.organizationId, fromEmail);
  const { category, classifiedBy } = await classifyReply({ subject: email.subject, text: fullText, headers: email.headers });

  const stored = await insertReply({
    organizationId: config.organizationId, leadId: lead?.id ?? null, providerEmailId: event.emailId, fromEmail,
    subject: email.subject.slice(0, 998), bodyText, bodyTruncated: fullText.length > BODY_LIMIT, category, classifiedBy,
  });
  if (!stored) return { status: "ignored", reason: "duplicate" };

  const actions = actionsForCategory(category);
  const applied: string[] = [];
  if (actions.suppressEmail) {
    await addSuppression({ organizationId: config.organizationId, identifier: fromEmail, channel: "email", reason: "unsubscribe" });
    applied.push("suppressed_email");
  }
  if (lead) {
    if (actions.stopSequence) {
      const stopped = await stopActiveEnrollments(config.organizationId, lead.id, `reply_${category}`);
      if (stopped) applied.push(`stopped_${stopped}_enrollments`);
    }
    const patch: { stage?: string; status?: string; nextFollowUpAt?: string } = {};
    if (actions.moveNewToQualifying && lead.stage === "new") patch.stage = "qualifying";
    if (actions.markLost) patch.status = "lost";
    if (actions.followUpInDays !== null) patch.nextFollowUpAt = new Date(now.getTime() + actions.followUpInDays * DAY).toISOString();
    if (Object.keys(patch).length > 0) {
      await updateLeadFromReply(config.organizationId, lead.id, patch);
      await recordSystemAudit(config.organizationId, {
        action: "crm.lead.updated", resourceType: "crm_lead", resourceId: lead.id,
        metadata: { via: "reply", category, changed: Object.keys(patch), ...patch },
      });
    }
  }
  if (actions.ownerTask) {
    const task = {
      title: actions.ownerTask, description: `Reply from ${fromEmail}: ${email.subject}`.slice(0, 500),
      dueDate: new Date(now.getTime() + DAY).toISOString().slice(0, 10),
    };
    // The owner may have no profile row; then the task stays unassigned rather than failing the reply.
    await createOwnerTask(config.organizationId, { ...task, assigneeId: lead?.ownerUserId ?? null })
      .catch(() => createOwnerTask(config.organizationId, { ...task, assigneeId: null }));
    applied.push("task_created");
  }
  await recordSystemAudit(config.organizationId, {
    action: "outreach.reply.received", resourceType: "crm_lead", resourceId: lead?.id ?? null,
    metadata: { category, classifiedBy, matchedLead: Boolean(lead), applied },
  });

  let forwarded = false;
  if (config.forwardTo) {
    try {
      await forwardViaResend(config.resendApiKey, {
        from: config.forwardFrom, to: config.forwardTo, replyTo: fromEmail,
        subject: `[AXXESS: ${CATEGORY_LABELS[category]}] ${email.subject}`.slice(0, 998),
        text: [
          `From: ${email.from}`,
          `Sorted as: ${CATEGORY_LABELS[category]} (${classifiedBy})`,
          lead ? `Lead: ${lead.id}` : "Lead: no match in AXXESS",
          applied.length ? `Done: ${applied.join(", ")}` : "Done: nothing changed",
          "",
          fullText,
        ].join("\n"),
      }, `reply-forward-${event.emailId}`);
      forwarded = true;
    } catch (error) {
      console.error("[outreach] reply forward failed", { message: error instanceof Error ? error.message : "unknown" });
    }
  }
  return { status: "stored", category, leadId: lead?.id ?? null, forwarded };
}
