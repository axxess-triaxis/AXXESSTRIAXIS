// MC-3 (2026-08-02): non-modal, auto-dismissing toast stack for live WhatsApp events (messages,
// calls, broadcast/template delivery status). Styled on ConfirmDialog.tsx's color/spacing
// conventions, but fixed top-right and never blocks the page -- this is a notification, not a
// confirmation. Mounted globally in App.tsx alongside GuidedDemoBanner/WhatsNewPanel, not scoped
// to any one route, since a WhatsApp event can arrive while the user is anywhere in the app.
import { useEffect } from "react";
import { X } from "lucide-react";
import type { WhatsAppBusinessEvent } from "../../domain";

const AUTO_DISMISS_MS = 8_000;

function describeEvent(event: WhatsAppBusinessEvent): string {
  if (event.eventType === "message_inbound") {
    return `New WhatsApp message from ${event.fromNumber ?? "an unknown number"}`;
  }
  if (event.eventType === "message_status") {
    const status = event.messageStatus ?? "updated";
    return `WhatsApp message ${status}${event.toNumber ? ` to ${event.toNumber}` : ""}`;
  }
  if (event.eventType === "call") {
    return `WhatsApp call ${event.callStatus ?? "event"}${event.fromNumber ? ` from ${event.fromNumber}` : ""}`;
  }
  return "New WhatsApp event";
}

function NotificationToast({ event, onDismiss }: { event: WhatsAppBusinessEvent; onDismiss: (eventId: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(event.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [event.id, onDismiss]);

  return (
    <div className="flex items-start gap-2 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-3 shadow-xl">
      <div className="flex-1">
        <p className="text-xs font-semibold text-[#0F1117]">{describeEvent(event)}</p>
        <p className="mt-0.5 text-[10px] text-[#5F6B73]">{new Date(event.receivedAt).toLocaleTimeString()}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(event.id)}
        aria-label="Dismiss notification"
        className="rounded p-0.5 text-[#5F6B73] hover:bg-[#F2F3F5]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function WhatsAppLiveNotificationBanner({ events, onDismiss }: { events: WhatsAppBusinessEvent[]; onDismiss: (eventId: string) => void }) {
  if (events.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[90] flex w-full max-w-xs flex-col gap-2">
      {events.map((event) => (
        <div key={event.id} className="pointer-events-auto">
          <NotificationToast event={event} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
