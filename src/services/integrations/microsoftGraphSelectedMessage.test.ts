import { describe, expect, it, vi } from "vitest";
import { fetchMicrosoftGraphSelectedMessage, parseMicrosoftGraphSelectedMessage } from "./microsoftGraphSelectedMessage";

describe("Microsoft Graph selected-message import", () => {
  it("parses Graph message fields into the shared selected email import contract", () => {
    const selectedEmail = parseMicrosoftGraphSelectedMessage({
      id: "AAMkAGI2",
      subject: "Kamrup procurement variance note",
      from: { emailAddress: { name: "Finance Controller", address: "finance.controller@nemh.example" } },
      receivedDateTime: "2026-07-15T10:40:00.000Z",
      webLink: "https://outlook.office.com/mail/inbox/id/AAMkAGI2",
      body: {
        contentType: "html",
        content: "<p>Please review procurement variance before approval committee.</p><p>Decision required: conditional release.</p>",
      },
    });

    expect(selectedEmail).toMatchObject({
      providerId: "microsoft",
      messageId: "AAMkAGI2",
      from: "Finance Controller <finance.controller@nemh.example>",
      subject: "Kamrup procurement variance note",
    });
    expect(selectedEmail.bodyText).toContain("Decision required");
    expect(selectedEmail.sourceLink).toContain("outlook.office.com");
  });

  it("fetches exactly one Microsoft Graph message with the readonly bearer token", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      id: "graph-msg-1",
      subject: "District review action",
      from: { emailAddress: { name: "DPM Dibrugarh", address: "dpm.dibrugarh@nemh.example" } },
      bodyPreview: "Please confirm ambulance turnaround review.",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const selectedEmail = await fetchMicrosoftGraphSelectedMessage({
      messageId: "graph-msg-1",
      accessToken: "access-token",
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toContain("/v1.0/me/messages/graph-msg-1");
    expect(String(url)).toContain("%24select=");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer access-token" });
    expect(selectedEmail.bodyText).toContain("ambulance turnaround");
  });
});
