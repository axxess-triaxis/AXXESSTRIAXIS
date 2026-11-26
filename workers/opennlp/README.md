# OpenNLP enrichment worker

Java 21 Lambda (Apache OpenNLP 3.0.0) called by AXXESS RAG ingestion
(`src/services/rag/tenantRagWorkflow.ts` -> `src/services/rag/ingestion/enrichedIngestion.ts` ->
`src/services/nlp/openNlpClient.ts`). AXXESS falls back to `src/services/nlp/localNlp.ts` when the flag is off,
the call fails, or it takes longer than 3 s. Nothing is stored here; document text is never logged or echoed.

## API

`POST /enrich` with header `x-opennlp-key` and body `{"text": "..."}` (first 200,000 characters used):

```json
{
  "sentences": ["..."],
  "tokensCount": 42,
  "entities": { "people": [], "organizations": ["District Hospital"], "locations": ["Kamrup"], "dates": ["2026-12-01"], "money": ["₹ 4.5 crore"] },
  "modelVersions": { "sentdetect": "rule-fallback", "tokenizer": "opennlp-simple", "opennlp": "3.0.0" }
}
```

`GET /health` returns `{"ok":true}` without a key.

## What OpenNLP does here, and what it does not

| Part | How | Status |
| --- | --- | --- |
| Tokens | `SimpleTokenizer` (model-free) | On |
| Organizations, locations | `DictionaryNameFinder` over `src/services/nlp/gazetteers.json` (shared with `localNlp.ts`) | On |
| Dates, money | Regex on sentence text, same patterns as `localNlp.ts` | On |
| Sentences | `SentenceDetectorME` if `src/main/resources/models/en-sent.bin` exists, else a rule split | Rule split until a model is added |
| People | Not extracted (no confirmed OpenNLP 3.x English person model) | Off, returns `[]` |
| Document classification | Stays rule-based in `localNlp.ts` (no labeled corpus to train doccat) | Not in this worker |

`modelVersions.sentdetect` reports `rule-fallback` until a model is added, so the output never claims a model it did not use.
To add one, place the English UD sentence model from the OpenNLP models page
(https://opennlp.apache.org/models.html) at `src/main/resources/models/en-sent.bin` and rebuild.

## Build and test

OpenNLP 3.0.0 is compiled for Java 21. Without a local JDK 21 and Maven, use the official Maven image from the
ECR Public mirror (on 2026-11-26 Docker Hub layer downloads stalled from the founder's network; the mirror worked):

```powershell
docker run --rm -v "${PWD}\..\..:/repo" -v opennlp-m2:/root/.m2 -w /repo/workers/opennlp public.ecr.aws/docker/library/maven:3.9-eclipse-temurin-21 mvn -B test
```

```powershell
sam build --use-container
```

## Deploy (founder approval required: AWS spend, secret)

1. Create a plain-string secret, for example `axxess/opennlp/staging-key`, with a random value. Note its ARN.
2. `sam deploy --guided --profile axxess-triaxis --region ap-southeast-2 --stack-name axxess-opennlp-staging --parameter-overrides Stage=staging KeySecretArn=<arn>`
3. Set `OPENNLP_ENDPOINT` (stack output `EnrichFunctionUrl`, no trailing slash), `OPENNLP_KEY` (same value) and
   `OPENNLP_ENABLED=true` on the staging Vercel environment.
4. Live check: `GET <url>/health`, then `POST <url>/enrich` with test text and the key.

Rollback: set `OPENNLP_ENABLED=false` (instant; AXXESS falls back to local NLP), then `sam delete --stack-name axxess-opennlp-staging` if needed.
