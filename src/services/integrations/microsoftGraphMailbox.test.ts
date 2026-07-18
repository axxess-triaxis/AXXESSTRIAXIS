import { describe, expect, it, vi } from "vitest";
import { fetchMicrosoftGraphMailboxMessages, parseMicrosoftGraphMailboxMessages } from "./microsoftGraphMailbox";

describe("Microsoft Graph mailbox list", () => {
  it("parses mailbox summaries into selected-email imports", () => {
    const messages = parseMicrosoftGraphMailboxMessages({
      value: [
        {
          id: "msg-1",
          subject: "District review minutes",
          from: { emailAddress: { name: "Mission Secretariat", address: "secretariat@nemh.example" } },
          receivedDateTime: "2026-07-18T09:30:00.000Z",
          bodyPreview: "Decision required: approve district review action plan.",
          webLink: "https://outlook.office.com/mail/inbox/id/msg-1",
        },
      ],
    });

    expect(messages[0]).toMatchObject({
      providerId: "microsoft",
      messageId: "msg-1",
      subject: "District review minutes",
      from: "Mission Secretariat <secretariat@nemh.example>",
      bodyPreview: "Decision required: approve district review action plan.",
    });
  });

  it("fetches recent inbox messages with bounded list parameters", async () => {
    let requestedUrl = "";
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({
      value: [
        {
          id: "msg-2",
          subject: "Procurement exception",
          bodyPreview: "Action required: attach vendor clarification.",
        },
      ],
    }), { status: 200 });
    });

    const messages = await fetchMicrosoftGraphMailboxMessages({
      accessToken: "token",
      limit: 100,
      fetcher: fetcher as unknown as typeof fetch,
    });
    const url = new URL(requestedUrl);

    expect(url.searchParams.get("$top")).toBe("25");
    expect(url.searchParams.get("$orderby")).toBe("receivedDateTime desc");
    expect(messages[0]?.messageId).toBe("msg-2");
  });
});
