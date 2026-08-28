import { Building2, Rocket, TerminalSquare, type LucideIcon } from "lucide-react";

// Extracted from BetaFeedbackModal.tsx (2026-08-27) so AXXESS Lite's own Help & Support tab can
// reuse the exact same three external surveys instead of resurrecting the inline rating/message
// form POST /api/beta-feedback replaced per A-116 (2026-08-14): "should have 3 links not this
// unempirical placeholder form." One list, not two that can drift out of sync.
export type SurveyLink = {
  key: "product" | "enterprise" | "technical";
  title: string;
  description: string;
  url: string;
  icon: LucideIcon;
};

export const surveyLinks: SurveyLink[] = [
  {
    key: "product",
    title: "Product Survey",
    description: "For anyone using AXXESS day to day -- what's working, what's confusing, what's missing.",
    url: "https://ap.surveymars.com/q/dWD9AHFnT",
    icon: Rocket,
  },
  {
    key: "enterprise",
    title: "Enterprise Survey",
    description: "For decision-makers evaluating AXXESS for a team or organization. We would love this from you.",
    url: "https://ap.surveymars.com/q/NAgaQ43fM",
    icon: Building2,
  },
  {
    key: "technical",
    title: "For Technical Surveyors",
    description: "For engineers and technical evaluators -- architecture, integrations, security, and governance depth.",
    url: "https://ap.surveymars.com/q/NnfK3fMgo",
    icon: TerminalSquare,
  },
];
