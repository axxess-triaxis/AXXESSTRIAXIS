// One-tap call logging (2026-11-13). When someone taps Call on the Call queue, the tab remembers
// which lead was dialled, so that on return AXXESS can ask "how did it go?" with one tap. It lives
// in sessionStorage only: nothing is written to the server until an outcome is chosen, because
// contact_attempts is append-only and counts toward frequency limits. A blocked store means no
// prompt, never an error.
const KEY = "axxess.pendingCall";
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

export type PendingCall = { leadId: string; title: string; startedAt: string };

export function savePendingCall(call: { leadId: string; title: string }, now: Date): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...call, startedAt: now.toISOString() }));
  } catch {
    // Storage blocked: no prompt on return.
  }
}

export function clearPendingCall(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

export function readPendingCall(now: Date): PendingCall | null {
  let parsed: unknown;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const call = parsed as Partial<PendingCall> | null;
  if (!call || typeof call.leadId !== "string" || typeof call.title !== "string" || typeof call.startedAt !== "string") return null;
  const started = Date.parse(call.startedAt);
  if (Number.isNaN(started) || now.getTime() - started > MAX_AGE_MS) {
    clearPendingCall();
    return null;
  }
  return { leadId: call.leadId, title: call.title, startedAt: call.startedAt };
}
