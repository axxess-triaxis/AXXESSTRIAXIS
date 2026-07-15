import { describe, expect, it, vi } from "vitest";
import { fetchGmailSelectedMessage, parseGmailSelectedMessage } from "./gmailSelectedMessage";

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

describe("Gmail selected-message import", () => {
  it("parses headers and nested text/plain parts into a selected email import", () => {
    const selectedEmail = parseGmailSelectedMessage({
      id: "msg-123",
      payload: {
        headers: [
          { name: "From", value: "Dr. Ritu Saikia <ritu.saikia@nemh.example>" },
          { name: "Subject", value: "District oxygen resilience review" },
          { name: "Date", value: "Wed, 15 Jul 2026 09:30:00 +0530" },
        ],
        parts: [
          {
            mimeType: "multipart/alternative",
            parts: [
              { mimeType: "text/html", body: { data: encode("<p>Ignore HTML</p>") } },
              { mimeType: "text/plain", body: { data: encode("Please review oxygen pipeline variance before the Mission Secretariat meeting.") } },
            ],
          },
        ],
      },
    });

    expect(selectedEmail).toMatchObject({
      providerId: "gmail",
      messageId: "msg-123",
      from: "Dr. Ritu Saikia <ritu.saikia@nemh.example>",
      subject: "District oxygen resilience review",
    });
    expect(selectedEmail.bodyText).toContain("oxygen pipeline variance");
    expect(selectedEmail.sourceLink).toContain("mail.google.com");
  });

  it("fetches exactly one Gmail message with the readonly bearer token", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      id: "msg-456",
      payload: {
        headers: [
          { name: "From", value: "Smt. Juri Das <juri.das@district.example>" },
          { name: "Subject", value: "Procurement decision note" },
        ],
        body: { data: encode("Approved procurement review note.") },
        mimeType: "text/plain",
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const selectedEmail = await fetchGmailSelectedMessage({
      messageId: "msg-456",
      accessToken: "access-token",
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toContain("/gmail/v1/users/me/messages/msg-456");
    expect(String(url)).toContain("format=full");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer access-token" });
    expect(selectedEmail.bodyText).toContain("Approved procurement review note");
  });
});
