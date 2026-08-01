// Mirrors src/demo/demoMode.ts's localStorage pattern -- no cookie, since (unlike the demo session
// flag) this toggle has no Edge Runtime/proxy relevance, purely a client-side UX preference.
export const agenticGateStorageKey = "axxess.agenticGate.enabled";
export const agenticGateChangedEvent = "axxess:agentic-gate-changed";

export function isAgenticGateEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(agenticGateStorageKey);
  return raw === null ? true : raw === "true";
}

export function setAgenticGateEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(agenticGateStorageKey, enabled ? "true" : "false");
  window.dispatchEvent(new CustomEvent(agenticGateChangedEvent, { detail: { enabled } }));
}
