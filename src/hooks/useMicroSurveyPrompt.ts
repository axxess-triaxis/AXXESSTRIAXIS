"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "axxess.micro-survey.shown";
const EVENT_NAME = "axxess-micro-survey-shown-updated";

function readShown(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

function writeShown() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, "true");
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

/** Ensures the in-context micro-survey appears at most once per user, ever, regardless of how
 * many eligible trigger points (first AI review decision, first golden-path step, etc.) fire. */
export function useMicroSurveyPrompt() {
  const [hasBeenShown, setHasBeenShown] = useState(() => readShown());
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => setHasBeenShown(readShown());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const trigger = useCallback(() => {
    if (readShown()) return;
    writeShown();
    setHasBeenShown(true);
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => setVisible(false), []);

  return { visible, trigger, dismiss, hasBeenShown };
}
