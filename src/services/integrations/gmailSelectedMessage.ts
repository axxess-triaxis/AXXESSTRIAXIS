import type { SelectedEmailImport } from "./connectorContract";

export type GmailMessageHeader = {
  name?: string;
  value?: string;
};

export type GmailMessagePart = {
  mimeType?: string;
  filename?: string;
  headers?: GmailMessageHeader[];
  body?: {
    data?: string;
    size?: number;
  };
  parts?: GmailMessagePart[];
};

export type GmailMessage = {
  id?: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
};

export type GmailSelectedMessageImportOptions = {
  messageId: string;
  accessToken: string;
  fetcher?: typeof fetch;
  maxBodyCharacters?: number;
};

function decodeBase64Url(data?: string) {
  if (!data) return "";
  return Buffer.from(data, "base64url").toString("utf8");
}

function collectHeaders(part?: GmailMessagePart): GmailMessageHeader[] {
  return part?.headers ?? [];
}

function headerValue(headers: GmailMessageHeader[], name: string) {
  return headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value?.trim();
}

function collectTextParts(part: GmailMessagePart | undefined, values: string[] = []) {
  if (!part) return values;
  if (part.mimeType === "text/plain" && part.body?.data) {
    const decoded = decodeBase64Url(part.body.data).trim();
    if (decoded) values.push(decoded);
  }
  for (const child of part.parts ?? []) collectTextParts(child, values);
  return values;
}

function normalizeReceivedAt(headers: GmailMessageHeader[], message: GmailMessage) {
  const headerDate = headerValue(headers, "Date");
  const candidate = headerDate ? Date.parse(headerDate) : Number(message.internalDate);
  if (Number.isFinite(candidate)) return new Date(candidate).toISOString();
  return undefined;
}

function sourceLinkFor(messageId: string) {
  return `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(messageId)}`;
}

export function parseGmailSelectedMessage(
  message: GmailMessage,
  options: { messageId?: string; maxBodyCharacters?: number } = {},
): SelectedEmailImport {
  const messageId = message.id ?? options.messageId;
  const headers = collectHeaders(message.payload);
  const textParts = collectTextParts(message.payload);
  const bodyText = (textParts.length > 0 ? textParts.join("\n\n") : message.snippet ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  const maxBodyCharacters = options.maxBodyCharacters ?? 30000;

  return {
    providerId: "gmail",
    messageId,
    sourceLink: messageId ? sourceLinkFor(messageId) : undefined,
    from: headerValue(headers, "From") ?? "Unknown sender",
    subject: headerValue(headers, "Subject") ?? "Untitled Gmail message",
    receivedAt: normalizeReceivedAt(headers, message),
    bodyText: bodyText.slice(0, maxBodyCharacters),
  };
}

export async function fetchGmailSelectedMessage(options: GmailSelectedMessageImportOptions): Promise<SelectedEmailImport> {
  if (!options.messageId.trim()) throw new Error("Gmail message id is required.");
  if (!options.accessToken.trim()) throw new Error("Gmail access token is required.");

  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(options.messageId)}`);
  url.searchParams.set("format", "full");
  const response = await (options.fetcher ?? fetch)(url, {
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as GmailMessage & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Gmail selected message fetch failed with status ${response.status}.`);
  }

  return parseGmailSelectedMessage(payload, {
    messageId: options.messageId,
    maxBodyCharacters: options.maxBodyCharacters,
  });
}
