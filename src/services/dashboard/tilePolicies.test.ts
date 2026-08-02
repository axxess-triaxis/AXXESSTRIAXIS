import { describe, expect, it } from "vitest";
import {
  aiTokenUsageSpendPolicy,
  approvalSlaRiskPolicy,
  auditLogGapPolicy,
  calendarTodayPolicy,
  crmFollowUpsDuePolicy,
  crmStalledLeadsPolicy,
  criticalSocialAlertsPolicy,
  documentIndexingHealthPolicy,
  financialAccountsActionablesPolicy,
  financialAccountsBelowThresholdPolicy,
  financialBudgetOvershootPolicy,
  financialBudgetThresholdsPolicy,
  integrationHealthPolicy,
  mailNeedingReplyPolicy,
  metaBusinessCampaignHealthPolicy,
  metaBusinessContentActivityPolicy,
  openLeadsPolicy,
  overdueMeetingsPolicy,
  overdueTasksPolicy,
  pendingAiReviewsPolicy,
  projectHealthPolicy,
  socialAlertsProviderGatedPolicy,
  socialProviderHealthPolicy,
  threadsActivityPolicy,
  threadsEngagementBacklogPolicy,
  upcomingMeetingsPolicy,
  workflowTimelineActivityPolicy,
} from "./tilePolicies";
import { computeScore } from "./tileScoring";

describe("overdueTasksPolicy", () => {
  it.each([
    [0, "green"],
    [1, "yellow"],
    [4, "orange"],
    [8, "amber"],
    [15, "red"],
  ] as const)("maps %i overdue tasks to %s", (count, criticality) => {
    expect(overdueTasksPolicy(count).criticality).toBe(criticality);
  });

  it("never returns a negative or zero priority", () => {
    for (const count of [0, 1, 5, 100]) {
      expect(overdueTasksPolicy(count).priority).toBeGreaterThanOrEqual(1);
      expect(overdueTasksPolicy(count).priority).toBeLessThanOrEqual(5);
    }
  });
});

describe("overdueMeetingsPolicy", () => {
  it.each([
    [0, "green"],
    [1, "yellow"],
    [2, "orange"],
    [5, "red"],
  ] as const)("maps %i missed meetings to %s", (count, criticality) => {
    expect(overdueMeetingsPolicy(count).criticality).toBe(criticality);
  });
});

describe("pendingAiReviewsPolicy", () => {
  it("escalates as the review queue grows", () => {
    const scores = [0, 1, 3, 8, 15].map((count) => {
      const result = pendingAiReviewsPolicy(count);
      return computeScore(result.priority, result.criticality);
    });
    for (let i = 1; i < scores.length; i += 1) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }
  });
});

describe("approvalSlaRiskPolicy", () => {
  it("reaches red criticality once pendingApprovals >= 20 (matches existing approvalRisk threshold)", () => {
    expect(approvalSlaRiskPolicy(20).criticality).toBe("red");
    expect(approvalSlaRiskPolicy(19).criticality).not.toBe("red");
  });
});

describe("auditLogGapPolicy", () => {
  it("flags amber when zero audit events exist, green otherwise", () => {
    expect(auditLogGapPolicy(0).criticality).toBe("amber");
    expect(auditLogGapPolicy(5).criticality).toBe("green");
  });
});

describe("documentIndexingHealthPolicy", () => {
  it("flags orange when no documents are indexed", () => {
    expect(documentIndexingHealthPolicy(0).criticality).toBe("orange");
    expect(documentIndexingHealthPolicy(10).criticality).toBe("green");
  });
});

describe("aiTokenUsageSpendPolicy", () => {
  it("reaches red once spend ratio hits or exceeds the budget", () => {
    expect(aiTokenUsageSpendPolicy(1).criticality).toBe("red");
    expect(aiTokenUsageSpendPolicy(0.1).criticality).toBe("green");
  });
});

describe("projectHealthPolicy", () => {
  it("returns green when no projects exist yet", () => {
    expect(projectHealthPolicy(0, 0).criticality).toBe("green");
  });

  it("escalates to red once the majority of projects are at risk", () => {
    expect(projectHealthPolicy(7, 10).criticality).toBe("red");
    expect(projectHealthPolicy(0, 10).criticality).toBe("green");
  });
});

describe("workflowTimelineActivityPolicy", () => {
  it("flags yellow when there has been no activity in 7 days", () => {
    expect(workflowTimelineActivityPolicy(0).criticality).toBe("yellow");
    expect(workflowTimelineActivityPolicy(3).criticality).toBe("green");
  });
});

describe("integrationHealthPolicy", () => {
  it("flags yellow when nothing is connected", () => {
    expect(integrationHealthPolicy(0).criticality).toBe("yellow");
    expect(integrationHealthPolicy(2).criticality).toBe("green");
  });
});

describe("socialAlertsProviderGatedPolicy", () => {
  it("flags yellow when no provider is connected", () => {
    expect(socialAlertsProviderGatedPolicy(false).criticality).toBe("yellow");
    expect(socialAlertsProviderGatedPolicy(true).criticality).toBe("green");
  });
});

// --- Executive Dashboard Redesign Sprint ED-R2 ---

describe("mailNeedingReplyPolicy", () => {
  it("returns green for zero mail needing reply", () => {
    expect(mailNeedingReplyPolicy(0, null).criticality).toBe("green");
  });

  it("stays yellow for a small, fresh backlog", () => {
    expect(mailNeedingReplyPolicy(1, 0).criticality).toBe("yellow");
  });

  it("escalates to amber at count>=3 even if fresh", () => {
    expect(mailNeedingReplyPolicy(3, 0).criticality).toBe("amber");
  });

  it("escalates to amber once the oldest message is older than 2 days, even with a small count", () => {
    expect(mailNeedingReplyPolicy(1, 3).criticality).toBe("amber");
  });

  it("escalates to red once count exceeds 5", () => {
    expect(mailNeedingReplyPolicy(6, 0).criticality).toBe("red");
  });

  it("escalates to red once the oldest message is older than 5 days, regardless of count (stale mail requiring escalation)", () => {
    expect(mailNeedingReplyPolicy(1, 6).criticality).toBe("red");
  });
});

describe("openLeadsPolicy", () => {
  it("is informational (green) regardless of count -- volume alone isn't a risk signal", () => {
    expect(openLeadsPolicy(0).criticality).toBe("green");
    expect(openLeadsPolicy(50).criticality).toBe("green");
  });
});

describe("crmFollowUpsDuePolicy", () => {
  it("escalates as overdue follow-ups accumulate (follow-up overdue = high priority)", () => {
    expect(crmFollowUpsDuePolicy(0).criticality).toBe("green");
    expect(crmFollowUpsDuePolicy(1).criticality).toBe("yellow");
    expect(crmFollowUpsDuePolicy(2).criticality).toBe("orange");
    expect(crmFollowUpsDuePolicy(4).criticality).toBe("red");
  });
});

describe("crmStalledLeadsPolicy", () => {
  it("flags amber then red as stalled opportunities accumulate", () => {
    expect(crmStalledLeadsPolicy(0).criticality).toBe("green");
    expect(crmStalledLeadsPolicy(1).criticality).toBe("amber");
    expect(crmStalledLeadsPolicy(3).criticality).toBe("red");
  });
});

describe("criticalSocialAlertsPolicy", () => {
  it("flags red once more than 2 unreviewed critical alerts exist", () => {
    expect(criticalSocialAlertsPolicy(0).criticality).toBe("green");
    expect(criticalSocialAlertsPolicy(1).criticality).toBe("amber");
    expect(criticalSocialAlertsPolicy(3).criticality).toBe("red");
  });
});

describe("socialProviderHealthPolicy", () => {
  it("flags yellow only when neither X nor Facebook is configured", () => {
    expect(socialProviderHealthPolicy(false, false).criticality).toBe("yellow");
    expect(socialProviderHealthPolicy(true, false).criticality).toBe("green");
    expect(socialProviderHealthPolicy(false, true).criticality).toBe("green");
  });
});

// --- Executive Dashboard Redesign Sprint ED-R3 ---

describe("calendarTodayPolicy", () => {
  it("is green with no meetings today", () => {
    expect(calendarTodayPolicy(0, false).criticality).toBe("green");
  });

  it("is elevated (yellow), not red, when a meeting starts within the hour", () => {
    const result = calendarTodayPolicy(2, true);
    expect(result.criticality).toBe("yellow");
    expect(result.criticality).not.toBe("red");
  });

  it("stays green for a normal day with meetings but none imminent", () => {
    expect(calendarTodayPolicy(3, false).criticality).toBe("green");
  });
});

describe("upcomingMeetingsPolicy", () => {
  it("is always informational (green), regardless of count", () => {
    expect(upcomingMeetingsPolicy(0).criticality).toBe("green");
    expect(upcomingMeetingsPolicy(10).criticality).toBe("green");
  });
});

describe("financialBudgetThresholdsPolicy", () => {
  it("is informational (green) regardless of count -- this tile just reports tracked-item volume", () => {
    expect(financialBudgetThresholdsPolicy(0).criticality).toBe("green");
    expect(financialBudgetThresholdsPolicy(5).criticality).toBe("green");
  });

  it("mentions manual tracking explicitly, never implying a bank connection", () => {
    expect(financialBudgetThresholdsPolicy(3).rationale.toLowerCase()).toContain("manually tracked");
  });
});

describe("financialBudgetOvershootPolicy", () => {
  it("escalates to amber then red as overshoot count grows (budget overshoot = amber/red based on gap)", () => {
    expect(financialBudgetOvershootPolicy(0).criticality).toBe("green");
    expect(financialBudgetOvershootPolicy(1).criticality).toBe("amber");
    expect(financialBudgetOvershootPolicy(2).criticality).toBe("red");
  });
});

describe("financialAccountsBelowThresholdPolicy", () => {
  it("escalates to amber then red as below-threshold accounts grow", () => {
    expect(financialAccountsBelowThresholdPolicy(0).criticality).toBe("green");
    expect(financialAccountsBelowThresholdPolicy(1).criticality).toBe("amber");
    expect(financialAccountsBelowThresholdPolicy(2).criticality).toBe("red");
  });

  it("mentions manual tracking explicitly, never 'bank connected'", () => {
    const rationale = financialAccountsBelowThresholdPolicy(1).rationale.toLowerCase();
    expect(rationale).toContain("manually tracked");
    expect(rationale).not.toContain("bank connected");
  });
});

describe("financialAccountsActionablesPolicy", () => {
  it("escalates priority by overdue age/count (due unresolved item = priority escalation by age)", () => {
    expect(financialAccountsActionablesPolicy(0, 0).criticality).toBe("green");
    expect(financialAccountsActionablesPolicy(2, 0).criticality).toBe("yellow");
    expect(financialAccountsActionablesPolicy(2, 1).criticality).toBe("amber");
    expect(financialAccountsActionablesPolicy(2, 2).criticality).toBe("red");
  });
});

describe("threadsActivityPolicy", () => {
  it("is green with any recent posting activity, yellow on silence", () => {
    expect(threadsActivityPolicy(0).criticality).toBe("yellow");
    expect(threadsActivityPolicy(3).criticality).toBe("green");
  });
});

describe("threadsEngagementBacklogPolicy", () => {
  it("escalates from green to yellow to amber as the open-reply backlog grows", () => {
    expect(threadsEngagementBacklogPolicy(0).criticality).toBe("green");
    expect(threadsEngagementBacklogPolicy(2).criticality).toBe("yellow");
    expect(threadsEngagementBacklogPolicy(4).criticality).toBe("amber");
  });
});

describe("metaBusinessContentActivityPolicy", () => {
  it("is green with recent content activity, yellow on silence -- operational Tier 2 signal, never above yellow", () => {
    expect(metaBusinessContentActivityPolicy(0).criticality).toBe("yellow");
    expect(metaBusinessContentActivityPolicy(2).criticality).toBe("green");
  });
});

describe("metaBusinessCampaignHealthPolicy", () => {
  it("stays green with no campaigns or all campaigns within budget, escalates only on real over-budget campaigns", () => {
    expect(metaBusinessCampaignHealthPolicy(0, 0).criticality).toBe("green");
    expect(metaBusinessCampaignHealthPolicy(3, 0).criticality).toBe("green");
    expect(metaBusinessCampaignHealthPolicy(3, 1).criticality).toBe("amber");
    expect(metaBusinessCampaignHealthPolicy(3, 2).criticality).toBe("red");
  });
});
