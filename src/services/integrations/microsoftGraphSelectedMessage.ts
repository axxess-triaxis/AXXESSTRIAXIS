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
  return decodeBasicHtmlEntities(renderHtmlText(value))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function renderHtmlText(value: string) {
  const output: string[] = [];
  let index = 0;

  while (index < value.length) {
    if (value[index] !== "<") {
      output.push(value[index]);
      index += 1;
      continue;
    }

    const tagEnd = findHtmlTagEnd(value, index + 1);
    if (tagEnd === -1) {
      output.push(value[index]);
      index += 1;
      continue;
    }

    const tag = readHtmlTag(value, index, tagEnd);
    if (tag && !tag.isClosing && (tag.name === "script" || tag.name === "style")) {
      output.push(" ");
      index = findClosingHtmlTagEnd(value, tag.name, tagEnd + 1);
      continue;
    }

    if (tag && isLineBreakTag(tag.name, tag.isClosing)) {
      output.push("\n");
    } else {
      output.push(" ");
    }
    index = tagEnd + 1;
  }

  return output.join("");
}

function findHtmlTagEnd(value: string, fromIndex: number) {
  let quote: string | undefined;
  for (let index = fromIndex; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === quote) quote = undefined;
      continue;
    }
    if (character === "\"" || character === "'") {
      quote = character;
      continue;
    }
    if (character === ">") return index;
  }
  return -1;
}

function readHtmlTag(value: string, tagStart: number, tagEnd: number) {
  let index = tagStart + 1;
  while (index < tagEnd && isHtmlWhitespace(value[index])) index += 1;

  let isClosing = false;
  if (value[index] === "/") {
    isClosing = true;
    index += 1;
    while (index < tagEnd && isHtmlWhitespace(value[index])) index += 1;
  }

  if (value[index] === "!" || value[index] === "?") return undefined;

  const nameStart = index;
  while (index < tagEnd && isHtmlTagNameCharacter(value[index])) index += 1;
  if (nameStart === index) return undefined;

  return {
    isClosing,
    name: value.slice(nameStart, index).toLowerCase(),
  };
}

function findClosingHtmlTagEnd(value: string, tagName: string, fromIndex: number) {
  const lowerValue = value.toLowerCase();
  const needle = `</${tagName}`;
  let tagStart = lowerValue.indexOf(needle, fromIndex);

  while (tagStart !== -1) {
    const afterTagName = tagStart + needle.length;
    const nextCharacter = value[afterTagName];
    if (nextCharacter === ">" || isHtmlWhitespace(nextCharacter)) {
      const tagEnd = findHtmlTagEnd(value, afterTagName);
      return tagEnd === -1 ? value.length : tagEnd + 1;
    }
    tagStart = lowerValue.indexOf(needle, tagStart + 1);
  }

  return value.length;
}

function isHtmlWhitespace(value?: string) {
  return value === " " || value === "\n" || value === "\r" || value === "\t" || value === "\f";
}

function isHtmlTagNameCharacter(value?: string) {
  if (!value) return false;
  const code = value.charCodeAt(0);
  return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isLineBreakTag(tagName: string, isClosing: boolean) {
  if (tagName === "br") return true;
  return isClosing && (tagName === "p" || tagName === "div" || tagName === "li" || tagName === "tr");
}

function decodeBasicHtmlEntities(value: string) {
  const replacements: Record<string, string> = {
    "&amp;": "&",
    "&nbsp;": " ",
    "&#39;": "'",
    "&quot;": "\"",
  };
  return value.replace(/&(amp|nbsp|quot|#39);/gi, (entity) => replacements[entity.toLowerCase()] ?? entity);
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
