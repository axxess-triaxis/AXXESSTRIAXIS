import type { SelectedEmailImport } from "./connectorContract";
import { parseMicrosoftGraphSelectedMessage, type MicrosoftGraphMessage } from "./microsoftGraphSelectedMessage";

export type MicrosoftGraphMailboxMessageSummary = SelectedEmailImport & {
  bodyPreview: string;
};

export type MicrosoftGraphMailboxListOptions = {
  accessToken: string;
  folderId?: string;
  limit?: number;
  fetcher?: typeof fetch;
};

export type MicrosoftGraphMailboxListPayload = {
  value?: MicrosoftGraphMessage[];
  error?: {
    message?: string;
  };
};

function boundedLimit(value?: number) {
  if (!value || !Number.isFinite(value)) return 10;
  return Math.min(Math.max(Math.trunc(value), 1), 25);
}

export function parseMicrosoftGraphMailboxMessages(payload: MicrosoftGraphMailboxListPayload): MicrosoftGraphMailboxMessageSummary[] {
  return (payload.value ?? []).filter((message) => message.id).map((message) => {
    const parsed = parseMicrosoftGraphSelectedMessage(message, {
      messageId: message.id,
      maxBodyCharacters: 800,
    });
    return {
      ...parsed,
      bodyPreview: message.bodyPreview?.trim() ?? parsed.bodyText.slice(0, 300),
      bodyText: parsed.bodyText || message.bodyPreview?.trim() || "",
    };
  });
}

export async function fetchMicrosoftGraphMailboxMessages(options: MicrosoftGraphMailboxListOptions): Promise<MicrosoftGraphMailboxMessageSummary[]> {
  if (!options.accessToken.trim()) throw new Error("Microsoft Graph access token is required.");

  const folderId = options.folderId?.trim() || "inbox";
  const url = new URL(`https://graph.microsoft.com/v1.0/me/mailFolders/${encodeURIComponent(folderId)}/messages`);
  url.searchParams.set("$top", String(boundedLimit(options.limit)));
  url.searchParams.set("$orderby", "receivedDateTime desc");
  url.searchParams.set("$select", "id,subject,from,receivedDateTime,bodyPreview,webLink");

  const response = await (options.fetcher ?? fetch)(url, {
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as MicrosoftGraphMailboxListPayload;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Microsoft Graph mailbox list failed with status ${response.status}.`);
  }

  return parseMicrosoftGraphMailboxMessages(payload);
}
