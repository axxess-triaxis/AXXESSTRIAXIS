# Local NLP

Sprint 11 adds deterministic local NLP utilities for offline-safe institutional intelligence.

## Utilities

- Text normalization
- Tokenization
- Keyword extraction
- Summary fallback
- Entity extraction
- Document classification
- Tag suggestions
- Basic English, Assamese, Bengali, and Hindi script detection

## Design

The NLP layer is intentionally lightweight. It does not require an external model download, so local development, investor preview, and production fallback modes remain reliable.

## Classification Labels

- policy
- hospital-sop
- public-health-report
- budget
- procurement
- meeting-minutes
- grant
- compliance
- stakeholder-brief
- risk-register
- implementation-plan
- audit
- monitoring-evaluation
- csr
- dashboard
- vendor-onboarding
- general

## Regional Handling

The language detector uses Unicode script ranges and deterministic heuristics. This is not a full translation or language model layer, but it gives the platform a safe baseline for Assamese, Bengali, Hindi, English, and mixed-script institutional records.

## Next Steps

- Add optional open-source embedding and NLP provider adapters.
- Add evaluation datasets for multilingual records.
- Add document ingestion hooks that call classification and tag suggestions on upload.
