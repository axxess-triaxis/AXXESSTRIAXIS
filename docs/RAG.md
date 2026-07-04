# Governed RAG

Sprint 11 adds the first governed retrieval-augmented generation layer for AXXESS.

## Capabilities

- Document chunking
- Lexical retrieval fallback
- Embeddings-ready abstraction boundary
- Source citations
- Metadata filtering by category and tag
- Tenant-aware retrieval
- Permission-aware retrieval
- Confidence score
- Human review flag
- Answer audit log writes
- Sources used display in AI Workspace

## Permission Model

RAG never retrieves across unauthorized documents.

Filtering considers:

- Organization
- Document status
- Visibility
- Classification
- Owner
- Explicit document permissions
- User role

Restricted documents require elevated roles and automatically flag human review on generated answers.

## Current Retrieval

The current implementation uses deterministic local token similarity. This keeps investor preview and offline development reliable without downloading external models. The service is structured so production embeddings can be introduced later without changing UI contracts.

## Audit

Each generated answer attempts to record:

- Query text
- Confidence
- Human review status
- Source IDs used
- Actor and organization through the audit repository

## Next Steps

- Add production embedding provider adapters.
- Persist chunk indexes per tenant.
- Add document-level department mappings.
- Add evaluation fixtures for answer quality and citation grounding.
