// Pure HTML extraction: on-domain emails, named leaders, and team/about links. No network here.
import type { Person } from "./types.ts";

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const ASSET_SUFFIX = /\.(png|jpe?g|gif|webp|svg|css|js)$/i;

export const ROLE_WORDS = [
  "Co-Founder",
  "Cofounder",
  "Founder",
  "CEO",
  "Chief Executive Officer",
  "Managing Director",
  "Managing Partner",
  "Director",
  "Owner",
  "Proprietor",
  "Principal Dentist",
  "Chief Dentist",
  "Medical Director",
  "Clinical Director",
  "Chairman",
] as const;
// A bare "Partner" is left out on purpose: on these sites it is almost always "Our Insurance
// Partner" or "Your Trusted Partner" (both crawl batches, 2026-11-16/17). "Managing Partner" stays.

const ROLE_RE = new RegExp(`\\b(${ROLE_WORDS.map((r) => r.replace("-", "[- ]?")).join("|")})\\b`, "i");

/** Words that show up capitalised in slogans and menus but are never part of a person's name. */
const STOPWORDS = new Set(
  (
    "our your the team members member meet who we are from about us trusted real estate property properties " +
    "partner partners premier work evolutionary success insurance offers packages family health medical " +
    "consult consultant book free plan communities area guides for management overseas updates why all projects " +
    "leadership united arab emirates dubai abu dhabi sharjah india home homes group clinic clinics dental dentistry " +
    "skin hair specialist doctor doctors senior cosmetologist dermatologist general gynaecology skip channel " +
    "architect marketer designer developer director founder owner managing chief executive officer ceo co " +
    "contact services service welcome best top luxury capital realty brokerage llc ltd pvt company " +
    "message vision mission view more read learn testimonials client clients customer customers " +
    "solutions solution technologies technology digital media agency consulting studio sensory systems " +
    "premium apple kenapa pilih kami " +
    // Service and listing vocabulary: "Approved Maintenance Works" was imported as a person (staging run 1c8c5775).
    "approved maintenance works repair repairs renovation renovations interior interiors fitout fit out leasing " +
    "rental rentals rent sales sale buy sell investment investments valuation inspection cleaning facility " +
    "facilities certified licensed professional professionals residential commercial villa villas apartment " +
    "apartments office offices landlord landlords tenant tenants listing listings mortgage mortgages holiday " +
    "handover snagging conveyancing advisory finance global international national quality expert experts"
  ).split(" "),
);

/** Placeholder names that website templates ship with. */
const TEMPLATE_NAMES = new Set(["eleanor pena", "david bradley", "john doe", "jane doe", "jessica brown", "esther howard", "cameron williamson", "leslie alexander", "jenny wilson", "guy hawkins", "robert fox", "kristin watson", "jacob jones", "theresa webb"]);

const NAME_TOKEN = /^[A-Z][a-z'’-]+$|^[A-Z]\.?$|^(al|el|bin|bint|de|van|von|da|abu)$/i;

/** Strips a leading "Dr." and checks the rest looks like a 2 to 4 word personal name. */
export function cleanPersonName(raw: string): { name: string; doctor: boolean } | null {
  let s = raw.replace(/\s+/g, " ").trim().replace(/[,|:–-]+$/, "").trim();
  const doctor = /^dr\.?\s/i.test(s);
  if (doctor) s = s.replace(/^dr\.?\s+/i, "");
  const tokens = s.split(" ").filter(Boolean);
  if (tokens.length < 2 || tokens.length > 4) return null;
  if (!/^[A-Z]/.test(tokens[0]) || !/^[A-Z]/.test(tokens[tokens.length - 1])) return null;
  if (tokens.some((t) => !NAME_TOKEN.test(t))) return null;
  if (tokens.some((t) => STOPWORDS.has(t.toLowerCase().replace(/[.'’]/g, "")))) return null;
  // Abstract nouns ("Valuation", "Management", "Wellness") are not names. Length 8+ keeps "Clement".
  if (tokens.some((t) => t.length >= 8 && /(tion|sion|ment|ness|ship)$/i.test(t))) return null;
  // A single-letter last token ("Chandrakala P") is an initial, not a surname we can address.
  if (tokens[tokens.length - 1].replace(".", "").length < 2) return null;
  const name = tokens.join(" ");
  if (TEMPLATE_NAMES.has(name.toLowerCase())) return null;
  return { name, doctor };
}

const ENTITIES: Record<string, string> = { nbsp: " ", amp: "&", apos: "'", quot: '"', lt: "<", gt: ">" };
// One pass, so a decoded "&" can never start a second entity ("&amp;lt;" stays "&lt;").
const decodeEntities = (s: string) =>
  s.replace(/&(?:#(\d+)|([a-z]+));/gi, (whole, num: string | undefined, name: string | undefined) =>
    num !== undefined ? String.fromCharCode(Number(num)) : (ENTITIES[name!.toLowerCase()] ?? whole),
  );

/** Decodes Cloudflare's email protection (`data-cfemail` hex, first byte is the XOR key). */
export function decodeCfEmail(hex: string): string {
  const key = parseInt(hex.slice(0, 2), 16);
  let out = "";
  for (let i = 2; i + 1 < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  return out;
}

/** "www.foo-bar.co.in" -> "foo-bar": the label that identifies the company across TLDs. */
export function domainLabel(domain: string): string {
  const parts = domain.toLowerCase().replace(/^www\./, "").split(".");
  const twoLevel = parts.length >= 3 && ["co", "com", "net", "org", "ac", "gov"].includes(parts[parts.length - 2]);
  return parts[parts.length - (twoLevel ? 3 : 2)] ?? parts[0];
}

/** decodeURIComponent that returns the input unchanged on a malformed % sequence instead of throwing. */
function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Emails on the company's own domain (any TLD with the same label), lower-cased and de-duplicated. */
export function extractEmails(html: string, domain: string): string[] {
  const label = domainLabel(domain);
  const found = new Set<string>();
  const raw: string[] = [...(html.match(EMAIL) ?? [])];
  for (const m of html.matchAll(/data-cfemail="([0-9a-f]+)"/gi)) raw.push(decodeCfEmail(m[1]));
  for (const m of html.matchAll(/\/cdn-cgi\/l\/email-protection#([0-9a-f]+)/gi)) raw.push(decodeCfEmail(m[1]));
  for (const candidate of raw) {
    const email = safeDecode(candidate.replace(/^%20/, "")).toLowerCase().replace(/^[^a-z0-9]+/, "").replace(/\.+$/, "");
    const match = /^[a-z0-9._%+-]+@([a-z0-9.-]+\.[a-z]{2,})$/.exec(email);
    if (!match || ASSET_SUFFIX.test(email)) continue;
    if (domainLabel(match[1]) !== label) continue;
    found.add(email);
  }
  return [...found].sort();
}

/** Text segments between tags, scripts and styles removed, entities decoded, blanks dropped. */
export function textBlocks(html: string): string[] {
  const body = html.replace(/<script[\s\S]*?<\/script[^>]*>|<style[\s\S]*?<\/style[^>]*>|<noscript[\s\S]*?<\/noscript[^>]*>|<!--[\s\S]*?-->/gi, " ");
  return body
    .split(/<[^>]+>/)
    .map((s) => decodeEntities(s).replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function normaliseRole(text: string): string {
  const m = ROLE_RE.exec(text);
  if (!m) return "";
  const hit = m[1].toLowerCase().replace(/[- ]/g, "");
  return ROLE_WORDS.find((r) => r.toLowerCase().replace(/[- ]/g, "") === hit) ?? m[1];
}

/**
 * Names paired with a role in the same short block ("Qaiser Bajwa, CEO") or in adjacent blocks
 * (a heading with the name, then a line with the role). Never across free-running sentences.
 */
export function extractRolePeople(html: string, url: string): Person[] {
  const blocks = textBlocks(html);
  const people: Person[] = [];
  const add = (rawName: string, role: string) => {
    const cleaned = cleanPersonName(rawName);
    if (!cleaned || !role) return;
    if (people.some((p) => p.name === cleaned.name)) return;
    people.push({ name: cleaned.name, role, url, via: "role-block", doctor: cleaned.doctor });
  };
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.length > 80) continue;
    const role = normaliseRole(block);
    if (!role) continue;
    const m = ROLE_RE.exec(block)!;
    const before = block.slice(0, m.index).replace(/[\s,|:–(-]+$/, "");
    const after = block.slice(m.index + m[0].length).replace(/^[\s,|:–)&-]+/, "");
    if (before) add(before, role);
    else if (after && cleanPersonName(after)) add(after, role);
    else {
      // The role sits alone in its block: the name is the nearest short block before or after.
      for (const j of [i - 1, i + 1]) {
        const near = blocks[j];
        if (near && near.length <= 40 && cleanPersonName(near)) {
          add(near, role);
          break;
        }
      }
    }
  }
  return people;
}

type JsonLdNode = Record<string, unknown>;

function* walk(node: unknown): Generator<JsonLdNode> {
  if (Array.isArray(node)) for (const n of node) yield* walk(n);
  else if (node && typeof node === "object") {
    yield node as JsonLdNode;
    for (const value of Object.values(node)) if (value && typeof value === "object") yield* walk(value);
  }
}

/** Founders, employees and Person nodes with a job title, from schema.org JSON-LD. */
export function extractJsonLdPeople(html: string, url: string): Person[] {
  const people: Person[] = [];
  const push = (name: unknown, role: string) => {
    if (typeof name !== "string") return;
    const cleaned = cleanPersonName(name);
    if (!cleaned || people.some((p) => p.name === cleaned.name)) return;
    people.push({ name: cleaned.name, role, url, via: "json-ld", doctor: cleaned.doctor });
  };
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script[^>]*>/gi)) {
    let data: unknown;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    for (const node of walk(data)) {
      for (const f of [node.founder, node.founders].flat()) {
        if (f && typeof f === "object") push((f as JsonLdNode).name, "Founder");
        else push(f, "Founder");
      }
      const type = [node["@type"]].flat().map(String);
      if (type.includes("Person") && typeof node.jobTitle === "string") {
        const role = normaliseRole(node.jobTitle);
        if (role) push(node.name, role);
      }
    }
  }
  return people;
}

const LINK_HINT = /(team|about|leadership|founder|management|doctor|dentist|our-?people|who-?we-?are|contact|meet)/i;

/** Same-site links that probably lead to a team, about, doctors or contact page. */
export function extractTeamLinks(html: string, pageUrl: string, max = 8): string[] {
  const base = new URL(pageUrl);
  const host = base.hostname.replace(/^www\./, "");
  const out: string[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let target: URL;
    try {
      target = new URL(decodeEntities(m[1]), base);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(target.protocol)) continue;
    if (target.hostname.replace(/^www\./, "") !== host) continue;
    if (ASSET_SUFFIX.test(target.pathname) || /\.pdf$/i.test(target.pathname)) continue;
    const text = textBlocks(m[2]).join(" ");
    if (!LINK_HINT.test(target.pathname) && !LINK_HINT.test(text)) continue;
    target.hash = "";
    target.search = "";
    const href = target.toString();
    if (href === base.toString() || out.includes(href)) continue;
    out.push(href);
    if (out.length >= max) break;
  }
  return out;
}

/** Visible text length, used to decide whether a page needs a JavaScript render. */
export function visibleTextLength(html: string): number {
  return textBlocks(html).join(" ").length;
}
