import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalyticsProviderShell } from "../../services/analytics";
import { MockAnalyticsProvider } from "../../services/analytics/MockAnalyticsProvider";
import { BetaFeedbackModal } from "./BetaFeedbackModal";

// A-65 fix (2026-07-27): submitFeedback() used to write straight to
// betaFeedbackRepository.create(), which persists the row but never sends the "flows to
// triaxisgrp@gmail.com" email -- that only happens inside POST /api/beta-feedback. This proves
// the form now actually calls that route (the one real, tested email-sending path).
const testUser = { id: "user-1", organizationId: "org-1", role: "Employee" as const };

function renderModal(onClose = vi.fn()) {
  return render(
    <AnalyticsProviderShell provider={new MockAnalyticsProvider()}>
      <BetaFeedbackModal user={testUser} moduleName="Dashboard" route="/dashboard" onClose={onClose} />
    </AnalyticsProviderShell>,
  );
}

describe("BetaFeedbackModal", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits to POST /api/beta-feedback (the route that sends email), not the repository directly", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "fb-1", emailDeliveryStatus: "sent" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    renderModal();
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "The upload button did nothing." } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Feedback/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/beta-feedback", expect.objectContaining({
        method: "POST",
        credentials: "include",
      }));
    });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({ message: "The upload button did nothing." });
    expect(screen.getByText("Feedback submitted. Thank you.")).toBeInTheDocument();
  });

  it("shows the real server error instead of a generic message when the route rejects the request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Feedback message is required." }), { status: 400 })));

    renderModal();
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "ok message" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit Feedback/i }));

    await waitFor(() => {
      expect(screen.getByText("Feedback message is required.")).toBeInTheDocument();
    });
  });
});
