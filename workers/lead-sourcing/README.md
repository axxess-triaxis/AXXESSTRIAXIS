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

## Limits

- 15 minutes per invocation and at most 150 seeds per run. Reserved concurrency is the optional `ReservedConcurrency` parameter (default 0, none): new accounts with a 10-execution limit cannot reserve any. Overlapping invocations are safe because a run is claimed only while still queued and its verify credits are reserved when it is queued.
- The worker stops starting new sites 2 minutes before its timeout and reports what it has, including a count of sites skipped for time.
- Crawling obeys robots.txt and uses the user agent `AXXESS-lead-research/1.0`.
