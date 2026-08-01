"use client";

import { useTransition } from "react";

// Shared by every button-driven admin panel (EnterpriseAdminPage.tsx) so each one doesn't
// hand-roll the same fetch + pending + settled-message boilerplate already used ad hoc in
// PilotAcceptancePanel.tsx's record(). Error-tolerant by design: a failed request still
// surfaces a readable message instead of throwing, matching that same panel's style.
export function useAdminAction() {
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<string>, onSettled?: (message: string) => void) {
    startTransition(async () => {
      let message: string;
      try {
        message = await action();
      } catch {
        message = "The action could not be completed. Please try again.";
      }
      onSettled?.(message);
    });
  }

  return { run, isPending };
}

export async function adminActionFetch(input: string, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await response.json().catch(() => undefined) as Record<string, unknown> | undefined;
  if (!response.ok) {
    const reason = typeof data?.error === "string" ? data.error : `Request failed (${response.status}).`;
    throw new Error(reason);
  }
  return data;
}
