import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { EnterpriseWorkflowJourney } from "../../components/enterprise/EnterpriseWorkflowJourney";
import { AgenticActionablesPrompt } from "../../components/agentic/AgenticActionablesPrompt";
import {
  AGENTIC_ROUTE_CAVEAT,
  AGENTIC_ROUTE_FOR_ACTION,
  AGENTIC_UNAVAILABLE_ACTIONS,
  type AgenticGateResult,
  type AgenticPromptSource,
  type AgenticResolution,
} from "../../components/agentic/agenticActionTypes";
import { evaluateActionableGate } from "../../services/agentic/actionableGate";
import { writeAgenticDraft } from "../../services/agentic/agenticDraftHandoff";
import { isAgenticGateEnabled } from "../../services/agentic/agenticGateToggle";
import { useWorkspaceRouting } from "../../hooks/useWorkspaceRouting";
import { getRuntimeMode, isDemoModeEnabled } from "../../demo/demoMode";
import {
  AuditTrailBadge,
  ConfidenceBadge,
  DataStateBadge,
  DemoDataNotice,
  EmptyState,
  HumanReviewBadge,
  ModuleHeader,
  PageShell,
  TenantScopeBadge,
} from "../../components/enterprise";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { useEnterpriseGoldenPath } from "../../hooks/useEnterpriseGoldenPath";
import { useGoldenPathDisplayMode } from "../../hooks/useGoldenPathDisplayMode";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { useAnalytics } from "../../services/analytics";
import { languageCoverage } from "../../services/nlp/modelRegistry";
import { answerWithGovernedRag, type RagAnswer } from "../../services/rag/governedRag";
import { summarizeConfidenceExplanation } from "../../services/rag/confidenceExplanation";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  FileText,
  FolderKanban,
  Paperclip,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
} from "lucide-react";

type AiRouterProviderStatus = { name: string; displayName: string; configured: boolean; status: string };
type AiRouterStatus = { mode: string; defaultProvider: string; configuredCount: number; providers: AiRouterProviderStatus[] };

// Illustrative content for the investor-demo experience only -- gated behind isDemoModeEnabled()
// everywhere it's used. A real tenant must never see this presented as a live AI answer.
// See DEMO_DATA_LEAKAGE_AUDIT.md.
const fallbackRagAnswer: RagAnswer = {
  answer: "District evidence indicates the highest current operational exposure sits in oxygen resilience, maternal referral handoff, and pharmacy stockout variance. Escalation should prioritize Dibrugarh biomedical maintenance, Cachar referral transfer turnaround, and Dhubri stock reconciliation before the next Mission Secretariat review.",
  confidence: 0.87,
  humanReviewRequired: false,
  keywords: ["oxygen", "maternal", "stockout", "district", "variance"],
  rationale: "Synthesized from 3 governed sources (top match: \"Dibrugarh Risk Register - Oxygen Resilience\", 91% relevance).",
  confidenceExplanation: {
    sourceMatchStrength: 0.91,
    relevantChunkCount: 3,
    sourceAuthorizationStatus: "fully_authorized",
    citationCoverage: 1,
    answerMode: "local_extractive_summary",
    humanReviewRequired: false,
  },
  sources: [
    {
      sourceType: "document",
      sourceId: "demo-risk-register",
      title: "Dibrugarh Risk Register - Oxygen Resilience",
      score: 0.91,
      excerpt: "Biomedical maintenance variance remains the leading oxygen resilience risk for Dibrugarh and adjoining referral corridors.",
    },
    {
      sourceType: "document",
      sourceId: "demo-maternal-review",
      title: "Cachar District Review Note - Maternal Referral",
      score: 0.84,
      excerpt: "Referral handoff documentation shows transport coordination gaps during night escalation windows.",
    },
    {
      sourceType: "knowledge-article",
      sourceId: "demo-stockout-article",
      title: "District Stockout Mitigation Playbook",
      score: 0.79,
      excerpt: "Stock reconciliation should be reviewed weekly where block facilities cross the threshold for essential medicines.",
    },
  ],
};

// Honest "no answer yet" state for real tenants -- used instead of fallbackRagAnswer wherever a
// live answer hasn't been generated yet or a query failed.
const emptyRagAnswer: RagAnswer = {
  answer: "",
  confidence: 0,
  humanReviewRequired: false,
  keywords: [],
  rationale: "",
  sources: [],
  confidenceExplanation: {
    sourceMatchStrength: 0,
    relevantChunkCount: 0,
    sourceAuthorizationStatus: "fully_authorized",
    citationCoverage: 0,
    answerMode: "no_authorized_source",
    humanReviewRequired: false,
  },
};

function initialRagAnswer(): RagAnswer {
  return isDemoModeEnabled() ? fallbackRagAnswer : emptyRagAnswer;
}

type LiveRagAnswer = RagAnswer & {
  aiOutputAuditId?: string;
  modelUsed?: string;
  providerUsed?: string;
  latencyMs?: number;
  costTier?: string;
};

export const AIWorkspaceSection = () => {
  const { session } = useAuth();
  const analytics = useAnalytics();
  const { navigateToSection } = useWorkspaceRouting();
  const tenantScope = useMemo(() => session.user ? tenantScopeFromUser(session.user) : undefined, [session.user]);
  const enterpriseJourney = useEnterpriseGoldenPath(tenantScope, session.user);
  const goldenPathDisplayMode = useGoldenPathDisplayMode();
  const [input, setInput] = useState("");
  const [approved, setApproved] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [ragAnswer, setRagAnswer] = useState<LiveRagAnswer>(() => initialRagAnswer());
  const [routerStatus, setRouterStatus] = useState<AiRouterStatus | null>(null);
  const [agenticPrompt, setAgenticPrompt] = useState<{ gateContext?: AgenticGateResult; source: AgenticPromptSource } | null>(null);
  const [agenticMessage, setAgenticMessage] = useState<string | null>(null);
  const priorSourceIdsRef = useRef<Set<string>>(new Set());
  const isFirstAnswerRef = useRef(true);
  const knownStakeholderNamesRef = useRef<string[]>([]);
  const firstName = session.user?.displayName?.trim().split(/\s+/)[0] || "there";

  // Loaded once per tenant so the gate's "new stakeholder" heuristic (actionableGate.ts) has a
  // real name list to compare against, not a guess -- fails silently to an empty list rather than
  // blocking the AI Workspace on a stakeholder-list fetch.
  useEffect(() => {
    if (!tenantScope) return;
    let isMounted = true;
    applicationServices.stakeholdersRepository.list(tenantScope, { pageSize: 200 })
      .then((stakeholders) => {
        if (isMounted) knownStakeholderNamesRef.current = stakeholders.map((stakeholder) => stakeholder.name);
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, [tenantScope]);

  // 2026-07-30: this used to call getAiRouterStatusSnapshot() directly at module load -- a server
  // function reading process.env.OPENAI_API_KEY etc. -- but this component runs client-side, where
  // non-NEXT_PUBLIC_ env vars are never available (stripped at build time). It always reported
  // every remote provider "missing_credentials" and mode "demo" regardless of real production
  // configuration. GET /api/ai/model-policy already computes this server-side and already exists
  // (used elsewhere for AI policy preview) -- fetching it here is the fix, not new infrastructure.
  useEffect(() => {
    if (!session.user) return;
    let isMounted = true;
    fetch("/api/ai/model-policy", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { router?: AiRouterStatus } | null) => {
        if (isMounted && data?.router) setRouterStatus(data.router);
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, [session.user]);

  useEffect(() => {
    // TP-2 (2026-07-28): this used to fire unconditionally for every tenant, running a
    // demo-institution-specific sample question against that tenant's own real RAG pipeline on
    // every AI Workspace load -- pointless (and potentially confusing if it ever matched a real
    // document) for a live tenant with no connection to "North East Health Mission." Restricted to
    // demo mode, where this sample question is a deliberate, meaningful showcase against the
    // seeded dataset; a real tenant now starts from a genuinely empty state and asks its own
    // question.
    if (!tenantScope || getRuntimeMode(Boolean(session.user)) !== "demo") return;

    let isMounted = true;
    void answerWithGovernedRag(applicationServices, tenantScope, {
      question: "Which North East Health Mission district risks need immediate governance attention for oxygen resilience, maternal referrals, stockouts, and budget variance?",
      limit: 4,
    })
      .then((answer) => {
        if (isMounted && answer.sources.length > 0) setRagAnswer(answer);
      })
      .catch(() => {
        if (isMounted) setRagAnswer(initialRagAnswer());
      });

    return () => {
      isMounted = false;
    };
  }, [tenantScope, session.user]);

  const QUERY_TIMEOUT_MS = 20_000;

  async function askGovernedQuestion(overrideQuestion?: string) {
    const question = (overrideQuestion ?? input).trim();
    if (!question) return;

    setQuerying(true);
    setQueryError(null);
    setReviewMessage(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);
    try {
      const response = await fetch("/api/rag/query", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, limit: 5 }),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => ({} as { error?: string }));
      // Never surface the raw backend error string to the user (Sprint 3, F-016) -- log the detail
      // for developer diagnostics and throw a fixed, safe message instead.
      if (!response.ok) {
        console.error("Governed RAG query failed.", response.status, result.error);
        if (response.status === 401) throw new Error("Sign in to ask AXXESS a governed question.");
        if (response.status === 403) throw new Error("Your role does not have permission to ask governed questions.");
        throw new Error("AXXESS could not complete the governed question.");
      }
      setRagAnswer(result as LiveRagAnswer);
      setInput("");
      setApproved(false);
      analytics.trackEvent("rag_query_submitted", { source_count: (result as LiveRagAnswer).sources?.length ?? 0 }, {
        organization_id: session.user?.organizationId,
        user_id: session.user?.id,
        user_role: session.user?.role,
        module_name: "ai-workspace",
        route: "/ai-workspace",
      });
      analytics.trackEvent("rag_answer_generated", {
        source_count: (result as LiveRagAnswer).sources?.length ?? 0,
        confidence: (result as LiveRagAnswer).confidence ?? null,
        human_review_required: (result as LiveRagAnswer).humanReviewRequired ?? null,
      }, {
        organization_id: session.user?.organizationId,
        user_id: session.user?.id,
        user_role: session.user?.role,
        module_name: "ai-workspace",
        route: "/ai-workspace",
      });

      maybeOpenAgenticPrompt(result as LiveRagAnswer);
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      setQueryError(
        timedOut
          ? "This is taking longer than usual. You can retry the same question."
          : error instanceof Error
            ? error.message
            : "AXXESS could not complete the governed question.",
      );
    } finally {
      clearTimeout(timeout);
      setQuerying(false);
    }
  }

  function agenticSourceFromAnswer(answer: LiveRagAnswer): AgenticPromptSource {
    return {
      sourceType: "rag_answer",
      summary: answer.answer.length > 240 ? `${answer.answer.slice(0, 237)}...` : answer.answer,
      citations: answer.sources.map((source) => ({ sourceId: source.sourceId, title: source.title })),
      aiOutputAuditId: answer.aiOutputAuditId,
      humanReviewRequired: answer.humanReviewRequired,
    };
  }

  function openAgenticPrompt(answer: LiveRagAnswer, gateContext?: ReturnType<typeof evaluateActionableGate>) {
    setAgenticMessage(null);
    setAgenticPrompt({ gateContext, source: agenticSourceFromAnswer(answer) });
    analytics.trackEvent("agentic_prompt_shown", { source_type: "rag_answer", triggered_by: gateContext ? "gate" : "manual" }, {
      organization_id: session.user?.organizationId,
      user_id: session.user?.id,
      user_role: session.user?.role,
      module_name: "ai-workspace",
      route: "/ai-workspace",
    });
  }

  // Auto-opens the two-step actionables prompt only when the heuristic gate (actionableGate.ts)
  // finds at least one real signal in the just-generated answer -- never for the demo seed answer,
  // and never at all when the user has turned the gate off in Settings (the manual "Create
  // actionable from answer" button in the header still works regardless of this toggle).
  function maybeOpenAgenticPrompt(answer: LiveRagAnswer) {
    if (!isAgenticGateEnabled()) return;

    const gateResult = evaluateActionableGate({
      answer,
      knownStakeholderNames: knownStakeholderNamesRef.current,
      priorSourceIds: priorSourceIdsRef.current,
      isFirstAnswerThisSession: isFirstAnswerRef.current,
    });

    isFirstAnswerRef.current = false;
    answer.sources.forEach((source) => priorSourceIdsRef.current.add(source.sourceId));

    analytics.trackEvent("agentic_gate_evaluated", {
      trigger_count: gateResult.triggerCount,
      show_prompt: gateResult.showPrompt,
      override_required: gateResult.overrideRequired,
      compulsory_choice: gateResult.compulsoryChoice,
      pushback_severity: gateResult.signals.pushbackSeverity,
    }, {
      organization_id: session.user?.organizationId,
      user_id: session.user?.id,
      user_role: session.user?.role,
      module_name: "ai-workspace",
      route: "/ai-workspace",
    });

    if (gateResult.showPrompt) openAgenticPrompt(answer, gateResult);
  }

  function resolveAgenticPrompt(resolution: AgenticResolution) {
    setAgenticPrompt(null);

    const context = {
      organization_id: session.user?.organizationId,
      user_id: session.user?.id,
      user_role: session.user?.role,
      module_name: "ai-workspace",
      route: "/ai-workspace",
    };

    if (resolution.dismissedVia === "gate_required_no_action_now" || resolution.dismissedVia === "gate_required_no_action_required") {
      analytics.trackEvent("agentic_dismissed_via_gate_override", { resolution: resolution.dismissedVia }, context);
      return;
    }

    if (resolution.dismissedVia === "nothing_option") return;

    analytics.trackEvent("agentic_first_option_selected", { action: resolution.firstAction }, context);
    if (resolution.secondStep) analytics.trackEvent("agentic_second_step_selected", { action: resolution.firstAction, second_step: resolution.secondStep }, context);

    if (resolution.dismissedVia === "unavailable_action") {
      analytics.trackEvent("agentic_disabled_action_attempted", { action: resolution.firstAction }, context);
      setAgenticMessage(AGENTIC_UNAVAILABLE_ACTIONS[resolution.firstAction] ?? "This isn't available yet.");
      return;
    }

    if (resolution.firstAction === "integrate_next_query") {
      if (resolution.secondStep === "yes") {
        setInput((current) => current ? `${current}\n\n${ragAnswer.answer}` : ragAnswer.answer);
        analytics.trackEvent("agentic_route_chosen", { action: resolution.firstAction, destination: "ai-workspace" }, context);
      }
      return;
    }

    if (resolution.firstAction === "other") {
      setAgenticMessage(`Noted: "${resolution.otherInstruction}". This isn't automated yet, but it's logged.`);
      return;
    }

    const destination = AGENTIC_ROUTE_FOR_ACTION[resolution.firstAction];
    if (!destination) {
      setAgenticMessage(AGENTIC_UNAVAILABLE_ACTIONS[resolution.firstAction] ?? "This isn't available yet.");
      return;
    }

    writeAgenticDraft({
      actionType: resolution.firstAction,
      secondStep: resolution.secondStep,
      summary: ragAnswer.answer,
      citations: ragAnswer.sources.map((source) => ({ sourceId: source.sourceId, title: source.title })),
      sourceType: "rag_answer",
      createdAt: new Date().toISOString(),
    });
    analytics.trackEvent("agentic_route_chosen", { action: resolution.firstAction, destination }, context);
    if (AGENTIC_ROUTE_CAVEAT[resolution.firstAction]) setAgenticMessage(AGENTIC_ROUTE_CAVEAT[resolution.firstAction] ?? null);
    navigateToSection(destination);
  }

  async function reviewAnswer(decision: "approved" | "rejected") {
    if (!ragAnswer.aiOutputAuditId) {
      setReviewMessage("This answer was generated from local demo context and has no live audit id to review.");
      return;
    }

    setReviewing(true);
    setReviewMessage(null);
    try {
      const response = await fetch("/api/rag/review", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiOutputAuditId: ragAnswer.aiOutputAuditId,
          decision,
          createTask: decision === "approved",
          taskTitle: "Review and execute governed AXXESS recommendation",
          notes: decision === "approved" ? "Approved from AI Workspace with cited sources." : "Rejected from AI Workspace pending revision.",
        }),
      });
      const result = await response.json().catch(() => ({} as { error?: string; task?: { id?: string } }));
      if (!response.ok) {
        console.error("RAG review decision failed.", response.status, result.error);
        if (response.status === 401) throw new Error("Sign in to record this review decision.");
        if (response.status === 403) throw new Error("Your role does not have permission to record this decision.");
        throw new Error("Review could not be recorded.");
      }
      setApproved(decision === "approved");
      setReviewMessage(decision === "approved" ? `Approved and audit logged${result.task?.id ? " with a follow-up task." : "."}` : "Rejected and audit logged.");
    } catch (error) {
      setReviewMessage(error instanceof Error ? error.message : "Review could not be recorded.");
    } finally {
      setReviewing(false);
    }
  }

  const demoMode = isDemoModeEnabled();
  // Read fresh on every render rather than caching a module-level snapshot at import time --
  // a module constant would evaluate isDemoModeEnabled() exactly once for the module's whole
  // lifetime, which on the client (SPA navigation, no full reload) can permanently freeze the
  // demo fixture thread in memory even after the session switches to a real, non-demo tenant.
  const aiMessages = applicationServices.institutionalRepository.getAiMessages();

  return (
    <PageShell className="h-full flex flex-col">
      <ModuleHeader
        title="AI Workspace"
        eyebrow="Governed Institutional Intelligence"
        description="Ask questions across tenant-scoped documents, projects, approvals, stakeholders, and audit history with citations, confidence, routing status, and human review."
        badges={[
          <TenantScopeBadge key="tenant" />,
          <DataStateBadge key="demo" state={demoMode ? "Demo" : "Live"} />,
          <DataStateBadge key="provider" state="Provider-gated" />,
          <HumanReviewBadge key="review" required={ragAnswer.humanReviewRequired} />,
        ]}
        actions={
          <>
            <a href="/ai-workspace/review-inbox" className="rounded-lg border border-[rgba(15,17,23,0.1)] px-3 py-2 text-xs font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]">Review inbox</a>
            <button
              type="button"
              disabled={!ragAnswer.answer}
              onClick={() => openAgenticPrompt(ragAnswer)}
              className="rounded-lg border border-[rgba(15,17,23,0.1)] px-3 py-2 text-xs font-semibold text-[#5F6B73] hover:bg-[#F2F3F5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Create actionable from answer
            </button>
            <a href="/approvals" className="rounded-lg border border-[rgba(15,17,23,0.1)] px-3 py-2 text-xs font-semibold text-white bg-[#8B1E2D] hover:bg-[#7a1a27]">Request approval</a>
          </>
        }
      />
      {demoMode && (
        <DemoDataNotice label="AI answers use governed demo context, cited sources, confidence signals, and audit preview records when provider keys are not configured." />
      )}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        <div className="lg:col-span-2 flex flex-col">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(0,0,0,0.06)]">
              <div className="w-8 h-8 bg-[#8B1E2D] rounded-lg flex items-center justify-center">
                <Sparkles size={14} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#0F1117]">AXXESS Intelligence Engine</div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#5F6B73]">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  {demoMode
                    ? "Active - 2,200 documents indexed - Permission-aware retrieval"
                    : "Active - Permission-aware retrieval over tenant-scoped sources"}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {["RAG", "Multilingual", "Human Review"].map((cap) => (
                  <span key={cap} className="text-[10px] font-medium bg-[#8B1E2D]/8 text-[#8B1E2D] px-2 py-0.5 rounded-full border border-[#8B1E2D]/15">
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:hidden">
              {aiMessages.length === 0 && (
                <EmptyState
                  title="No conversation history yet"
                  message="Ask a governed question below to start building this tenant's AI workspace history."
                />
              )}
              {aiMessages.map((msg, i) => (
                <div key={i}>
                  {msg.role === "user" ? (
                    <div className="flex items-start gap-3 justify-end">
                      <div className="bg-[#0F1117] text-white text-sm rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] leading-relaxed">
                        {msg.content}
                      </div>
                      <Avatar initials={session.user?.avatarInitials ?? "AR"} size="sm" color="bg-[#2C4A7C]" />
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 bg-[#8B1E2D] rounded-full flex items-center justify-center flex-shrink-0">
                        <Sparkles size={12} className="text-white" />
                      </div>
                      <div className="flex-1 max-w-[85%]">
                        {msg.toolUsed && (
                          <div className="flex items-center gap-1.5 text-[10px] text-[#5F6B73] mb-2 font-mono">
                            <Terminal size={10} />
                            {msg.toolUsed}
                          </div>
                        )}
                        <div className="bg-[#F8F9FA] border border-[rgba(0,0,0,0.06)] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-[#0F1117] leading-relaxed whitespace-pre-line">
                          {msg.content}
                        </div>
                        {msg.requiresApproval && !approved && (
                          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield size={13} className="text-amber-600" />
                              <span className="text-xs font-semibold text-amber-700">Human-in-the-Loop Review Required</span>
                            </div>
                            <div className="bg-white border border-amber-100 rounded-lg p-2.5 mb-3 text-[11px] text-[#5F6B73] font-mono leading-relaxed">
                              {msg.draftPreview}
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setApproved(true)} className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5">
                                <Check size={11} /> Approve & Send
                              </button>
                              <button className="text-xs bg-white border border-[rgba(0,0,0,0.1)] text-[#0F1117] px-3 py-1.5 rounded-lg hover:bg-[#F2F3F5] transition-colors">
                                Edit Draft
                              </button>
                              <button className="text-xs text-red-600 hover:text-red-700 px-2 py-1.5">
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                        {msg.requiresApproval && approved && (
                          <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span className="text-xs text-emerald-700 font-medium">Briefing note routed to the Mission Secretariat - audit logged</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 bg-[#8B1E2D] rounded-full flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={12} className="text-white" />
                </div>
                <div className="flex-1 max-w-[85%]">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#5F6B73] mb-2 font-mono">
                    <Terminal size={10} />
                    Governed RAG - citations - tenant permissions
                  </div>
                  {ragAnswer.answer ? (
                    <>
                      <div className="bg-[#F8F9FA] border border-[rgba(0,0,0,0.06)] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-[#0F1117] leading-relaxed">
                        {ragAnswer.answer}
                      </div>
                      {ragAnswer.rationale && (
                        <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-[#5F6B73]">
                          <Terminal size={11} className="mt-0.5 flex-shrink-0 text-[#8B1E2D]" />
                          {ragAnswer.rationale}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
                        <ConfidenceBadge score={ragAnswer.confidence} />
                        <HumanReviewBadge required={ragAnswer.humanReviewRequired} />
                        {ragAnswer.aiOutputAuditId && <AuditTrailBadge eventId={ragAnswer.aiOutputAuditId} />}
                        {ragAnswer.providerUsed && <span className="rounded-full bg-[#F2F3F5] px-2 py-0.5 text-[10px] font-semibold text-[#5F6B73]">{ragAnswer.providerUsed} - {ragAnswer.costTier ?? "cost logged"}</span>}
                      </div>
                      {ragAnswer.confidenceExplanation && (
                        <p className="mt-1 text-[10px] leading-relaxed text-[#5F6B73]">
                          Why this score: {summarizeConfidenceExplanation(ragAnswer.confidenceExplanation)}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button onClick={() => void reviewAnswer("approved")} disabled={reviewing || !ragAnswer.aiOutputAuditId} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                          {reviewing ? "Recording..." : "Approve action"}
                        </button>
                        <button onClick={() => void reviewAnswer("rejected")} disabled={reviewing || !ragAnswer.aiOutputAuditId} className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F1117] hover:bg-[#F2F3F5] disabled:cursor-not-allowed disabled:opacity-60">
                          Reject
                        </button>
                        {reviewMessage && <span className="text-[11px] font-medium text-[#5F6B73]">{reviewMessage}</span>}
                      </div>
                    </>
                  ) : (
                    <div className="bg-[#F8F9FA] border border-dashed border-[rgba(0,0,0,0.08)] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-[#5F6B73]">
                      Ask a question above to see a governed, cited answer here.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {[
                  "Summarize operational risk",
                  "Find pending approvals",
                  "Draft stakeholder brief",
                  "Compare district performance",
                  "Identify missing documents",
                  "Generate board note",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={querying}
                    onClick={() => { setInput(suggestion); void askGovernedQuestion(suggestion); }}
                    className="text-[11px] text-[#5F6B73] border border-[rgba(0,0,0,0.1)] px-2.5 py-1 rounded-full hover:border-[#8B1E2D] hover:text-[#8B1E2D] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 bg-[#F2F3F5] rounded-xl px-3 py-2.5 border border-transparent focus-within:border-[#8B1E2D]/30 focus-within:bg-white transition-all">
                <Paperclip size={14} className="text-[#5F6B73]" />
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void askGovernedQuestion();
                    }
                  }}
                  placeholder="Ask AXXESS about portfolios, approvals, risks, or cited institutional documents"
                  className="flex-1 bg-transparent text-sm text-[#0F1117] placeholder:text-[#5F6B73] outline-none"
                />
                <button type="button" aria-label="Send governed question" onClick={() => void askGovernedQuestion()} disabled={querying} className="w-7 h-7 bg-[#8B1E2D] rounded-lg flex items-center justify-center hover:bg-[#7a1a27] transition-colors disabled:cursor-not-allowed disabled:opacity-60">
                  <Send size={12} className="text-white" />
                </button>
              </div>
              {querying && (
                <p className="mt-2 flex items-center gap-2 text-[11px] text-[#5F6B73]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8B1E2D]" />
                  Generating governed answer&hellip; usually takes 5&ndash;8 seconds
                </p>
              )}
              {!querying && queryError && (
                <p className="mt-2 flex items-center gap-2 text-[11px] font-medium text-[#8B1E2D]">
                  {queryError}
                  <button type="button" onClick={() => void askGovernedQuestion()} className="underline hover:no-underline">
                    Retry
                  </button>
                </p>
              )}
              {agenticMessage && (
                <p className="mt-2 text-[11px] font-medium text-[#5F6B73]">{agenticMessage}</p>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#0F1117]">AI Router</h3>
            {routerStatus ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Mode", routerStatus.mode],
                    ["Default", routerStatus.defaultProvider],
                    ["Remote", routerStatus.configuredCount],
                    ["Providers", routerStatus.providers.length],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-[#F8F9FA] p-2">
                      <div className="font-mono text-[10px] uppercase text-[#5F6B73]">{label}</div>
                      <div className="mt-1 text-sm font-semibold text-[#0F1117]">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-1.5">
                  {routerStatus.providers.slice(0, 4).map((provider) => (
                    <div key={provider.name} className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-[#0F1117]">{provider.displayName}</span>
                      <span className={provider.configured ? "text-emerald-700" : "text-[#5F6B73]"}>{provider.status}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[11px] text-[#5F6B73]">Loading real router status&hellip;</p>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#0F1117]">Language Coverage</h3>
            <div className="space-y-1.5">
              {languageCoverage.slice(0, 5).map((coverage) => (
                <div key={coverage.language} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-medium text-[#0F1117]">{coverage.language}</span>
                  <span className="rounded-full bg-[#F2F3F5] px-2 py-0.5 text-[#5F6B73]">{coverage.status}</span>
                </div>
              ))}
            </div>
          </Card>

          <EnterpriseWorkflowJourney
            snapshot={enterpriseJourney}
            compact
            displayMode={goldenPathDisplayMode.mode}
            onDisplayModeChange={goldenPathDisplayMode.setMode}
          />

          <Card className="p-4">
            <h3 className="text-xs font-semibold text-[#0F1117] uppercase tracking-wider mb-3">Context Window</h3>
            <div className="space-y-2">
              {(demoMode
                ? [
                    { type: "Project", name: "Dibrugarh Oxygen Resilience Upgrade", icon: FolderKanban },
                    { type: "Document", name: "Cachar Maternal Referral Review Note", icon: FileText },
                    { type: "Meeting", name: "Mission Secretariat SLA Review - Jul 4", icon: CalendarDays },
                    { type: "Stakeholder", name: "Dr. Purnima Bora, State Health Directorate", icon: Users },
                  ]
                : []
              ).map((ctx, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-[#F8F9FA] hover:bg-[#F2F3F5] cursor-pointer transition-colors">
                  <ctx.icon size={13} className="text-[#8B1E2D]" />
                  <div>
                    <div className="text-[10px] font-mono text-[#5F6B73]">{ctx.type}</div>
                    <div className="text-xs font-medium text-[#0F1117] leading-tight">{ctx.name}</div>
                  </div>
                </div>
              ))}
              {!demoMode && (
                <p className="text-xs leading-relaxed text-[#5F6B73]">No context added to this session yet.</p>
              )}
            </div>
            <button className="mt-3 w-full text-xs text-[#5F6B73] border border-dashed border-[rgba(0,0,0,0.12)] rounded-lg py-2 hover:border-[#8B1E2D] hover:text-[#8B1E2D] transition-colors">
              Add governed context
            </button>
          </Card>

          <Card className="p-4">
            <h3 className="text-xs font-semibold text-[#0F1117] uppercase tracking-wider mb-3">Sources Used</h3>
            <div className="space-y-2.5">
              {ragAnswer.sources.map((source) => (
                <div key={`${source.sourceType}-${source.sourceId}`} className="rounded-lg border border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase text-[#5F6B73]">{source.sourceType === "document" ? "Document" : "Knowledge Article"}</span>
                    <span className="text-[10px] font-semibold text-[#1A6B4A]">{Math.round(source.score * 100)}%</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold leading-snug text-[#0F1117]">{source.title}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#5F6B73]">{source.excerpt}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-xs font-semibold text-[#0F1117] uppercase tracking-wider mb-2">AI Audit Trail</h3>
            <div className="space-y-2">
              {(demoMode
                ? [
                    { time: "08:43", action: "RAG answer generated", user: "Auto" },
                    { time: "08:41", action: "Risk register queried", user: session.user?.avatarInitials ?? "AR" },
                    { time: "07:55", action: "District brief drafted", user: "Auto" },
                  ]
                : []
              ).map((log, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-[#5F6B73]">
                  <span className="font-mono">{log.time}</span>
                  <span className="flex-1 truncate">{log.action}</span>
                  <span className="font-medium text-[#0F1117]">{log.user}</span>
                </div>
              ))}
              {!demoMode && (
                <p className="text-xs leading-relaxed text-[#5F6B73]">No AI actions recorded yet for this tenant.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
      {agenticPrompt && (
        <AgenticActionablesPrompt
          open
          firstName={firstName}
          source={agenticPrompt.source}
          gateContext={agenticPrompt.gateContext}
          disabledReasons={AGENTIC_UNAVAILABLE_ACTIONS}
          onResolved={resolveAgenticPrompt}
          onClose={() => setAgenticPrompt(null)}
        />
      )}
    </PageShell>
  );
};

export default AIWorkspaceSection;
