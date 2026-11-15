// Hands an agent call job to Callismatic (agent call pipeline, 2026-11-13). Callismatic places the
// call through its provider registry and reports back through STILL (call.completed.v1 ->
// log_agent_call). CALLISMATIC_URL and CALLISMATIC_API_KEY are server-only environment variables;
// without them nothing is sent.

export type AgentCallRequest = {
  jobId: string;
  leadId: string;
  organizationId: string;
  phoneE164: string;
  country: string;
  title: string;
  contactName?: string;
  company?: string;
};

export type StartAgentCallResult = { ok: true } | { ok: false; reason: string };

export function isCallismaticConfigured(): boolean {
  return Boolean(process.env.CALLISMATIC_URL && process.env.CALLISMATIC_API_KEY);
}

const REASON_PATTERN = /^[a-z_]{1,40}$/;

export async function startAgentCall(request: AgentCallRequest, fetchImpl: typeof fetch = fetch): Promise<StartAgentCallResult> {
  const base = process.env.CALLISMATIC_URL;
  const key = process.env.CALLISMATIC_API_KEY;
  if (!base || !key) return { ok: false, reason: "not_configured" };

  let response: Response;
  try {
    response = await fetchImpl(`${base.replace(/\/+$/, "")}/api/outbound-calls`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key },
      body: JSON.stringify({
        job_id: request.jobId,
        lead_id: request.leadId,
        organization_id: request.organizationId,
        phone_e164: request.phoneE164,
        country: request.country,
        title: request.title,
        contact_name: request.contactName ?? null,
        company: request.company ?? null,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { ok: false, reason: "callismatic_unreachable" };
  }
  if (response.status === 202) return { ok: true };
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  const reason = typeof body?.error === "string" && REASON_PATTERN.test(body.error) ? body.error : `http_${response.status}`;
  return { ok: false, reason };
}
