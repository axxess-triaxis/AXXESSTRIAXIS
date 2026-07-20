"use client";

import { useCallback, useEffect, useState } from "react";
import type { GoldenPathDisplayMode } from "../services/workflows/enterpriseGoldenPath";

const STORAGE_KEY = "axxess.golden-path-display-mode";
const EVENT_NAME = "axxess-golden-path-display-mode-updated";
const DEFAULT_MODE: GoldenPathDisplayMode = "on-demand";

function readStoredMode(): GoldenPathDisplayMode {
  if (typeof window === "undefined") return DEFAULT_MODE;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === "guided" || raw === "on-demand" ? raw : DEFAULT_MODE;
}

function writeStoredMode(mode: GoldenPathDisplayMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

/** Persists the user's choice of golden-path display mode so high-discretion users can opt into
 * the full guided journey while everyone else sees an on-demand summary by default. */
export function useGoldenPathDisplayMode() {
  const [mode, setModeState] = useState<GoldenPathDisplayMode>(() => readStoredMode());

  useEffect(() => {
    const sync = () => setModeState(readStoredMode());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setMode = useCallback((next: GoldenPathDisplayMode) => {
    setModeState(next);
    writeStoredMode(next);
  }, []);

  return { mode, setMode };
}
