"use client";

import { useCallback, useEffect, useState } from "react";
import { releaseVersion } from "../services/analytics/config";

const STORAGE_KEY = "axxess.whats-new.last-seen-version";

function readLastSeenVersion(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

function writeLastSeenVersion(version: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, version);
}

/** Shows once per release version (not once ever, unlike A9's micro-survey) -- a customer who's
 * already seen this release's entries won't see them again until releaseVersion changes. */
export function useWhatsNewPanel() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readLastSeenVersion() !== releaseVersion);
  }, []);

  const dismiss = useCallback(() => {
    writeLastSeenVersion(releaseVersion);
    setVisible(false);
  }, []);

  return { visible, dismiss };
}
