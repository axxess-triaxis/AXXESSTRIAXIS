import type { SocialAlertEventSentiment, SocialAlertRule, SocialAlertRuleProvider } from "../../domain";

// Sprint 1 real Social Alerts (2026-08-17): social_alert_rules is real and tenant-settable, but
// nothing has ever evaluated incoming content against those rules -- this is that evaluation
// engine, built as pure functions (no I/O) so it's trivially testable and reusable by any future
// provider beyond Brand24. Matching is deliberately a simple case-insensitive substring match of
// rule.keyword against the mention's title+body -- not fuzzy/stemmed matching. This is the
// simplest, most predictable, easiest-to-explain-to-a-tenant-admin behavior, with no
// false-negative risk from tokenization edge cases. Known limitation, stated not hidden: no
// stemming, so a rule for "oxygen" will not match a mention containing only "oxygenation".

export type SocialAlertMentionCandidate = {
  provider: SocialAlertRuleProvider;
  externalId: string;
  title: string;
  body?: string;
  sourceAccount: string;
  sentiment: SocialAlertEventSentiment;
  receivedAt: string;
  url?: string;
  metadata?: Record<string, unknown>;
};

export type SocialAlertRuleMatch = {
  rule: SocialAlertRule;
  mention: SocialAlertMentionCandidate;
};

export function matchMentionAgainstRules(mention: SocialAlertMentionCandidate, rules: SocialAlertRule[]): SocialAlertRuleMatch[] {
  const haystack = `${mention.title} ${mention.body ?? ""}`.toLowerCase();
  return rules
    .filter((rule) => rule.provider === mention.provider)
    .filter((rule) => haystack.includes(rule.keyword.trim().toLowerCase()))
    .map((rule) => ({ rule, mention }));
}

export type NewSocialAlertEventInput = {
  organizationId: string;
  ruleId: string;
  provider: SocialAlertRuleProvider;
  title: string;
  sourceAccount: string;
  sentiment: SocialAlertEventSentiment;
  urgency: SocialAlertRule["urgency"];
  actionTargets: string[];
  receivedAt: string;
  externalId: string;
  metadata: Record<string, unknown>;
};

// sentiment is taken directly from the mention (Brand24's own per-mention field for this sprint's
// provider) -- this repo builds no sentiment classifier of its own.
export function buildSocialAlertEventInput(match: SocialAlertRuleMatch): NewSocialAlertEventInput {
  return {
    organizationId: match.rule.organizationId,
    ruleId: match.rule.id,
    provider: match.mention.provider,
    title: match.mention.title,
    sourceAccount: match.mention.sourceAccount,
    sentiment: match.mention.sentiment,
    urgency: match.rule.urgency,
    actionTargets: [],
    receivedAt: match.mention.receivedAt,
    externalId: match.mention.externalId,
    metadata: { topic: match.rule.topic, matchedKeyword: match.rule.keyword, ...match.mention.metadata },
  };
}
