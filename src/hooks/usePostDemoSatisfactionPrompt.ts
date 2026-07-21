"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "axxess.post-demo-satisfaction.shown-for-session";
const PENDING_KEY = "axxess.post-demo-satisfaction.pending";
const EVENT_NAME = "axxess-post-demo-satisfaction-shown-updated";

function readShown(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(STORAGE_KEY) === "true";
}

function writeShown() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, "true");
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

/** Demo mode turning off (DemoModePanel) hard-navigates to /dashboard immediately after --
 * there's no time for a transient "show the prompt now" React state to render before the page
 * unloads. Settings marks intent to prompt here; App.tsx (rendered on every authenticated route)
 * checks this flag on mount and actually triggers the prompt after the navigation completes. */
export function markPostDemoSatisfactionPromptPending() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_KEY, "true");
}

function consumePending(): boolean {
  if (typeof window === "undefined") return false;
  const pending = window.sessionStorage.getItem(PENDING_KEY) === "true";
  if (pending) window.sessionStorage.removeItem(PENDING_KEY);
  return pending;
}

/** Fires at most once per demo session (sessionStorage, not localStorage -- a fresh browser tab
 * or a later demo session should be able to prompt again, unlike the once-ever A9 micro-survey).
 * Intended trigger: the natural end of a live demo session, which in this product's actual UX is
 * turning Investor Preview off in Settings (DemoModePanel), not an unreliable beforeunload hook. */
export function usePostDemoSatisfactionPrompt() {
  const [hasBeenShownThisSession, setHasBeenShownThisSession] = useState(() => readShown());
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => setHasBeenShownThisSession(readShown());
    window.addEventListener(EVENT_NAME, sync);
    return () => window.removeEventListener(EVENT_NAME, sync);
  }, []);

  const trigger = useCallback(() => {
    if (readShown()) return;
    writeShown();
    setHasBeenShownThisSession(true);
    setVisible(true);
  }, []);

  // Consumes a pending flag left by markPostDemoSatisfactionPromptPending() (set just before the
  // demo-mode-off hard navigation) once the resulting page has actually mounted.
  useEffect(() => {
    if (consumePending()) trigger();
  }, [trigger]);

  const dismiss = useCallback(() => setVisible(false), []);

  return { visible, trigger, dismiss, hasBeenShownThisSession };
}
