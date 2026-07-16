import type { SelectedEmailImport } from "./connectorContract";

export type MicrosoftGraphEmailAddress = {
  name?: string;
  address?: string;
};

export type MicrosoftGraphMessage = {
  id?: string;
  subject?: string;
  from?: {
    emailAddress?: MicrosoftGraphEmailAddress;
  };
  receivedDateTime?: string;
  bodyPreview?: string;
  webLink?: string;
  body?: {
    contentType?: "text" | "html";
    content?: string;
  };
};

export type MicrosoftGraphSelectedMessageOptions = {
  messageId: string;
  accessToken: string;
  fetcher?: typeof fetch;
  maxBodyCharacters?: number;
};

function htmlToText(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function senderLabel(address?: MicrosoftGraphEmailAddress) {
  if (!address?.name && !address?.address) return "Unknown sender";
  if (!address.name) return address.address ?? "Unknown sender";
  if (!address.address) return address.name;
  return `${address.name} <${address.address}>`;
}

function sourceLinkFor(messageId: string) {
  return `https://outlook.office.com/mail/id/${encodeURIComponent(messageId)}`;
}

export function parseMicrosoftGraphSelectedMessage(
  message: MicrosoftGraphMessage,
  options: { messageId?: string; maxBodyCharacters?: number } = {},
): SelectedEmailImport {
  const messageId = message.id ?? options.messageId;
  const maxBodyCharacters = options.maxBodyCharacters ?? 30000;
  const bodyContent = message.body?.content?.trim();
  const bodyText = (bodyContent
    ? message.body?.contentType === "html" ? htmlToText(bodyContent) : bodyContent
    : message.bodyPreview ?? "")
    .replace(/\r\n/g, "\n")
    .trim();

  return {
    providerId: "microsoft",
    messageId,
    sourceLink: message.webLink ?? (messageId ? sourceLinkFor(messageId) : undefined),
    from: senderLabel(message.from?.emailAddress),
    subject: message.subject?.trim() || "Untitled Microsoft message",
    receivedAt: message.receivedDateTime ? new Date(message.receivedDateTime).toISOString() : undefined,
    bodyText: bodyText.slice(0, maxBodyCharacters),
  };
}

export async function fetchMicrosoftGraphSelectedMessage(options: MicrosoftGraphSelectedMessageOptions): Promise<SelectedEmailImport> {
  if (!options.messageId.trim()) throw new Error("Microsoft Graph message id is required.");
  if (!options.accessToken.trim()) throw new Error("Microsoft Graph access token is required.");

  const url = new URL(`https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(options.messageId)}`);
  url.searchParams.set("$select", "id,subject,from,receivedDateTime,body,bodyPreview,webLink");
  const response = await (options.fetcher ?? fetch)(url, {
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      Accept: "application/json",
      Prefer: "outlook.body-content-type=\"text\"",
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as MicrosoftGraphMessage & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Microsoft Graph selected message fetch failed with status ${response.status}.`);
  }

  return parseMicrosoftGraphSelectedMessage(payload, {
    messageId: options.messageId,
    maxBodyCharacters: options.maxBodyCharacters,
  });
}
