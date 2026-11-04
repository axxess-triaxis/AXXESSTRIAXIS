# Testing The AXXESS Bundle as One System

**Closeout, 2026-11-04.** A staging copy of AXXESS TRIaxis, Callismatic, Omnidamus and STILL, with one
automated test that runs across all four.

**Result:** all 5 scenarios passed in 3 consecutive runs, and a deliberately broken adapter made the
test fail. This proves the staging flow works. It does not prove production has the same behaviour,
because the rule change below is not on production yet.

Figures marked `Founder-stated, source artifact needed` come from the founder and have not been
checked against a source document. `Not yet measured` means exactly that.

## 1. Goal

Triaxis Ventures is built to run lean and founder-driven. The founder's target is for these four
products to automate 80% of the company's work (`Founder-stated, source artifact needed`). That only
works if work passes reliably between them, and each product was only testing itself. The one joined
check was done by hand on 2026-10-29.

## 2. Objective

One run should start both flows with synthetic data and prove that:

1. Each flow creates exactly one task, visible in the AXXESS interface.
2. Spam and duplicate events create no extra task.
3. A bad event goes to the failure queue.
4. The test cannot touch production, send a real message or place a real call.

Acceptance: 3 consecutive passes, plus one deliberate failure.

## 3. Scope

| In scope | Out of scope |
|---|---|
| The flow from Callismatic or Omnidamus, through STILL, to an AXXESS task | Real SMS, WhatsApp, email or voice delivery |
| Real model calls on Amazon Bedrock | Load testing |
| Checking the result in a real browser | Running against production |
| Separate staging stacks and a separate staging database | Bringing production Callismatic under infrastructure as code |

## 4. Method

```
Callismatic  POST /api/triage/text ─┐
                                    ├─> STILL event bus ─> adapter ─> AXXESS create_task ─> /tasks page
Omnidamus    inbound SMS topic ─────┘
```

- **Harness:** Playwright in `tests/stack/`, using each product's real entry point and then reading
  the result in the AXXESS interface. There is no stubbed model, because a stub would stop this being
  end to end.
- **Separation:** separate AWS stacks in the same account, and a separate Supabase project with seeded
  test users only.
- **Safety:** `tests/stack/guard.ts` refuses to run unless every target is a staging resource and the
  site's own code points at the staging database. Staging has no voice key, and its outbound messages
  are captured instead of sent.
- **Test data:** phone numbers from the range reserved for fiction, and an email domain that cannot
  receive mail.

| # | Scenario | Pass condition |
|---|---|---|
| 1 | Callismatic lead | Labelled `lead`, and exactly one task in AXXESS |
| 2 | Completed Omnidamus conversation | Exactly one task, and outbound message IDs show capture |
| 3 | Same event delivered twice | Still exactly one task |
| 4 | Spam message | Not labelled lead or important, and no task after 90 seconds |
| 5 | Malformed event | Reaches the failure queue, and no task |

## 5. What was done, step by step

1. **Planned.** The founder chose a staging stack over a test tenant on production, and approved the plan.
2. **Added a `Stage` setting to each product.** [STILL#6](https://github.com/axxess-triaxis/STILL/pull/6),
   [Omnidamus#5](https://github.com/axxess-triaxis/Omnidamus/pull/5) (which also added the capture mode) and
   [callismatic#12](https://github.com/axxess-triaxis/callismatic/pull/12) (staging infrastructure).
3. **Fixed a routing bug found on the way.** The STILL lead rule could reach AWS with `true` as text, which
   never matches a boolean. It is now a JSON string pattern, checked against the live staging rule.
4. **Deployed three staging stacks.** Production stacks were left alone.
5. **Created the staging database.** 47 migrations and 3 seed files applied. The seed users needed a repair
   before they could sign in (still to be added to the repo's seed files).
6. **Set up the staging site.** A `staging` branch on Vercel with its own settings, on a staging domain. A
   check caught the domain serving production at first, before anyone signed in.
7. **Wrote the harness and safety guard.** [AXXESSTRIAXIS#452](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/452).
8. **Fixed staging's settings.** Several keys were wrong, partly because of incorrect instructions.
9. **Issued the staging agent key.** It went directly into AWS without being displayed.
10. **Reviewed which production settings reach staging**, and found the shared rows in finding 3.
11. **Restored production's settings**, after testing each key against both databases first.
12. **Ran the scenarios and fixed each failure**, which led to the findings below.
13. **Merged and deployed the STILL fixes to staging only.** [STILL#7](https://github.com/axxess-triaxis/STILL/pull/7)
    and [STILL#8](https://github.com/axxess-triaxis/STILL/pull/8).
14. **Ran the acceptance:** 3 clean runs, one deliberate failure, then a check that the fix was restored.

## 6. Metrics

| Run | Result | Time |
|---|---|---|
| Clean run 1 | 5 passed | 8.1 min |
| Clean run 2 | 5 passed | 10.8 min |
| Clean run 3 | 5 passed | 8.5 min |
| Deliberate failure: adapter's bypass setting removed | Scenario 1 failed as intended, with `AXXESS MCP HTTP 401` in the logs | About 3 min |
| After restoring the setting | Scenario 1 passed | 1.3 min |

| Check | Result |
|---|---|
| Guard tests (`tests/stack/guard.test.ts`) | 16 passed |
| ESLint on the harness, and TypeScript | Clean |
| STILL tests at `f4e6dfe` | 70 passed |
| `cfn-lint` on the STILL template | No findings |
| `aws events test-event-pattern` on the new rule | Lead with the flag on or off matches; important with the flag matches; important without it, spam and routine do not |
| Production STILL adapter, task outcomes logged since 2026-11-03 | 0 |
| Production stacks and function, last changed | 2026-10-29 |

**Triage on one clear buyer message:**

| Model | Tries | `category=lead` | `needs_decision=true` |
|---|---|---|---|
| Nova Lite | 3 | 3 of 3 | 0 of 3 |
| Nova Pro | 20 | 20 of 20 | 3 of 20 |

This covers one message only. It shows the failure is real and repeatable, but it is not an accuracy rate.

## 7. Findings

**1. A clear buyer could vanish silently (most important).** A message saying budget was approved and asking
to sign by Friday was labelled `lead`, but marked as not needing a person in 20 of 23 tries. STILL only
made a task when that flag was true, so no task appeared and no error fired. Every product's own tests
passed. The founder chose to make every lead a task
([STILL#8](https://github.com/axxess-triaxis/STILL/pull/8)). **This fix is on staging only.**

**2. Staging's models did not match production.** Omnidamus staging used a model the account had no
agreement for, and production uses Nova Pro. Staging Callismatic used Nova Lite. Production Callismatic's
model is not set on the function, so it is **unverified**.

**3. A staging edit put production's next deploy at risk.** The public key row was shared across all
environments, and production had no visible server key row. The next production build would have broken
sign-in and admin calls. Live production was not affected, because settings only apply to new builds.
The rows are restored, and the keys passed a live check before being saved, but what is saved can only be
confirmed by the next production build.

**4. Vercel's protection blocked product-to-product calls on staging.** It answered 401 before requests
reached AXXESS. Production does not sit behind this protection. An optional staging-only header fixed it
([STILL#7](https://github.com/axxess-triaxis/STILL/pull/7)).

**5. A credential was exposed during setup.** Secret keys appeared in screenshots in a private working
session. Replacing them is tracked as a follow-up.

**6. Passing is not always proof.** Scenario 4 passed while nothing could reach AXXESS, so it proved nothing
until the other scenarios could create tasks. A miscount in the test also wrongly failed scenario 3, and the
logs showed the product had behaved correctly.

**7. Correction made during this work.** Nova Pro was reported as the fix after 3 of 3 passes. Further tries
brought that to 3 of 20, and the claim was withdrawn. Small samples misled us here.

## 8. Conclusion

The four products work together on staging: one lead makes one task, one conversation makes one task,
duplicates and spam make none, and bad events are caught. The test can fail when the flow breaks.

Its biggest result is the lead finding. A test of the joined flow caught, within a few runs, a failure that
no single product's tests could see.

## 9. Implications for Triaxis Ventures

- **Production may be missing leads today.** Its rule is still the old one. If its model behaves like the
  ones tested, real buyers could go without a task. Not confirmed either way.
- **Don't let a model's judgement be the only gate on revenue.** A fixed rule on the `lead` label replaced it.
- **Automation needs this kind of test.** The 80% target depends on hand-offs like these, and they can fail
  with no alert.
- **Staging settings need their own rows.** Shared rows are how a staging change can reach production.
- **Model choice is a pricing input** for Callismatic and Omnidamus, now that costs per message can be measured.

## 10. Repeatability

**To run it,** set these variables, sign in to AWS, then run the command:

`STACK_AXXESS_URL`, `STACK_BUS_ARN`, `STACK_ADAPTER_FAILURE_QUEUE_URL`, `STACK_CALLISMATIC_FUNCTION`,
`STACK_OMNIDAMUS_FUNCTION`, `STACK_OMNIDAMUS_SMS_TOPIC_ARN`, `STACK_CALLISMATIC_ADMIN_KEY`,
`VERCEL_AUTOMATION_BYPASS_SECRET`, `AWS_PROFILE`

```bash
pnpm exec playwright test --config playwright.stack.config.ts
```

**Limits:**

- It has only run from the founder's laptop. `.github/workflows/stack-e2e.yml` exists but has not run, and
  needs an AWS role that has not been created.
- Runs slow down as test tasks build up, because the test opens every task. AXXESS has no delete tool for agents.
- 3 runs is a small sample, and models vary, so a future failure may need investigating.
- There is no schedule.
- A person can trigger a run in one command, but a new environment took 17 hours of elapsed time to set up,
  across 103 messages, including waiting and rework.

## 11. Economics

| Item | Figure | Status |
|---|---|---|
| Bedrock usage for this work, at list prices | About USD 0.28 | Calculated from AWS token counts, account-wide, so an upper bound. Asia-Pacific Nova Pro priced at the US rate |
| Nova Pro cost per triaged message | About USD 0.009 | Estimate: about 9,800 input and 350 output tokens, over about 30 messages |
| Nova Lite cost for the same tokens | About USD 0.0007 | Calculated, not measured on Nova Lite |
| Net AWS bill on 2026-11-03 and 11-04 | Effectively zero | Cost Explorer estimate, which lags and is net of any credits |
| Gross AWS cost, and monthly staging running cost | Not yet measured | Review after a full week of billing |
| Supabase and Vercel for staging | No new paid plan seen | Free and Hobby tiers shown in their dashboards; invoices not checked |
| AWS credits | USD 1,000 under AWS Activate | `Founder-stated, source artifact needed` |
| Lifetime burn since March 2026 | USD 1,300 | `Founder-stated, source artifact needed` |
| Breakeven | 40 AXXESS TRIaxis seats at USD 35 a month, or USD 1,400 a month, within 2-3 months of go-to-market | `Founder-stated, source artifact needed`. Target, not revenue |
| Bundle and per-product prices | Not yet measured | No prices set here |

Now that every lead makes a task, cheaper Nova Lite may be enough. It labelled the test lead correctly in 3 of 3
tries, but that sample is too small to switch on.

## 12. Savings in time, manpower and effort

| Measure | Value |
|---|---|
| Hours saved per lead or follow-up | Not yet measured |
| Manpower saved | Not yet measured |
| Weekly volume of leads, calls and messages | Not yet measured |
| Cost of an hour of that work | Not yet measured |
| Share of Triaxis Ventures' work automated | Not yet measured. Target is 80% (`Founder-stated, source artifact needed`) |

**What can be said:** the test checks 5 scenarios across four products in about 8 to 11 minutes of machine time,
with one person starting it. There was no earlier timed baseline, so that is not a saving yet.

**This test cannot prove the 80%.** It shows that hand-offs work, but not how much of the company's work those
hand-offs cover. To measure it: list recurring work for one week with minutes spent on each item, mark which
items the products handle end to end, and repeat after go-to-market.

## 13. Status

| Item | Status |
|---|---|
| Staging flow, 5 scenarios, 3 clean runs | Shipped on staging, verified |
| Every-lead rule, and staging bypass header | Merged to STILL `main`; deployed to staging only |
| Every-lead rule on production | **Not deployed.** Needs its own review, because a preview listed more changes than this fix |
| Production Vercel rows | Saved by the founder. Effect unverified until the next production build |
| Production sign-in after the next build | **Not done.** Needs a real sign-in check |
| Replacing exposed credentials | **Partial.** Old keys still to be deleted after that build |
| GitHub workflow, and AWS role for it | Partial: file exists, never run |
| Alarm email and budget alarm for staging | Not done |
| Seed repair in the repo | Not done |
| Production Callismatic's model | Unverified |
| Production's task count before and after | Not checked directly. Indirect evidence only: no production adapter outcomes logged, and no production stack changes |

**Exact state:** STILL `main` at `f4e6dfe`. Omnidamus `76110c1`. Callismatic `aa5758b`. AXXESSTRIAXIS `main` at
`5f8096c`, with this work on `test/stack-e2e` in
[AXXESSTRIAXIS#452](https://github.com/axxess-triaxis/AXXESSTRIAXIS/pull/452), not merged.

**Other STILL note:** [STILL#7](https://github.com/axxess-triaxis/STILL/pull/7) and
[STILL#8](https://github.com/axxess-triaxis/STILL/pull/8) reported no automated checks. They rest on local test runs.

## 14. Decision ledger

```
Decision: Every Callismatic lead becomes an AXXESS task, whatever needs_decision says.
Why: A clear buyer was marked as not needing a person in 20 of 23 tries, with no error.
What changed: The STILL lead rule and adapter check, and scenario 1's expectation.
Architecture boundary: STILL routing decides on the category. Important items still use the model's flag.
Product boundary: More tasks, including leads a callback could have handled.
Verification: 70 STILL tests, AWS pattern test, 3 clean runs, one deliberate failure.
Outcome: Working on staging. Pending on production, review by 2026-11-18.
Follow-up: Production deploy, and a look at whether Nova Lite is enough.
```
