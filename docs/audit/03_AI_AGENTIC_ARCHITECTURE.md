# Phase 3 -- AI / RAG / Agentic System Audit

This phase does not re-investigate what Phase 2's Knowledge & AI/Agentic cluster already established (`docs/audit/02_PRODUCT_CAPABILITY_MATRIX.md`, Cluster 3) -- it builds on those findings and fills six specific gaps: hallucination controls, failure handling/model fallback, cost controls, AI-specific tenant isolation, observability, and provider abstraction quality. All findings below are from direct code citation, not from `docs/readiness/*.md` claims.

**Read this first:** two findings in this phase materially update Phase 2, one of them significantly enough to affect the Q-004 tenant-isolation answer you already gave. Flagged prominently in the pipeline trace and again as a new question (Q-005) at the end of this document.

---

## The pipeline, traced stage by stage

```
DATA -> INGESTION -> INDEXING -> RETRIEVAL -> CONTEXT CONSTRUCTION -> MODEL ->
REASONING/ORCHESTRATION -> TOOL SELECTION -> ACTION -> HUMAN APPROVAL -> EXECUTION -> AUDIT TRAIL
```

| Stage | What actually happens | Real or stub | Evidence |
|---|---|---|---|
| **DATA** | Tenant uploads a document (PDF/DOCX/plain/markdown; xlsx/pptx/images accepted but not extracted) | Real | Phase 2 Cluster 3, #1 |
| **INGESTION** | Real text extraction: `pdf-parse` for text-layer PDFs, `mammoth` for DOCX, `tesseract.js` OCR fallback for scanned/image PDFs | Real | Phase 2 Cluster 3, #3 |
| **INDEXING** | 140-word naive chunking, local deterministic classification/tag suggestion, stored to `rag_document_chunks` | Real (mechanism) / stub (semantics) | Phase 2 Cluster 3, #4 |
| **RETRIEVAL** | A question triggers a query against `rag_document_chunks`, scored by token-overlap / dot-product over 16-dim hash vectors -- no real embedding model, no vector DB | Real (retrieval happens) / stub (no semantic similarity) | Phase 2 Cluster 3, #5/#6; this phase's #4 below |
| **CONTEXT CONSTRUCTION** | Retrieved chunk excerpts are concatenated directly into the prompt sent to a live provider, with **no sanitization or delimiting** | Real, and a real exposure | Phase 2 Cluster 3 prose summary (prompt injection) |
| **MODEL** | Only OpenAI + OpenRouter(Kimi/DeepSeek) make real calls; Anthropic/Google/xAI/Falcon/Jais are stubs returning canned text even when API keys are configured | Real for 3 of 8 named providers | Phase 2 Cluster 3, #8; this phase's #6 |
| **REASONING/ORCHESTRATION** | If no live provider succeeds, a deterministic local extractive summary is produced instead of a generated answer; confidence explicitly capped and labeled | Real (as a template mechanism, not reasoning) | Phase 2 Cluster 3, #7; this phase's #1 |
| **TOOL SELECTION** | AXXESS's own chat/RAG assistant never autonomously selects a tool -- no `tools`/`tool_choice` parameter is ever sent to a live provider from AXXESS's own code | **Not found** for internal tool selection | Phase 2 Cluster 3, #9 |
| **ACTION** | External AI agents (not AXXESS's own assistant) can invoke 8 real tools via a real MCP server that write to live Supabase tables | Real, external-agent-only | Phase 2 Cluster 3, #10 |
| **HUMAN APPROVAL** | 4 of 8 agent tools genuinely block execution pending a human PATCH decision; the other 4 (including `create_task`, which writes data) execute immediately with zero approval, by design | Real, but partial (4/8) | Phase 2 Cluster 3, #12 |
| **EXECUTION** | Approved/auto-tier tool calls write real rows to `tasks`/`projects`/`meetings`/`stakeholders` | Real | Phase 2 Cluster 3, #10 |
| **AUDIT TRAIL** | Full-fidelity logging (question, answer, provider, citations, confidence) exists, but **only for the RAG-answer call site** -- the generic `/api/ai` endpoint and the agent-facing `query_external_model` tool are logged far more thinly, and one code path (`aiService.completeWithContext`) has no logging call in the function at all | Real but inconsistent across entry points | This phase's #5 |

---

## AI CHAT / RAG / WORKFLOW AUTOMATION / TOOL CALLING / AGENTIC REASONING / AUTONOMOUS EXECUTION / GOVERNED AUTONOMY -- explicitly separated

- **AI CHAT** -- real. A chat UI genuinely posts to a backend answer pipeline (`AIWorkspaceSection.tsx`, `LiteAskSection.tsx` -> `/api/rag/query`).
- **RAG** -- real retrieval, template/local-first generation. Retrieval is genuine and permission-filtered; "generation" defaults to a deterministic extractive summary unless a live provider is configured and actually succeeds.
- **WORKFLOW AUTOMATION** -- largely absent as a general capability (Phase 2 Cluster 2, #7/#8: no configurable rule/trigger engine exists anywhere; what exists is a fixed onboarding checklist).
- **TOOL CALLING** -- real, but inbound-only. External agents calling AXXESS = real, verified function execution against live data. AXXESS's own assistant calling a tool = not found in any code path.
- **AGENTIC REASONING** -- not found. No evidence of an internal plan/reason/act loop; AXXESS's own chat is a single-shot retrieve-then-answer pipeline, not an agent that decides what to do next.
- **AUTONOMOUS EXECUTION** -- real, but only for 4 of 8 tool actions, and only when triggered by an external agent, never by AXXESS's own assistant.
- **GOVERNED AUTONOMY** -- real but partial. Approval gating genuinely blocks execution for critical-tier tools (verified in code, not cosmetic) but by explicit design does not cover all mutating actions.

---

## The six gap-fill findings

### 1. Hallucination controls

A genuine honest "no match" path exists and is tested: when retrieval finds zero relevant citations, the system returns *"No authorized institutional source matched this question. A human review is required before any answer is used"* with confidence forced to 0 -- not a fabricated answer. A soft confidence penalty (not a hard block) flags low-score citations for human review. Local-synthesis confidence is explicitly capped and labeled.

**The gap:** a live model's raw output is trusted verbatim -- there is no check that the model's answer actually references or is consistent with the retrieved chunks (no grounding/entailment check of any kind). **More concretely risky:** because the "is this a real live-model answer" check (`isLiveModelAnswer`) only verifies that citations existed, the provider is one of the three real ones, and the returned text is non-empty -- a provider *failure* message (e.g. *"OpenAI request failed (429). This response was not generated by a live model call; treat it as unverified"*) satisfies all three conditions and can become the literal answer text shown to a reviewer, discarding the perfectly good local extractive summary that had already been computed. This is soft-mitigated by forced human review at low confidence, but the answer field itself is an internal error string, not an honest "no answer" state. VERIFIED by code trace; not covered by any existing test.

### 2. Failure handling / model fallback

There is no provider-to-provider fallback on a live-call failure -- `aiRouter.ts` calls exactly one adapter, once, and never retries or re-routes. The `fallbackChain` that appears in responses is display/audit metadata only; it is never actually traversed. Real fallback exists only for the *pre-call, unconfigured* case (no API key present routes straight to local) -- not for the *call failed* case. On a genuine failure, each provider adapter catches the error and returns a low-confidence, failure-labeled text completion rather than throwing -- this never 500s the user's request, but it also never triggers a re-route to a different provider or an explicit fall-back to the local summary (see finding #1 for the consequence).

### 3. Cost controls

The strongest, most unambiguously fail-closed control found anywhere in this audit so far. A real per-provider budget ledger (`ai_provider_budget`, seeded $20 OpenAI / $20 OpenRouter) blocks a call with a $0.50 safety margin, and every failure branch (admin not configured, no budget row, remaining below margin, the check itself throwing) is individually unit-tested and explicitly labeled fail-closed in both code comments and test names. Coverage is complete and precise: called on exactly the two adapters that make real, billed calls (OpenAI, OpenRouter), and on no others -- confirmed by grep showing zero other call sites.

**One caveat not in Phase 2:** the budget is explicitly platform-wide, not per-tenant (no `organization_id` column on the budget table, and the migration's own comment says so directly). A single tenant's heavy usage can exhaust the shared OpenAI/OpenRouter budget for every other tenant. This is a real operational risk once multiple tenants use live providers concurrently, not a security bug -- worth having on record for Phase 12 (Capital Efficiency) and Phase 5 (Enterprise Readiness).

### 4. AI-specific tenant/context isolation -- the most consequential finding of this phase

Dedicated cross-tenant RAG tests do exist and are genuinely adversarial at the unit level -- one test deliberately fabricates a chunk row with a mismatched `organization_id` to simulate a storage-layer leak, and confirms the application-level filter still excludes it. This is real, and it's stronger unit-level evidence than Phase 2 credited.

**But the retrieval mechanism for the actual production knowledge base uses a fundamentally different, weaker security model than the rest of the app.** Two retrieval paths exist: an in-memory fallback path with real, database-level tenant isolation (matching the general pattern Phase 2 found across the app), and the real, production retrieval path, which uses an elevated-privilege database client that bypasses row-level tenant isolation entirely on this one table, by design of that access mode -- regardless of what isolation policy is defined on the table itself. Isolation for real, indexed-document RAG retrieval currently rests entirely on the application remembering to filter every query by tenant, with no database-level backstop. *(Exact file/line/table-level detail redacted from this public copy -- retained internally.)*

**Why this matters for Q-004 specifically:** the two-tenant production isolation harness tested 6 other resource types -- none of which is this table. That harness never exercised the retrieval path an AI answer is actually grounded in. The "partially cleared" isolation proof and this RAG-specific finding are about two different tables with two different security models -- one backed by the database itself, one backed only by application code discipline.

### 5. Observability of AI operations

Rich, structured logging exists -- question, answer, provider, citations, confidence, all captured -- but from exactly one call site (`tenantRagWorkflow.ts::answerTenantQuestion`). Two other entry points into the AI router exist and are logged far more thinly: the generic `/api/ai` endpoint logs operational metadata only (provider, model, cost, latency) with **no prompt or answer text**; the agent-facing `query_external_model` tool's wrapping audit call captures the prompt but generally not the model's answer text. A third path (`aiService.completeWithContext`) appears to have no logging call in the function at all (and no confirmed live UI caller, though that wasn't independently verified this pass). The admin-facing Review Inbox UI genuinely reads live data with an honest empty state when unconfigured -- not fabricated.

### 6. Provider abstraction quality

The interface is genuinely clean -- one shape (`config` + `complete()`) implemented identically across all providers; adding a real 9th provider would mean writing one more factory function, not restructuring anything.

The gap: "configured" (an env var is present) and "actually working" (a real call has succeeded) are conflated by design in the status object exposed through the real `/api/ai/model-policy` API and rendered in the AI Workspace UI for real, non-demo tenants. The narrower set that distinguishes real providers from stubs (`liveModelProviders`) is used internally to gate whether an answer is trusted, but is never exposed through the status API -- so a real tenant who sets `ANTHROPIC_API_KEY` for an unrelated reason would see Anthropic rendered as "configured" in the same visual treatment as genuinely-live OpenAI, with nothing in the response surfacing that Anthropic never makes a real call. (A separate, already-honestly-labeled demo-only fallback in the same file hardcodes fake "Active" statuses for the investor demo specifically -- that path is clearly commented as demo-only and is a materially lower-severity issue than the real-tenant conflation.)

---

## What Phase 3 establishes

- A stage-by-stage trace of the full AI pipeline from data to audit trail, each stage classified real/stub with exact evidence.
- The clean 7-way separation the audit protocol asks for (AI Chat / RAG / Workflow Automation / Tool Calling / Agentic Reasoning / Autonomous Execution / Governed Autonomy), each independently verified rather than assumed from the "AI-powered" framing.
- Cost controls are the single most solid, fail-closed mechanism found in this codebase to date.
- A materially important correction to how Q-004's "partially cleared" tenant-isolation finding should be read: the production isolation proof does not cover the table the RAG pipeline actually retrieves from, and that table's retrieval path uses elevated-privilege, isolation-bypassing access, not the tenant-scoped access the rest of the app uses.

## What Phase 3 does NOT establish

- A severity/risk score for the service-role RAG retrieval finding -- that judgment belongs to Phase 5 (Enterprise Readiness) and Phase 16 (Red Team), not this phase.
- Whether the provider-failure-text-as-answer issue (finding #1) has ever actually occurred in production or been noticed by a real user/reviewer -- only that the code path exists and is untested.
- Whether the platform-wide (not per-tenant) AI budget is an accepted tradeoff at this stage of the product or an oversight -- not asked this phase, since only one new question is being raised (see below) and it's the more consequential one.

---

## New founder question raised by this phase

### Q-005

**Category:** AI/RAG architecture -- tenant isolation

**Question:** The real, production AI/RAG document-retrieval path queries the live knowledge-base table using an elevated-privilege database client, which bypasses standard row-level tenant isolation entirely -- unlike the general CRUD repositories elsewhere in the app, which enforce real per-tenant isolation on every call. An isolation policy exists on that table, but it provides no actual protection on this path since the elevated-privilege client is exempt from it by definition. Isolation for this specific table rests entirely on the application remembering to filter every query by tenant, with no database-level backstop -- and this is also the table the two-tenant production isolation harness (Q-004) never tested. Is this a deliberate architectural choice, or is this a genuine gap worth closing?

**Why this matters:** This is the data an AI answer is actually grounded in -- if isolation ever failed here, a tenant could receive an AI-generated answer synthesized in part from another tenant's confidential documents, not just see a stray row in an admin list. It also means Q-004's "partially cleared" status, while accurate for what it covered, does not extend to the AI/RAG surface at all.

**Current evidence:** [Redacted for public distribution -- exact file paths, line numbers, and the affected table/migration/test names are withheld from this public copy. Full citation trail, including a real adversarial unit test simulating the failure mode, retained internally.]

**Possible interpretations:**
A. Deliberate and considered sufficient -- the elevated-privilege access was chosen for a specific technical reason, and the app-level filter plus adversarial unit tests are the intended isolation mechanism for this table specifically.
B. An oversight -- this table should be queried the same way the rest of the app queries tenant data, or should at minimum be added to the two-tenant harness's required coverage.

**What evidence would resolve it:** Founder confirmation of intent, and/or a future run of the two-tenant harness extended to also cover this table.

**Founder answer (2026-08-10):** "Log Q-005 as Open Issue" -- directed to be tracked as an acknowledged standing problem, not resolved with interpretation A or B above.

**Status:** OPEN ISSUE -- acknowledged as real, not yet fixed. Tracked for follow-up in Phase 5 (Enterprise Readiness) and Phase 16 (Red Team). See `FOUNDER_QUESTIONS.md` for the canonical record.
