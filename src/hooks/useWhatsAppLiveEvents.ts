// MC-3 (2026-08-02): polls /api/whatsapp/events/recent for new WhatsApp message/status/call
// events and surfaces them as an ephemeral, auto-dismissing local queue for
// WhatsAppLiveNotificationBanner. Deliberately polling (setInterval), not a websocket/Realtime
// subscription -- no such infrastructure exists anywhere in this repo. organization_id is derived
// server-side from the session, never sent by this hook -- it only needs to know whether polling
// should run at all.
import { useEffect, useRef, useState } from "react";
import type { WhatsAppBusinessEvent } from "../domain";

const POLL_INTERVAL_MS = 15_000;
const MAX_VISIBLE_EVENTS = 5;

type WhatsAppEventsResponse = { events?: WhatsAppBusinessEvent[] };

export function useWhatsAppLiveEvents(enabled: boolean) {
  const [events, setEvents] = useState<WhatsAppBusinessEvent[]>([]);
  const sinceRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch(`/api/whatsapp/events/recent?since=${encodeURIComponent(sinceRef.current)}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;
        const payload = await response.json().catch(() => ({})) as WhatsAppEventsResponse;
        const fresh = payload.events ?? [];
        if (fresh.length === 0) return;

        sinceRef.current = fresh[0].receivedAt;
        setEvents((current) => [...fresh, ...current].slice(0, MAX_VISIBLE_EVENTS));
      } catch {
        // Silent -- a missed poll cycle just means the next one catches up via the same cursor.
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled]);

  function dismiss(eventId: string) {
    setEvents((current) => current.filter((event) => event.id !== eventId));
  }

  return { events, dismiss };
}
