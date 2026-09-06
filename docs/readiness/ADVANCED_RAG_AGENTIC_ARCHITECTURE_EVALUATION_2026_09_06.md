# Advanced RAG & Agentic Architecture -- Evaluation Reference

Date created: 2026-09-06
Status: **Reference for imminent evaluation, not a committed roadmap.** Founder: "in next few days, we
will build significantly on agentic workflows and advanced RAG capabilities." This document exists so
that build starts from an honest map of what exists today against what a production-grade advanced
RAG/agentic stack requires, rather than from a vendor list alone.

## Source and Provenance

The capability list and technology-stack table below were pasted into this session from an external
source (unattributed -- read as founder-provided/unverified reference material, per this repo's own
evidence-chain standing rule, not as an AXXESS engineering decision already made). None of the named
vendors (LangGraph, CrewAI, Autogen, Qdrant, Neo4j, Redis, Pinecone, Milvus, TruLens, Ragas,
Guardrails AI, Llama-Guard, PaddleOCR, LLMLingua) are currently integrated, evaluated, or committed
to in this codebase -- confirmed by direct inspection of `package.json` and the existing RAG/agentic
service files (see "Current State" per capability below). Every "candidate" marked in this document
is exactly that: a name worth evaluating, not a chosen dependency.

## How to Read This Document

Each capability area has three parts:
1. **What was proposed** -- summarized from the pasted reference material.
2. **Current state in AXXESS** -- what actually exists today, with the exact file, confirmed by
   reading the source, not assumed.
3. **Evaluation questions** -- what needs to be decided before adopting any part of the proposal,
   including the one tension specific to this company's own positioning: AXXESS's stated
   differentiator (per the YC application on file) is "no single-vendor dependency" and
   governance/data-residency for India, MENA, and the Global South. Several of the proposed
   vendors are US-hosted-only or add a new hard dependency, which needs to be weighed against that
   thesis explicitly, not adopted by default because a reference document named them.

## 1. Advanced Retrieval & Context Management

**Proposed:** Parent-child/hierarchical chunking (small chunks for matching, larger parent context
returned to the LLM); a cross-encoder reranker (BGE-Reranker, Cohere Rerank) to score relevance
across multiple documents before prompting; metadata-filtered sandboxing at the vector-DB layer
(Pinecone namespaces, Qdrant payloads, Milvus collections) for access isolation.

**Current state:** `src/services/rag/governedRag.ts` chunks documents into flat ~90-word segments
(`chunkText()`) with no parent/child hierarchy, and scores relevance via a plain token-overlap
similarity function (`similarity()`) -- not embeddings, not a reranker, not a vector database at
all. Access isolation already exists, but at the *document* layer before chunking/retrieval
(`canRetrieveDocument()`: role, visibility, classification, tenant scope), not as vector-DB metadata
filtering, because there is no vector database yet.

**Evaluation questions:**
- Does moving to embeddings + a reranker actually improve answer quality for AXXESS's real
  document set, or is the current bottleneck elsewhere (per `RAG_REMEDIATION_SPRINT_2_ANSWER_QUALITY_CLOSEOUT_2026_07_26.md`'s
  own findings)? Measure before rebuilding.
- If a vector database is adopted: does it need to run in-region (India/GCC data-residency
  requirements, per the company's own governance positioning) -- which rules out some
  US-only-hosted options unless a self-hosted variant exists (e.g., self-hosted Qdrant vs.
  Qdrant Cloud, `pgvector` inside the already-used Supabase/Postgres instance vs. a wholly new
  system to operate).
- `pgvector` specifically deserves first evaluation before anything new: it runs inside the
  Postgres/Supabase instance already in production, adding zero new infrastructure, no new vendor,
  and no new data-residency question.

## 2. Memory & Long-Term Storage

**Proposed:** Hybrid memory -- raw conversation history in Redis, entities/preferences extracted
into a graph database (Neo4j) as an evolving personal knowledge graph; an end-of-day summarization
job that compresses the day's logs into permanent memory and archives raw history.

**Current state:** No dedicated long-term memory store exists yet in the RAG path itself. A related
but distinct capability -- "real conversation memory + Context Window + AI Audit Trail" -- is
referenced in `src/features/ai-workspace/AIWorkspaceSection.test.ts` (Sprint 4), scoped to the AI
Workspace feature specifically, not the governed-RAG document-retrieval path this document is
mainly about. No graph database, no Redis, and no EOD summarization job exist anywhere in this repo
today.

**Evaluation questions:**
- Does the "AI Workspace Sprint 4" memory feature already cover what's needed, or is a genuinely
  separate long-term/graph memory layer required? Read that feature's actual implementation before
  proposing new infrastructure that might duplicate it.
- A graph database is a real new piece of infrastructure to operate (Neo4j specifically, or a
  managed alternative) -- justify it against the actual query patterns needed (relationship
  traversal) before adopting; a simpler relational model in the existing Postgres instance may
  suffice for a first version.
- EOD summarization is a real, scoped, buildable feature (a cron/background job + a summarization
  prompt) independent of which storage backend is chosen -- it doesn't need to wait on the
  graph-database decision.

## 3. Perception & Reliability

**Proposed:** OCR/document parsing via PaddleOCR or a cloud API (AWS Textract, Google Cloud
Vision), or a vision-language model for complex layouts; hallucination prevention via a Corrective
RAG / Self-RAG loop checking faithfulness, answer relevance, and context relevance (TruLens, Ragas,
or Guardrails AI).

**Current state:** No OCR pipeline exists in this repo currently -- document ingestion works from
already-text-extractable formats. `src/services/rag/confidenceExplanation.ts` already implements a
real, working (if simpler) faithfulness signal: `sourceMatchStrength`, `citationCoverage`, and a
hard `humanReviewRequired` flag below a confidence threshold -- this is not the three-part
Faithfulness/Answer-Relevance/Context-Relevance framework proposed, but it is a real, shipped,
non-placeholder precursor to it.

**Evaluation questions:**
- OCR: what document types are pilot customers actually submitting that need it? Don't build
  general-purpose OCR speculatively -- confirm the real gap first (per this repo's own
  "don't build ahead of validated demand" pattern, e.g. the Lite Files deferral in
  `XL6_LITE_DAILY_USE_LOOP_PHASE1_CLOSEOUT_2026_08_06.md`).
- If OCR is needed: a cloud API (Textract/Cloud Vision) is faster to ship than self-hosting
  PaddleOCR, but re-raises the same data-residency question as the vector-DB choice above for
  documents from regulated/government-adjacent customers.
- Corrective RAG / Self-RAG: this is the natural evolution of the existing confidence-explanation
  work, not a replacement for it -- scope it as "extend `confidenceExplanation.ts`," not "adopt a
  new evaluation framework wholesale."

## 4. Agentic Workflows & Multi-Step Reasoning

**Proposed:** LangGraph/CrewAI/Autogen for Plan-and-Solve or ReAct loops; Anthropic's Model Context
Protocol (MCP) to decouple agent logic from data sources/tools; dynamic routing between an internal
RAG MCP server and an external web-search/pull tool (Perplexity, Exa) depending on the query.

**Current state:** No agent-orchestration framework (LangGraph/CrewAI/Autogen) and no MCP server
exist in this repo today. Two existing services suggest the shape of agentic work already begun:
`src/services/agentic/stakeholderActionHandoff.ts` and `agenticDraftHandoff.ts` -- both real, but
narrower than a general multi-step reasoning loop; they hand off specific drafted
actions/stakeholder updates, not an open-ended plan-execute-evaluate cycle.

**Evaluation questions:**
- MCP is a real, credible choice specifically because it's an open standard (not a
  single-vendor lock-in) and Anthropic's own -- this is the one item in the whole list that most
  directly reinforces AXXESS's stated "no vendor dependency" thesis rather than working against
  it. Prioritize evaluating this first among the four options in this section.
- LangGraph/CrewAI/Autogen: pick one only after the actual reasoning-loop shape is scoped (what
  does a real AXXESS agentic task look like end to end?) -- don't adopt an orchestration framework
  before there's a concrete multi-step workflow it needs to orchestrate.
- Web-search/pull tools (Perplexity, Exa): review against the existing "governed, cited from
  authorized sources only" product principle (`governedRag.ts`'s own design) before adding an
  open-web retrieval path -- this is a real product-boundary decision, not just a technical one.

## 5. Efficiency & Optimization

**Proposed:** Prompt compression (LLMLingua); provider-native context caching (Anthropic/OpenAI) for
long-lived system prompts and static org knowledge; small/fast models for routing and classification,
reserving frontier models for final synthesis.

**Current state:** `src/services/ai/providers/index.ts`'s `remotePlaceholderProvider` is an explicit
stub -- no live external model call happens in the RAG path today (per
`confidenceExplanation.ts`'s own comment, cited directly). A tiered multi-model routing concept
already exists as a separate, previously-scoped initiative (Sprint 1: Kimi/DeepSeek live; Sprint
2/3: Jais/Falcon/Sarvam and tier policy, scoped as its own future plan) -- this section's "small
speculative models for routing" idea should be reconciled with that existing plan, not designed
twice.

**Evaluation questions:**
- Context caching only pays off once a real external model is actually live in the RAG path --
  sequence this after the placeholder-provider gap is closed, not before.
- Prompt compression (LLMLingua) is a genuinely low-risk, additive optimization once real model
  calls exist; not useful to evaluate before that.
- Reconcile "small models for routing" explicitly against the existing multi-model router roadmap
  rather than treating it as a new, separate decision.

## Summary Table -- What's Real Today vs. What's Proposed

| Capability | Proposed | Exists today | Where |
|---|---|---|---|
| Chunking strategy | Parent-child hierarchical | Flat, fixed-size chunks | `governedRag.ts` `chunkText()` |
| Retrieval scoring | Vector similarity + reranker | Token-overlap lexical scoring | `governedRag.ts` `similarity()` |
| Access isolation | Vector-DB metadata filtering | Document-layer RBAC pre-retrieval | `governedRag.ts` `canRetrieveDocument()` |
| Long-term memory | Redis + graph DB | Not in the RAG path; separate AI Workspace memory feature exists | `AIWorkspaceSection.test.ts` (Sprint 4) |
| EOD summarization | Cron job + LLM summary | Does not exist | -- |
| OCR | PaddleOCR / cloud API / VLM | Does not exist | -- |
| Hallucination checks | CRAG/Self-RAG, 3-part scoring | Confidence explanation with source-match/coverage/human-review flag | `confidenceExplanation.ts` |
| Agent orchestration | LangGraph / CrewAI / Autogen | Narrow handoff services, not a general loop | `stakeholderActionHandoff.ts`, `agenticDraftHandoff.ts` |
| Tool/data integration standard | MCP | Does not exist | -- |
| Model routing | Multi-model, cost-tiered | Placeholder provider only; separate router roadmap already scoped | `providers/index.ts`, multi-model router roadmap |
| Prompt/context efficiency | Compression + caching | Not applicable yet (no live model calls) | -- |

## Recommended Sequencing (Not a Commitment -- a Starting Proposal)

1. **MCP evaluation first** -- highest alignment with AXXESS's own stated differentiation, lowest
   vendor-lock-in risk, and unblocks the agentic-tooling question independent of every other choice
   in this document.
2. **Close the placeholder-provider gap** (a real model call, reconciled with the existing
   multi-model router roadmap) before evaluating context caching or prompt compression, since
   neither has anything to act on until then.
3. **`pgvector` before a new vector database** -- test whether embeddings + `pgvector` inside the
   existing Postgres instance meaningfully improves retrieval quality before evaluating a new
   standalone system (Qdrant/Pinecone/Milvus) that adds new infrastructure and a new data-residency
   question.
4. **Extend `confidenceExplanation.ts` toward Self-RAG/CRAG-style checks** incrementally -- this is
   already partially built; treat it as extension, not replacement.
5. **Long-term memory (Redis/graph) and OCR** -- scope these against actual validated demand
   (real pilot requests) before building, per this repo's own established discipline against
   building ahead of demand.

## What This Document Does Not Do

It does not commit AXXESS to any named vendor, does not represent an approved technical roadmap,
and should not be cited externally (investor decks, incubator applications) as a description of
planned or existing architecture beyond what "Current State" sections above document as real. It is
a starting map for the founder's own stated near-term build push, meant to be revised heavily once
that work actually begins.
