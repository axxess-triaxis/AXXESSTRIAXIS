import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WhatsAppLiveNotificationBanner } from "./WhatsAppLiveNotificationBanner";
import type { WhatsAppBusinessEvent } from "../../domain";

function event(overrides: Partial<WhatsAppBusinessEvent> = {}): WhatsAppBusinessEvent {
  return {
    id: "evt-1", organizationId: "org-1", eventType: "message_inbound",
    fromNumber: "+911234567890", payload: {}, receivedAt: "2026-08-02T00:00:00.000Z", createdAt: "2026-08-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("WhatsAppLiveNotificationBanner", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders nothing when there are no events", () => {
    const { container } = render(<WhatsAppLiveNotificationBanner events={[]} onDismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("describes an inbound message with the sender's number", () => {
    render(<WhatsAppLiveNotificationBanner events={[event()]} onDismiss={vi.fn()} />);
    expect(screen.getByText(/New WhatsApp message from \+911234567890/)).toBeInTheDocument();
  });

  it("describes a message-status (broadcast/template delivery) event", () => {
    render(<WhatsAppLiveNotificationBanner events={[event({ eventType: "message_status", messageStatus: "delivered", toNumber: "+919999999999" })]} onDismiss={vi.fn()} />);
    expect(screen.getByText(/WhatsApp message delivered to \+919999999999/)).toBeInTheDocument();
  });

  it("calls onDismiss when the close button is clicked", () => {
    const onDismiss = vi.fn();
    render(<WhatsAppLiveNotificationBanner events={[event()]} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByLabelText("Dismiss notification"));
    expect(onDismiss).toHaveBeenCalledWith("evt-1");
  });

  it("auto-dismisses after the timeout without user interaction", () => {
    const onDismiss = vi.fn();
    render(<WhatsAppLiveNotificationBanner events={[event()]} onDismiss={onDismiss} />);
    vi.advanceTimersByTime(8_000);
    expect(onDismiss).toHaveBeenCalledWith("evt-1");
  });
});
