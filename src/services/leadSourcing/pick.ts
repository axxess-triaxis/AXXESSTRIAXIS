// Chooses one contact per company, guesses a personal address when only a role inbox is
// published, and verifies guesses with QEV under a credit cap.
import type { EmailVerification, VerifyReport } from "./types.ts";
import type { Candidate, Person, SiteResult } from "./types.ts";

const ROLE_LOCAL = /^(info|contact|hello|enquir(y|ies)|inquir(y|ies)|sales|admin|office|support|reception|bookings?|appointments?|team|mail|career|careers|jobs|hr|marketing|leads|customercare|care)\b/;

export function isRoleAddress(email: string): boolean {
  return ROLE_LOCAL.test(email.split("@")[0]);
}

const ROLE_RANK: Record<string, number> = {
  founder: 5,
  "co-founder": 5,
  cofounder: 5,
  ceo: 5,
  "chief executive officer": 5,
  "managing director": 5,
  owner: 5,
  proprietor: 5,
  "managing partner": 4,
  "principal dentist": 4,
  "chief dentist": 4,
  "medical director": 4,
  "clinical director": 3,
  chairman: 3,
  director: 3,
  partner: 2,
};

export const roleRank = (role: string) => ROLE_RANK[role.toLowerCase()] ?? 1;

/** The best person: a registry-named one first, then by role, then JSON-LD over text matches. */
export function bestPerson(site: SiteResult): Person | undefined {
  const people = [...site.people];
  if (site.seed.registryName) {
    people.unshift({ name: site.seed.registryName, role: site.seed.registryRole ?? "Owner", url: site.seed.source, via: "registry", doctor: false });
  }
  const viaRank = { registry: 3, "json-ld": 2, "role-block": 1 } as const;
  return people.sort((a, b) => roleRank(b.role) - roleRank(a.role) || viaRank[b.via] - viaRank[a.via])[0];
}

const ascii = (s: string) => s.normalize("NFKD").replace(/[^\x00-\x7F]/g, "").toLowerCase().replace(/[^a-z]/g, "");

/** first@, first.last@, firstlast@, f.last@ in that order (the most common business patterns). */
export function guessPatterns(name: string, domain: string): string[] {
  const tokens = name.split(" ").map(ascii).filter((t) => t.length > 1);
  if (tokens.length < 2) return [];
  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  return [...new Set([`${first}@${domain}`, `${first}.${last}@${domain}`, `${first}${last}@${domain}`, `${first[0]}.${last}@${domain}`])];
}

/** A published address whose local part contains the person's first or last name. */
export function publishedPersonal(site: SiteResult, person: Person): string | undefined {
  const tokens = person.name.split(" ").map(ascii).filter((t) => t.length > 2);
  return site.emails.map((e) => e.email).find((e) => !isRoleAddress(e) && tokens.some((t) => e.split("@")[0].includes(t)));
}

export type Verifier = (emails: string[]) => Promise<VerifyReport>;

export type Budget = { remaining: number; spent: number };

/**
 * Tries guessed addresses one at a time and stops at the first "keep". Stops early when the
 * domain accepts every address (accept_all), since no guess can then be confirmed.
 */
export async function verifyGuess(name: string, domain: string, verify: Verifier, budget: Budget): Promise<{ email?: string; tried: EmailVerification[] }> {
  const tried: EmailVerification[] = [];
  for (const guess of guessPatterns(name, domain)) {
    if (budget.remaining <= 0) break;
    budget.remaining--;
    budget.spent++;
    const [result] = (await verify([guess])).results;
    if (!result) break;
    tried.push(result);
    if (result.decision === "keep") return { email: guess, tried };
    if (result.reason === "accept_all") break;
  }
  return { tried };
}

/** Mail domain to guess on: the domain of a published address if there is one, else the site. */
export function mailDomain(site: SiteResult): string {
  return site.emails[0]?.email.split("@")[1] ?? site.domain;
}

export type PickOptions = { verify?: Verifier; budget?: Budget; date: string };

export async function pickCandidate(site: SiteResult, options: PickOptions): Promise<Candidate | undefined> {
  const person = bestPerson(site);
  if (!person) return undefined;
  const evidence = [`${person.role} named on ${person.via === "registry" ? person.url : person.url} (${person.via})`];
  if (person.doctor) evidence.push("site writes Dr. before the name");
  let score = roleRank(person.role) * 10;
  const base = { seed: site.seed, contactName: person.name, role: person.role };

  const personal = publishedPersonal(site, person);
  if (personal) {
    const where = site.emails.find((e) => e.email === personal)!.url;
    return { ...base, email: personal, emailKind: "published-personal", score: score + 30, evidence: [...evidence, `email published on ${where}`] };
  }
  if (options.verify && options.budget) {
    const { email, tried } = await verifyGuess(person.name, mailDomain(site), options.verify, options.budget);
    if (email) return { ...base, email, emailKind: "guessed", verified: "keep", score: score + 25, evidence: [...evidence, `guessed address confirmed by mail server (QEV keep, ${tried.length} tried)`] };
    if (tried.length) evidence.push(`guesses not confirmed: ${tried.map((t) => `${t.email} ${t.decision}`).join("; ")}`);
  }
  const role = site.emails.find((e) => isRoleAddress(e.email));
  if (!role) return undefined;
  score += 10;
  return { ...base, email: role.email, emailKind: "published-role", score, evidence: [...evidence, `role inbox published on ${role.url}`] };
}
