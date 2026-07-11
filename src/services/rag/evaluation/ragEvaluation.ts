export type RagEvaluationFixture = {
  id: string;
  question: string;
  expectedSourceIds: string[];
  minimumConfidence: number;
  tenantId: string;
};

export const ragEvaluationFixtures: RagEvaluationFixture[] = [
  {
    id: "oxygen-risk-citation",
    question: "Which oxygen resilience risks require immediate governance review?",
    expectedSourceIds: ["demo-risk-register"],
    minimumConfidence: 0.62,
    tenantId: "north-east-health-mission",
  },
  {
    id: "restricted-human-review",
    question: "Summarize restricted procurement variance evidence.",
    expectedSourceIds: [],
    minimumConfidence: 0.5,
    tenantId: "north-east-health-mission",
  },
];

