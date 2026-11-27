# OpenNLP for RAG ingestion -- closeout (2026-11-26)

**Branch:** `feat/opennlp-ingestion` (from `main` `21ab9c0f`). **Status:** code complete, not deployed. OpenNLP is off
(`OPENNLP_ENABLED` unset), so production behaviour is unchanged until the staging steps below are approved and done.

## Evidence chain

- **External signal:** the founder downloaded Apache OpenNLP 3.0.0 (`apache-opennlp-3.0.0-bin.zip`, 16,583,369 bytes) and
  asked how to integrate NLP. Founder choices this session: RAG ingestion first; AWS Lambda (Java) runtime.
- **Decision:** a Java 21 Lambda worker with a server-side TypeScript client behind a flag, falling back to the existing
  `src/services/nlp/localNlp.ts`. The plan was approved in plan mode before any edit.
- **Shipped artifact:** this branch (files below). **Verification:** below. **Current status:** `adapter-ready`, not live.

## What changed

| File | Change |
| --- | --- |
| `workers/opennlp/` (new) | Java 21 Lambda: `EnrichService` (OpenNLP `SimpleTokenizer`, `DictionaryNameFinder`, optional `SentenceDetectorME`), `EnrichHandler` (function URL, `x-opennlp-key` checked in constant time against a Secrets Manager value read on first request), JUnit tests, SAM `template.yaml` (SnapStart, 14-day logs, errors alarm), README |
| `src/services/nlp/gazetteers.json` (new) | Org and location lists moved out of `localNlp.ts`; the single source for both TypeScript and the Java worker |
| `src/services/nlp/localNlp.ts` | Reads the gazetteers from the JSON; behaviour unchanged |
| `src/services/nlp/openNlpClient.ts` (new) | `enrichWithOpenNlp`: 3 s timeout, response shape check, returns `null` on any failure |
| `src/services/rag/ingestion/enrichedIngestion.ts` (new) | `buildRagIngestionRecordEnriched`, `chunkBySentences`; kept out of `ingestionPipeline.ts` so the client-side Knowledge Hub bundle never imports the OpenNLP client |
| `src/services/rag/tenantRagWorkflow.ts` | Server ingestion uses the enriched builder and records `nlpSource` (`opennlp` or `local`) in `rag_ingestion_runs.metadata` |
| `src/services/nlp/modelRegistry.ts` | `apache-opennlp` entry, status `adapter-ready` |
| `.env.example` | `OPENNLP_ENABLED`, `OPENNLP_ENDPOINT`, `OPENNLP_KEY` |

## What did not change

- `buildRagIngestionRecord` and `chunkInstitutionalText` are untouched, and so is the Knowledge Hub (client) path.
- Document classification stays rule-based: there is no labeled corpus to train OpenNLP doccat.
- No person NER: I could not confirm an official OpenNLP 3.x English person model, so `people` is always `[]` from the worker.
- No statistical sentence model is bundled: the exact Maven artifact for the English UD sentence model was not confirmed.
  The worker splits sentences by rule and reports `modelVersions.sentdetect = "rule-fallback"`, so it never claims a model it did not use.
- No Indic-language NLP: OpenNLP ships no Hindi, Assamese or Bengali models. The registry's IndicBERT path is unchanged.
- Chat intent and social alerts are out of scope.

## Verification (exact)

| Check | Command | Result |
| --- | --- | --- |
| Java unit tests | `mvn -B test` in `public.ecr.aws/docker/library/maven:3.9-eclipse-temurin-21` | Tests run: 9, Failures: 0, Errors: 0, Skipped: 0; BUILD SUCCESS |
| SAM template | `sam validate --lint --region ap-southeast-2` | "is a valid SAM Template" |
| NLP + RAG tests | `vitest run src/services/nlp src/services/rag` | 22 files, 160 tests passed |
| Typecheck | `pnpm run typecheck` | rc=0 |
| Mobile typecheck | `pnpm --dir apps/mobile run typecheck` | rc=0 |
| Lint | `pnpm run lint` (`--max-warnings=0`) | rc=0 |
| Supabase | `pnpm run supabase:verify` | "status": "passed" |
| Full tests | `pnpm run test` | **Not verified locally:** Node out of memory (`AlignedAlloc Allocation failed`, rc=134). Decided by PR CI |
| Build | `pnpm run build` | **Not verified locally:** Node out of memory (`JavaScript heap out of memory`, rc=134). Decided by PR CI |

Out-of-memory cause, with citations: 7.7 GB of RAM with 0.34 GB free during the run, and the known memory exhaustion on this
machine recorded at `vitest.config.mjs:38-44`. That file's worker cap (`poolOptions.threads.maxThreads: 4`) is **no
longer applied**: Vitest 5.1.0 prints "`test.poolOptions` was removed in Vitest 4", and a run spawned 22 workers.
Error ID **OPENNLP-E1**, owner Claude Code: move the cap to top-level `maxWorkers` in a separate PR.

Regression-first note: the Vitest tests were written before the implementation, but they could not be run red first
because `pnpm install` in the new worktree was still copying from the store. They ran green after the implementation.

## Staging deploy (founder: "Yes, staging", 2026-11-26)

| Step | Evidence |
| --- | --- |
| Secret | `arn:aws:secretsmanager:ap-southeast-2:227214487086:secret:axxess-staging-opennlp-key-zkgtx1`, default `aws/secretsmanager` key, no rotation (same pattern as the 10 existing secrets). Value generated in memory by a script and never printed or read back |
| Stack | `axxess-opennlp-staging` CREATE_COMPLETE, ap-southeast-2, from jar built at `40506fb2` (9/9 JUnit in that build). URL `https://sayeqlxdc7kemhu4g4c4a5rk240cpfhi.lambda-url.ap-southeast-2.on.aws` |
| Vercel | `OPENNLP_KEY`, `OPENNLP_ENDPOINT`, `OPENNLP_ENABLED` on project `axxesstriaxis` (`prj_zTMRnOsfmUUxnzJkEUDUxNvoEOFt`), Preview branch `staging` only (`vercel env ls`) |
| Live check 2026-11-26T12:06:09Z | `GET /health` 200 `{"ok":true}` (3.76 s, 2.12 s); `POST /enrich` no key 401 (4.84 s); wrong key 401 (1.33 s); unknown path 404 |

**Not yet verified:** a keyed `/enrich` call. The key cannot be read back without `get-secret-value`, which is not
allowed, so the keyed path is proven only by staging ingestion itself. That needs this PR's code on the `staging`
branch, which is 81 commits behind `main` (founder decision pending). Latency observation: warm calls took 1.3 to 2.1 s
from the founder's machine against a 3 s client timeout; the staging comparison will show whether Vercel calls fit.

Not applied from the `creating-secrets-using-best-practices` skill (would add spend or account-wide changes the founder
has not approved): a dedicated KMS key, rotation, a CloudTrail trail with an S3 bucket, and secret-access alarms. The
account has no CloudTrail trail today. The AWS profile signs in as the account root user.

## Remaining (needs the founder's yes, batched)

1. Create a Secrets Manager plain-string secret for the staging key (AWS, secret).
2. `sam build --use-container` and `sam deploy` the `axxess-opennlp-staging` stack in ap-southeast-2 (small Lambda spend).
3. Set `OPENNLP_ENDPOINT`, `OPENNLP_KEY`, `OPENNLP_ENABLED=true` on the Vercel staging environment.
4. Live check: `GET /health`, then `POST /enrich` with test text (status, latency, timestamp), then ingest one test
   document on staging and compare `nlpSource`, tags and chunks with a flag-off run.

Rollback: `OPENNLP_ENABLED=false` (instant fallback to local NLP), then `sam delete`.

## Decision Ledger

```
Decision: integrate Apache OpenNLP 3.0 as a Java 21 Lambda for RAG ingestion, behind a flag, with localNlp as fallback.
Why: founder request; OpenNLP needs a JVM, which Vercel and Supabase Edge do not provide.
What changed: workers/opennlp, openNlpClient.ts, enrichedIngestion.ts, shared gazetteers.json, tenantRagWorkflow.ts.
Architecture boundary: server-side only; the key never reaches the browser; the client Knowledge Hub path is unchanged.
Product boundary: English sentences, tokens and dictionary entities only; no person NER, doccat or Indic languages.
Verification: 9/9 JUnit, 160/160 NLP+RAG Vitest, typecheck, mobile typecheck, lint, supabase:verify. Full test and build go to CI.
Outcome: Pending, review by 2026-12-10 (staging live check and one-document comparison).
Follow-up: OPENNLP-E1 (Vitest worker cap); a statistical sentence model once its artifact is confirmed; person NER evaluation.
```

## Approvals this session

Two asked: plan approval (required by plan mode), and the image and dependency downloads (required: downloads).
Neither could have been avoided. The deploy approvals above are batched into one ask.
