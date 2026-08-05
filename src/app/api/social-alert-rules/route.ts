import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../auth/serverSession";
import type { SocialAlertRuleProvider, SocialAlertRuleUrgency } from "../../../domain";
import { auditLogsRepository, tenantScopeFromUser } from "../../../repositories/supabaseEnterpriseRepositories";
import { createSocialAlertRule, listSocialAlertRules, type CreateSocialAlertRuleInput } from "../../../repositories/socialAlertRulesRepository";

// A-96 (2026-08-04). organization_id/userId are derived from the authenticated server session --
// never accepted from the client.
const validProviders: SocialAlertRuleProvider[] = ["x", "facebook", "instagram", "linkedin", "threads", "rss", "manual", "demo"];
const validUrgencies: SocialAlertRuleUrgency[] = ["low", "medium", "high"];

export async function GET() {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const rules = await listSocialAlertRules(scope);
  return NextResponse.json({ rules });
}

type CreateRuleRequest = {
  provider?: string;
  keyword?: string;
  topic?: string;
  urgency?: string;
};

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as CreateRuleRequest;
  if (!body.provider || !validProviders.includes(body.provider as SocialAlertRuleProvider)) {
    return NextResponse.json({ error: `provider must be one of: ${validProviders.join(", ")}` }, { status: 400 });
  }
  if (!body.keyword?.trim()) return NextResponse.json({ error: "keyword is required." }, { status: 400 });
  if (!body.topic?.trim()) return NextResponse.json({ error: "topic is required." }, { status: 400 });
  if (body.urgency !== undefined && !validUrgencies.includes(body.urgency as SocialAlertRuleUrgency)) {
    return NextResponse.json({ error: `urgency must be one of: ${validUrgencies.join(", ")}` }, { status: 400 });
  }

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const input: CreateSocialAlertRuleInput = {
    provider: body.provider as SocialAlertRuleProvider,
    keyword: body.keyword.trim(),
    topic: body.topic.trim(),
    urgency: body.urgency as SocialAlertRuleUrgency | undefined,
  };

  const rule = await createSocialAlertRule(scope, input);
  await auditLogsRepository.record(scope, {
    action: "social_alert_rule.created",
    resourceType: "social_alert_rule",
    resourceId: rule.id,
    category: "governance",
    metadata: { provider: rule.provider, topic: rule.topic },
  }).catch(() => undefined);

  return NextResponse.json({ rule }, { status: 201 });
}
