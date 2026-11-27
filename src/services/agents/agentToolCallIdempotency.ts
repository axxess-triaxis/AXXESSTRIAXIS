import type { PendingToolCallSummary } from "./agentPendingToolCallRepository";

// Ops worker support (2026-11-25): an MCP client that times out on tools/call cannot know whether
// its approval request was created, and a plain retry used to create a second one. A client may
// now send its own key in params._meta; retrying with the same key returns the first pending call.
//
// The key covers calls that wait for approval (a row in agent_pending_tool_calls). A call that runs
// immediately -- an auto tool, or a critical tool with an Always Allow grant -- leaves no such row,
// so it is not deduplicated; the response then carries idempotencyNotApplied in result._meta rather
// than letting the client assume protection it does not have.
export const idempotencyKeyMetaField = "com.triaxisventures/idempotencyKey";
export const idempotencyNotApplied = { "com.triaxisventures/idempotency": "not_applied" };

const idempotencyKeyPattern = /^[A-Za-z0-9._:-]{8,128}$/;

export type CallerIdempotencyKey = { ok: true; key: string | undefined } | { ok: false; message: string };

/** Reads the optional caller key from a tools/call params._meta. Absent is fine; malformed is refused. */
export function readCallerIdempotencyKey(meta: unknown): CallerIdempotencyKey {
  if (!meta || typeof meta !== "object" || !Object.hasOwn(meta, idempotencyKeyMetaField)) return { ok: true, key: undefined };
  const key = (meta as Record<string, unknown>)[idempotencyKeyMetaField];
  if (typeof key !== "string" || !idempotencyKeyPattern.test(key)) {
    return { ok: false, message: `_meta["${idempotencyKeyMetaField}"] must be 8 to 128 characters from A-Z, a-z, 0-9, ".", "_", ":" and "-".` };
  }
  return { ok: true, key };
}

/** idempotency_key is unique across the table, so a caller key is always stored under its connection. */
export function scopedIdempotencyKey(agentConnectionId: string, callerKey: string): string {
  return `${agentConnectionId}:${callerKey}`;
}

// The stored arguments come back from jsonb, which does not keep key order.
function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, entry: unknown) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
    return Object.fromEntries(Object.entries(entry).sort(([left], [right]) => (left < right ? -1 : 1)));
  });
}

export function isSameToolCall(pendingCall: PendingToolCallSummary, toolName: string, args: Record<string, unknown>): boolean {
  return pendingCall.toolName === toolName && canonicalJson(pendingCall.arguments) === canonicalJson(args);
}

export type PendingToolCallState = "pending_approval" | "executed" | "failed" | "rejected" | "unknown";

/**
 * A row is reserved as "executed" before the tool runs and gets its result afterwards. Without a
 * result the tool may still be running, may have finished, or may never have started, so that is
 * "unknown" and never success.
 */
export function pendingToolCallState(pendingCall: PendingToolCallSummary): PendingToolCallState {
  if (pendingCall.status === "pending") return "pending_approval";
  if (pendingCall.status === "executed" && !hasExecutionResult(pendingCall)) return "unknown";
  return pendingCall.status;
}

export function hasExecutionResult(pendingCall: PendingToolCallSummary): boolean {
  const result = pendingCall.executionResult;
  if (result === undefined || result === null) return false;
  return typeof result !== "object" || Object.keys(result).length > 0;
}
