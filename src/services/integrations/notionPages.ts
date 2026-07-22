const notionApiVersion = "2022-06-28";

export type NotionPageSummary = {
  pageId: string;
  title: string;
  url: string;
  lastEditedAt?: string;
};

export type NotionSearchListOptions = {
  accessToken: string;
  limit?: number;
  fetcher?: typeof fetch;
};

type NotionRichText = { plain_text?: string };
type NotionTitleProperty = { title?: NotionRichText[] };
type NotionPageObject = {
  id: string;
  url?: string;
  last_edited_time?: string;
  properties?: Record<string, NotionTitleProperty & { type?: string }>;
};
type NotionSearchResponse = {
  results?: NotionPageObject[];
  message?: string;
};

function boundedLimit(value?: number) {
  if (!value || !Number.isFinite(value)) return 10;
  return Math.min(Math.max(Math.trunc(value), 1), 25);
}

function titleFromPage(page: NotionPageObject) {
  const titleProperty = Object.values(page.properties ?? {}).find((property) => property.type === "title");
  const text = titleProperty?.title?.map((entry) => entry.plain_text ?? "").join("").trim();
  return text || "Untitled Notion page";
}

export function parseNotionSearchResults(payload: NotionSearchResponse): NotionPageSummary[] {
  return (payload.results ?? [])
    .filter((page) => page.id)
    .map((page) => ({
      pageId: page.id,
      title: titleFromPage(page),
      url: page.url ?? `https://notion.so/${page.id.replace(/-/g, "")}`,
      lastEditedAt: page.last_edited_time,
    }));
}

export async function fetchNotionPages(options: NotionSearchListOptions): Promise<NotionPageSummary[]> {
  if (!options.accessToken.trim()) throw new Error("Notion access token is required.");

  const response = await (options.fetcher ?? fetch)("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Notion-Version": notionApiVersion,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filter: { property: "object", value: "page" },
      sort: { direction: "descending", timestamp: "last_edited_time" },
      page_size: boundedLimit(options.limit),
    }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as NotionSearchResponse;
  if (!response.ok) {
    throw new Error(payload.message ?? `Notion search failed with status ${response.status}.`);
  }
  return parseNotionSearchResults(payload);
}

type NotionBlockObject = {
  id: string;
  type?: string;
  has_children?: boolean;
  [key: string]: unknown;
};
type NotionBlockChildrenResponse = {
  results?: NotionBlockObject[];
  has_more?: boolean;
  next_cursor?: string | null;
  message?: string;
};

// Covers the common text-bearing block types. Deeply nested blocks (toggles, nested lists beyond
// one level, synced blocks, databases embedded in a page) are not expanded -- an honest, documented
// limitation rather than a full Notion block-tree renderer, which is out of scope here.
const textBearingBlockTypes = new Set([
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list_item",
  "numbered_list_item",
  "to_do",
  "quote",
  "callout",
]);

function textFromBlock(block: NotionBlockObject): string {
  if (!block.type || !textBearingBlockTypes.has(block.type)) return "";
  const content = block[block.type] as { rich_text?: NotionRichText[] } | undefined;
  return (content?.rich_text ?? []).map((entry) => entry.plain_text ?? "").join("").trim();
}

export async function fetchNotionPageBodyText(input: {
  accessToken: string;
  pageId: string;
  fetcher?: typeof fetch;
}): Promise<string> {
  const response = await (input.fetcher ?? fetch)(`https://api.notion.com/v1/blocks/${encodeURIComponent(input.pageId)}/children?page_size=100`, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Notion-Version": notionApiVersion,
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as NotionBlockChildrenResponse;
  if (!response.ok) {
    throw new Error(payload.message ?? `Notion block listing failed with status ${response.status}.`);
  }
  return (payload.results ?? [])
    .map(textFromBlock)
    .filter(Boolean)
    .join("\n\n");
}
