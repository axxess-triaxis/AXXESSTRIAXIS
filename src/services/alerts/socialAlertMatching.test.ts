import { describe, expect, it } from "vitest";
import { buildSocialAlertEventInput, matchMentionAgainstRules, type SocialAlertMentionCandidate } from "./socialAlertMatching";
import type { SocialAlertRule } from "../../domain";

function makeRule(overrides: Partial<SocialAlertRule>): SocialAlertRule {
  return {
    id: "rule-1",
    organizationId: "org-1",
    provider: "brand24",
    keyword: "oxygen",
    topic: "healthcare funding",
    urgency: "high",
    createdAt: "2026-08-17T00:00:00.000Z",
    ...overrides,
  };
}

function makeMention(overrides: Partial<SocialAlertMentionCandidate>): SocialAlertMentionCandidate {
  return {
    provider: "brand24",
    externalId: "mention-1",
    title: "District hospital reports oxygen shortage",
    sourceAccount: "@localnews",
    sentiment: "negative",
    receivedAt: "2026-08-17T08:00:00.000Z",
    ...overrides,
  };
}

describe("matchMentionAgainstRules", () => {
  it("matches a mention whose title contains the rule's keyword, case-insensitively", () => {
    const rule = makeRule({ keyword: "OXYGEN" });
    const mention = makeMention({ title: "Oxygen supply disrupted at district hospital" });

    const matches = matchMentionAgainstRules(mention, [rule]);

    expect(matches).toHaveLength(1);
    expect(matches[0].rule.id).toBe(rule.id);
  });

  it("matches against body text, not just title", () => {
    const rule = makeRule({ keyword: "cold-chain" });
    const mention = makeMention({ title: "Immunization update", body: "A cold-chain gap was flagged in the district report." });

    expect(matchMentionAgainstRules(mention, [rule])).toHaveLength(1);
  });

  it("does not match a rule for a different provider", () => {
    const rule = makeRule({ provider: "x" });
    const mention = makeMention({ provider: "brand24" });

    expect(matchMentionAgainstRules(mention, [rule])).toHaveLength(0);
  });

  it("does not match when the keyword is absent from the mention text", () => {
    const rule = makeRule({ keyword: "flood" });
    const mention = makeMention({ title: "Routine staffing update" });

    expect(matchMentionAgainstRules(mention, [rule])).toHaveLength(0);
  });

  it("returns one match per rule when a mention matches multiple rules", () => {
    const rules = [makeRule({ id: "rule-a", keyword: "oxygen" }), makeRule({ id: "rule-b", keyword: "hospital" })];
    const mention = makeMention({ title: "District hospital reports oxygen shortage" });

    const matches = matchMentionAgainstRules(mention, rules);

    expect(matches.map((match) => match.rule.id).sort()).toEqual(["rule-a", "rule-b"]);
  });
});

describe("buildSocialAlertEventInput", () => {
  it("carries the mention's own sentiment through untouched -- never classifies its own", () => {
    const rule = makeRule({});
    const mention = makeMention({ sentiment: "negative" });

    const input = buildSocialAlertEventInput({ rule, mention });

    expect(input.sentiment).toBe("negative");
    expect(input.urgency).toBe(rule.urgency);
    expect(input.ruleId).toBe(rule.id);
    expect(input.externalId).toBe(mention.externalId);
    expect(input.metadata).toMatchObject({ topic: rule.topic, matchedKeyword: rule.keyword });
  });
});
