# Lead-sourcing worker

AWS Lambda function that crawls lead-sourcing runs for AXXESS.

1. An agent calls the MCP tool `source_leads`, and AXXESS stores a queued run.
2. Every 5 minutes this worker claims the oldest queued run (`POST /api/lead-sourcing/worker/claim`). It crawls the seed sites with the shared core in `src/services/leadSourcing/`, verifies guessed addresses under the run's credit cap, and posts the candidates back (`POST /api/lead-sourcing/worker/runs/{id}`).
3. A person approves candidates through `approve_sourced_leads`, which always needs a fresh approval, before anything becomes a lead.

The worker never imports, enrolls or contacts anyone.

## Secrets

Secrets live in Secrets Manager. Create them yourself; they never pass through chat or the repository.

| Secret | Used for |
|---|---|
| Worker secret (at least 32 random characters) | The same value as `LEAD_SOURCING_WORKER_SECRET` in the AXXESS Vercel environment. |
| QuickEmailVerification API key | Optional. Without it, guessed addresses are never verified. |

The function reads them at run time by ARN, given in the `WorkerSecretArn` and `QevSecretArn` parameters.

## Build and deploy

These steps need the founder's go for each environment.

```bash
cd workers/lead-sourcing
npm ci
npm run build
sam build --template template.yaml
sam deploy --guided --profile axxess-triaxis --region ap-southeast-2 --stack-name axxess-lead-sourcing-staging
```

- Deploy first with `ScheduleState=DISABLED`.
- Set `LEAD_SOURCING_WORKER_SECRET` in the matching AXXESS environment.
- Then redeploy with `ScheduleState=ENABLED`.
- The `AlarmEmail` subscription needs confirming from the email it sends.

### Stacks (2026-11-18)

| Stack | `Stage` | `AxxessBaseUrl` | Notes |
|---|---|---|---|
| `axxess-lead-sourcing-staging` | `staging` | `https://axxesstr-git-cbf2f7-axxess-tri-axis-powered-by-triaxis-ventures.vercel.app` | Stable `staging` branch alias, not behind Vercel Authentication. Schedule ENABLED. |
| `axxess-lead-sourcing-prod` | `prod` | `https://landing.triaxisventures.com` | Live app (Vercel project `triaxis-www-frontend-import`). No QEV secret. Schedule DISABLED. |

- Every redeploy must pass the current `ScheduleState`, or it falls back to `DISABLED`.
- The production `LEAD_SOURCING_WORKER_SECRET` lives on `triaxis-www-frontend-import`, not on `axxesstriaxis`. Landing only picks up an env change from a fresh build, such as a merge to `main`. `vercel redeploy` reuses the prebuilt output.

## Automatic discovery (2026-11-18)

With `DiscoveryEnabled=true` (default `false`), every invocation first calls `/api/lead-sourcing/worker/tick`, so due schedules become discovery runs. It then claims one discovery run before any crawl run.

- **Finding companies:** an open-weight model on Bedrock searches with AgentCore web search (`web-search.v1`) and submits companies through a tool.
  - The default is `openai.gpt-oss-20b-1:0`, which runs on demand in Sydney. It is the cheapest model that passed the tool-loop checks.
  - `DiscoveryModelId` also allows `openai.gpt-oss-120b-1:0` and `au.anthropic.claude-haiku-5-5`.
  - Anthropic models are blocked for this AWS account at account level as of 2026-11-18. Haiku stays allowed in IAM, so switching back later only needs the parameter.
  - gpt-oss does not always honour a forced tool choice. Once a run must submit, only `submit_companies` is offered, stray searches are refused, and up to 2 extra submit-only turns are allowed (`SUBMIT_RETRIES`).
- **Checks in the worker** (`src/services/leadSourcing/discoverValidate.ts`) drop:
  - directories, portals, social and government domains
  - domains whose own pages no search returned
  - the wrong country
  - homepages that robots.txt disallows or that do not answer
- **Checks on the server** (`worker/runs/[id]/seeds`) apply:
  - the exclusion list
  - known leads
  - domains from earlier runs
  - the run's target

  The server then queues the run for crawling.
- **Before turning it on:** enable Anthropic model access in the Bedrock console for the account. This is HITL.
- **Metrics:** `AXXESS/LeadSourcing` `DiscoverySearches`, `DiscoveryCompanies` and `DiscoveryFailures`, written as embedded metrics. They feed the alarms on any discovery failure and on more than 500 searches a day.
- **Search allowance:** the AgentCore free tier (5,000 searches a month) is shared across the whole AWS organization. AXXESS caps searches at 4,500 a month platform-wide (`LEAD_SOURCING_GLOBAL_SEARCH_CAP`).

## Limits

- 15 minutes per invocation and at most 150 seeds per run. Reserved concurrency is the optional `ReservedConcurrency` parameter (default 0, none): new accounts with a 10-execution limit cannot reserve any. Overlapping invocations are safe because a run is claimed only while still queued and its verify credits are reserved when it is queued.
- The worker stops starting new sites 2 minutes before its timeout and reports what it has, including a count of sites skipped for time.
- Crawling obeys robots.txt and uses the user agent `AXXESS-lead-research/1.0`.
