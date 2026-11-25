// The versioned synthetic golden set (golden/v1) and the access oracle the gate judges leaks with.
// The oracle restates the documented access rules from the golden set alone. It deliberately does not
// call canRetrieveDocument or read the database: a gate that asked the code under test who may read a
// document could never notice that code being wrong.

export type GoldenRole = "Super Admin" | "Organization Admin" | "Manager" | "Employee" | "Guest";

export type GoldenTenant = { key: string; name: string; slug: string; sector: string };
export type GoldenUser = { key: string; tenant: string; role: GoldenRole };
export type GoldenDocument = {
  key: string;
  owner: string;
  visibility: "organization" | "private" | "team" | "shared";
  classification: "internal" | "restricted";
  title: string;
  body: string;
  archived?: boolean;
  sharedWith?: string[];
};
export type GoldenCorpus = {
  version: string;
  synthetic: boolean;
  tenants: GoldenTenant[];
  users: GoldenUser[];
  documents: GoldenDocument[];
};

export type GoldenCategory = "paraphrase" | "exact" | "no_answer" | "restricted_allowed" | "restricted_denied" | "cross_tenant";
export type GoldenQuestion = {
  id: string;
  category: GoldenCategory;
  user: string;
  question: string;
  relevant: string[];
  probes?: string[];
};
export type GoldenSet = { corpus: GoldenCorpus; questions: GoldenQuestion[] };

export type AccessVerdict = "allowed" | "cross_tenant" | "unauthorized";

const ELEVATED: GoldenRole[] = ["Super Admin", "Organization Admin", "Manager"];
const SEES_ALL_SHARED: GoldenRole[] = ["Super Admin", "Organization Admin"];

export function tenantOfDocument(corpus: GoldenCorpus, document: GoldenDocument) {
  const owner = corpus.users.find((user) => user.key === document.owner);
  if (!owner) throw new Error(`Document ${document.key} has no owner in the golden set.`);
  return owner.tenant;
}

export function accessVerdict(corpus: GoldenCorpus, user: GoldenUser, document: GoldenDocument): AccessVerdict {
  if (tenantOfDocument(corpus, document) !== user.tenant) return "cross_tenant";
  if (document.archived) return "unauthorized";
  const elevated = ELEVATED.includes(user.role);
  if (document.classification === "restricted" && !elevated) return "unauthorized";
  const isOwner = document.owner === user.key;
  switch (document.visibility) {
    case "private":
      return isOwner || user.role === "Super Admin" ? "allowed" : "unauthorized";
    case "team":
      return isOwner || elevated ? "allowed" : "unauthorized";
    case "shared":
      return isOwner || SEES_ALL_SHARED.includes(user.role) || document.sharedWith?.includes(user.key) ? "allowed" : "unauthorized";
    case "organization":
      return user.role === "Guest" ? "unauthorized" : "allowed";
  }
}

/** Every inconsistency in the golden set, as readable messages. Empty means usable. */
export function goldenSetProblems({ corpus, questions }: GoldenSet): string[] {
  const problems: string[] = [];
  const users = new Map(corpus.users.map((user) => [user.key, user]));
  const documents = new Map(corpus.documents.map((document) => [document.key, document]));
  const tenants = new Set(corpus.tenants.map((tenant) => tenant.key));

  if (!corpus.synthetic) problems.push("The corpus is not marked synthetic.");
  if (documents.size !== corpus.documents.length) problems.push("Document keys are not unique.");
  if (new Set(questions.map((question) => question.id)).size !== questions.length) problems.push("Question ids are not unique.");
  for (const user of corpus.users) if (!tenants.has(user.tenant)) problems.push(`${user.key} belongs to an unknown tenant.`);
  for (const document of corpus.documents) if (!users.has(document.owner)) problems.push(`${document.key} has an unknown owner.`);
  if (problems.length > 0) return problems;

  for (const question of questions) {
    const user = users.get(question.user);
    if (!user) {
      problems.push(`${question.id} is asked by an unknown user.`);
      continue;
    }
    for (const [list, shouldBeAllowed] of [[question.relevant, true], [question.probes ?? [], false]] as const) {
      for (const key of list) {
        const document = documents.get(key);
        if (!document) problems.push(`${question.id} names unknown document ${key}.`);
        else if ((accessVerdict(corpus, user, document) === "allowed") !== shouldBeAllowed) {
          problems.push(`${question.id}: ${question.user} should ${shouldBeAllowed ? "" : "not "}be able to read ${key}.`);
        }
      }
    }
    if (question.category === "no_answer" && question.relevant.length > 0) problems.push(`${question.id} is a no-answer question with an answer.`);
    if (["restricted_denied", "cross_tenant"].includes(question.category) && !question.probes?.length) problems.push(`${question.id} probes nothing.`);
  }
  return problems;
}
