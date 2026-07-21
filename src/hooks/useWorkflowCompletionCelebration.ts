"use client";

import { useCallback, useState } from "react";

/** Unlike A9/A10/A16's once-per-scope prompts, the completion celebration is pure positive
 * reinforcement -- it's meant to fire every time a workflow completes, not be gated to "once". */
export function useWorkflowCompletionCelebration() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  const celebrate = useCallback((celebrationMessage: string) => {
    setMessage(celebrationMessage);
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => setVisible(false), []);

  return { visible, message, celebrate, dismiss };
}
