import type { SelectedEmailImport } from "./connectorContract";
import { parseGmailSelectedMessage, type GmailMessage } from "./gmailSelectedMessage";

export type GmailMailboxMessageSummary = SelectedEmailImport & {
  bodyPreview: string;
};

export type GmailMailboxListOptions = {
  accessToken: string;
  limit?: number;
  fetcher?: typeof fetch;
};

type GmailMailboxListPayload = {
  messages?: { id?: string }[];
  error?: { message?: string };
};

function boundedLimit(value?: number) {
  if (!value || !Number.isFinite(value)) return 10;
  return Math.min(Math.max(Math.trunc(value), 1), 25);
}

// Gmail's list endpoint only returns {id, threadId} pairs -- unlike Microsoft Graph's single-call
// listing, each message's subject/from/date/snippet requires a separate metadata fetch.
async function fetchGmailMessageMetadata(messageId: string, accessToken: string, fetcher: typeof fetch): Promise<GmailMailboxMessageSummary | undefined> {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}`);
  url.searchParams.set("format", "metadata");
  url.searchParams.append("metadataHeaders", "Subject");
  url.searchParams.append("metadataHeaders", "From");
  url.searchParams.append("metadataHeaders", "Date");
  const response = await fetcher(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return undefined;
  const payload = await response.json().catch(() => undefined) as GmailMessage | undefined;
  if (!payload) return undefined;
  const parsed = parseGmailSelectedMessage(payload, { messageId, maxBodyCharacters: 300 });
  return { ...parsed, bodyPreview: parsed.bodyText || payload.snippet?.trim() || "" };
}

export async function fetchGmailMailboxMessages(options: GmailMailboxListOptions): Promise<GmailMailboxMessageSummary[]> {
  if (!options.accessToken.trim()) throw new Error("Gmail access token is required.");
  const fetcher = options.fetcher ?? fetch;

  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("maxResults", String(boundedLimit(options.limit)));
  listUrl.searchParams.set("labelIds", "INBOX");
  const listResponse = await fetcher(listUrl, {
    headers: { Authorization: `Bearer ${options.accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });
  const listPayload = await listResponse.json().catch(() => ({})) as GmailMailboxListPayload;
  if (!listResponse.ok) {
    throw new Error(listPayload.error?.message ?? `Gmail mailbox list failed with status ${listResponse.status}.`);
  }

  const ids = (listPayload.messages ?? []).map((message) => message.id).filter((id): id is string => Boolean(id));
  const summaries = await Promise.all(ids.map((id) => fetchGmailMessageMetadata(id, options.accessToken, fetcher)));
  return summaries.filter((summary): summary is GmailMailboxMessageSummary => Boolean(summary));
}
