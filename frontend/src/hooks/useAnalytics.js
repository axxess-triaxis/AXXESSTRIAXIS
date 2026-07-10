import { useEffect, useRef } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SESSION_KEY = "tx.sid";
const SECTION_ATTR = "data-testid";
const SECTION_ID_MATCH = /-section$/;

function deviceType() {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  const uaMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  if (uaMobile && w < 768) return "mobile";
  if (uaMobile && w < 1100) return "tablet";
  return "desktop";
}

function getSessionId() {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "anon-" + Date.now().toString(36);
  }
}

function beacon(event) {
  const url = `${API}/analytics/event`;
  const body = JSON.stringify(event);
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return;
    }
  } catch {
    /* fall through */
  }
  // fallback (fire-and-forget)
  axios.post(url, event).catch(() => {});
}

/**
 * Track pageview, dwell time, and section views on the current page.
 * Do NOT run on admin pages (opt-in).
 */
export default function useAnalytics({ enabled = true } = {}) {
  const start = useRef(Date.now());
  const sent = useRef(false);
  const observed = useRef(new Set());

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const session_id = getSessionId();
    const path = window.location.pathname + window.location.search;
    const device = deviceType();
    const referrer = document.referrer || null;

    // pageview
    beacon({
      type: "pageview",
      session_id,
      path,
      referrer,
      device,
    });

    // section views via IntersectionObserver
    const sendSection = (name) => {
      if (!name || observed.current.has(name)) return;
      observed.current.add(name);
      beacon({
        type: "section_view",
        session_id,
        path,
        section: name,
      });
    };

    let observer = null;
    try {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
              const el = entry.target;
              const key = (el.getAttribute(SECTION_ATTR) || el.id || "").replace(
                SECTION_ID_MATCH,
                ""
              );
              sendSection(key || el.id || "unknown");
            }
          });
        },
        { threshold: [0.35] }
      );

      // observe every element with data-testid ending in -section, plus the footer
      const nodes = document.querySelectorAll(`[${SECTION_ATTR}$="-section"], [${SECTION_ATTR}="site-footer"]`);
      nodes.forEach((n) => observer.observe(n));
    } catch {
      /* older browsers: skip */
    }

    // dwell send
    const flushDwell = () => {
      if (sent.current) return;
      sent.current = true;
      const dwell_ms = Math.min(Date.now() - start.current, 6 * 60 * 60 * 1000);
      beacon({
        type: "dwell",
        session_id,
        path,
        dwell_ms,
        device,
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushDwell();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushDwell);
    window.addEventListener("beforeunload", flushDwell);

    return () => {
      flushDwell();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushDwell);
      window.removeEventListener("beforeunload", flushDwell);
      if (observer) observer.disconnect();
    };
  }, [enabled]);
}
