import { describe, expect, it, vi } from "vitest";
import { fetchGmailMailboxMessages } from "./gmailMailbox";

describe("Gmail mailbox list", () => {
  it("lists inbox messages then fetches each message's metadata for subject/from/snippet", async () => {
    const requestedUrls: string[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.includes("/messages?")) {
        return new Response(JSON.stringify({ messages: [{ id: "msg-1" }, { id: "msg-2" }] }), { status: 200 });
      }
      const id = url.includes("msg-1") ? "msg-1" : "msg-2";
      return new Response(JSON.stringify({
        id,
        snippet: `Snippet for ${id}`,
        payload: {
          headers: [
            { name: "From", value: `Sender ${id} <${id}@nemh.example>` },
            { name: "Subject", value: `Subject for ${id}` },
          ],
        },
      }), { status: 200 });
    });

    const messages = await fetchGmailMailboxMessages({
      accessToken: "access-token",
      limit: 100,
      fetcher: fetcher as unknown as typeof fetch,
    });

    const listUrl = new URL(requestedUrls[0]);
    expect(listUrl.searchParams.get("maxResults")).toBe("25");
    expect(listUrl.searchParams.get("labelIds")).toBe("INBOX");
    expect(requestedUrls[1]).toContain("format=metadata");
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ providerId: "gmail", messageId: "msg-1", subject: "Subject for msg-1" });
    expect(messages[0].bodyPreview).toContain("Snippet for msg-1");
  });

  it("skips messages whose metadata fetch fails rather than failing the whole list", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/messages?")) {
        return new Response(JSON.stringify({ messages: [{ id: "msg-ok" }, { id: "msg-fail" }] }), { status: 200 });
      }
      if (url.includes("msg-fail")) return new Response("", { status: 500 });
      return new Response(JSON.stringify({ id: "msg-ok", snippet: "ok", payload: { headers: [] } }), { status: 200 });
    });

    const messages = await fetchGmailMailboxMessages({
      accessToken: "access-token",
      fetcher: fetcher as unknown as typeof fetch,
    });

    expect(messages).toHaveLength(1);
    expect(messages[0].messageId).toBe("msg-ok");
  });

  it("throws when the accessToken is missing", async () => {
    await expect(fetchGmailMailboxMessages({ accessToken: "" })).rejects.toThrow("Gmail access token is required.");
  });
});
