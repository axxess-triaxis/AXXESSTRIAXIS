import { describe, expect, it } from "vitest";
import { runOutreachTick, type OutreachTickDeps } from "./outreachTick";

const NOW = new Date("2026-11-12T06:00:00Z");
const SECRET = "unsubscribe-secret-for-tests-0123456789";

function deps(overrides: Partial<OutreachTickDeps> = {}) {
  const log = { attempts: [] as unknown[], updates: [] as unknown[], sent: [] as unknown[] };
  const base: OutreachTickDeps = {
    loadState: async () => ({
      enrollments: [{ id: "e1", leadId: "l1", sequenceId: "s1", stepIndex: 0, nextSendAt: new Date(NOW.getTime() - 1), status: "active" }],
      leads: new Map([["l1", {
        id: "l1", country: "IN", consentBasis: "b2b_legitimate_interest", contactEmail: "ravi@acme.in",
        contactName: "Ravi Kumar", organizationName: "Acme", status: "open", registryStatus: "unchecked", registryCheckedAt: null,
      }]]),
      sequences: new Map([["s1", { id: "s1", steps: [{ dayOffset: 0, subject: "Hi {{first_name}}", body: "Hello {{company}}" }, { dayOffset: 3, subject: "Re", body: "Again" }] }]]),
      suppressed: new Set<string>(),
      attemptsByLead: new Map(),
      sentToday: 0,
    }),
    sendEmail: async (email) => { log.sent.push(email); return { id: "msg-1" }; },
    recordAttempt: async (a) => { log.attempts.push(a); },
    updateEnrollment: async (id, patch) => { log.updates.push({ id, ...patch }); },
    config: {
      organizationId: "org-1",
      from: "Asha <asha@go.example.com>",
      sender: { name: "Asha Rao", company: "Triaxis Ventures Private Limited", postalAddress: "Guwahati, India" },
      appUrl: "https://app.example.com",
      unsubscribeSecret: SECRET,
      dailySendBudget: 20,
    },
    now: () => NOW,
    ...overrides,
  };
  return { deps: base, log };
}

describe("runOutreachTick", () => {
  it("sends a due step, logs the allowed attempt with the message id, and schedules the next step", async () => {
    const { deps: d, log } = deps();
    const summary = await runOutreachTick(d);
    expect(summary).toEqual({ sent: 1, stopped: 0, deferred: 0, failed: 0 });
    expect(log.sent).toHaveLength(1);
    const sent = log.sent[0] as { to: string; subject: string; text: string; headers: Record<string, string> };
    expect(sent.to).toBe("ravi@acme.in");
    expect(sent.subject).toBe("Hi Ravi");
    expect(sent.text).toContain("https://app.example.com/api/outreach/unsubscribe?token=");
    expect(sent.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(log.attempts).toEqual([{ organizationId: "org-1", leadId: "l1", enrollmentId: "e1", channel: "email", decision: "allowed", reasons: [], providerMessageId: "msg-1" }]);
    expect(log.updates).toEqual([{ id: "e1", stepIndex: 1, nextSendAt: new Date(NOW.getTime() + 3 * 86_400_000), status: "active", stopReasons: [] }]);
  });

  it("logs refusals and stops the enrollment without sending", async () => {
    const { deps: base } = deps();
    const state = await base.loadState("org-1", NOW);
    const { deps: d, log } = deps({ loadState: async () => ({ ...state, suppressed: new Set(["ravi@acme.in"]) }) });
    expect(await runOutreachTick(d)).toEqual({ sent: 0, stopped: 1, deferred: 0, failed: 0 });
    expect(log.sent).toEqual([]);
    expect(log.attempts).toEqual([{ organizationId: "org-1", leadId: "l1", enrollmentId: "e1", channel: "email", decision: "refused", reasons: ["suppressed"], providerMessageId: null }]);
    expect(log.updates).toEqual([{ id: "e1", status: "stopped", stopReasons: ["suppressed"], nextSendAt: null }]);
  });

  it("leaves the enrollment due when the provider fails, and does not log an allowed attempt", async () => {
    const { deps: d, log } = deps({ sendEmail: async () => { throw new Error("Resend 500"); } });
    expect(await runOutreachTick(d)).toEqual({ sent: 0, stopped: 0, deferred: 0, failed: 1 });
    expect(log.attempts).toEqual([]);
    expect(log.updates).toEqual([]);
  });

  it("stops an enrollment whose template cannot be filled", async () => {
    const { deps: base } = deps();
    const state = await base.loadState("org-1", NOW);
    const lead = { ...state.leads.get("l1")!, contactName: undefined };
    const { deps: d, log } = deps({ loadState: async () => ({ ...state, leads: new Map([["l1", lead]]) }) });
    expect(await runOutreachTick(d)).toEqual({ sent: 0, stopped: 1, deferred: 0, failed: 0 });
    expect(log.sent).toEqual([]);
    expect(log.updates).toEqual([{ id: "e1", status: "stopped", stopReasons: ["template_render_failed"], nextSendAt: null }]);
  });
});
