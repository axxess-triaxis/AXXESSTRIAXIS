# AXXESS in the Triaxis stack

> Moved from the README on 2026-10-30, unchanged apart from the heading and link paths. States are as checked on 2026-10-29.


[Triaxis Ventures Private Limited](https://github.com/axxess-triaxis) sells one product,
**AXXESS TRIaxis**. The other products below run the company itself. Triaxis Ventures is
Tenant 0, the dogfooded tenant, on every one of them, AXXESS included. **STILL** joins them
into one stack.

| Product | Its job in the stack | State, checked 2026-10-29 |
|---|---|---|
| [AXXESS TRIaxis](https://github.com/axxess-triaxis/AXXESSTRIAXIS) | The product we sell: an AI operating platform with governance and a human in the loop | Product: [investor.triaxisventures.com](https://investor.triaxisventures.com) (demo); [Live Beta](https://landing.triaxisventures.com) (sign-in) |
| [PORT4LLEO](https://github.com/axxess-triaxis/port4lleo) | Governance, security checks, builder analysis, product improvements | Live at [port4leo-sigma.vercel.app](https://port4leo-sigma.vercel.app) |
| [Callismatic](https://github.com/axxess-triaxis/callismatic) | Sales and outreach: triages inbound calls and messages, researches leads, places callbacks | Live on AWS Lambda (us-east-1); publishes to STILL since 2026-10-29, verified end to end |
| [Omnidamus](https://github.com/axxess-triaxis/Omnidamus) | SMS, WhatsApp and email outreach and customer service | Deployed on AWS (ap-southeast-2); publishes to STILL since 2026-10-29, verified end to end; WhatsApp replies blocked on Meta's display-name review |
| [STILL](https://github.com/axxess-triaxis/STILL) | The event bus that joins them: Callismatic leads and Omnidamus completed conversations become AXXESS tasks | Deployed (EventBridge, ap-southeast-2); STILL to AXXESS verified live 2026-10-29 |

The founder's aim is a roughly 80% automated company with the founder as the human in the
loop: AXXESS building, selling, serving customers, testing and doing outreach on itself through
these products, as a repeatable, very low-cost prototype of an AI-native startup. The founder
also states that every product except AXXESS TRIaxis was built at zero incremental cost.
*Both are founder-stated, source artifact needed.* The known running costs are small and paid
from AWS credits: STILL is estimated at under USD 2 a month, Omnidamus keeps a Route 53 zone at
USD 0.50 a month, and Amazon Bedrock tokens are billed per use.

### How the other Triaxis products reach AXXESS

[STILL](https://github.com/axxess-triaxis/STILL) delivers work into AXXESS through the agent MCP
endpoint, `POST /api/agents/mcp` ([`src/app/api/agents/mcp/route.ts`](../src/app/api/agents/mcp/route.ts)).
STILL uses an agent connection limited to the `create_task` capability. Every call is written to
AXXESS's agent tool audit log. `create_task` is registered as `auto` in
[`src/services/agents/toolRegistry.ts`](../src/services/agents/toolRegistry.ts), so it runs without
an approval step; a tool marked `critical` becomes an approval request instead.

- **Verified live 2026-10-29:** a STILL test event created AXXESS task
  `8c01df21-47e1-49a1-a6f7-98c86dab7e7d` in the Triaxis (Tenant 0) org on the Live Beta. Evidence:
  the Status table in the [STILL README](https://github.com/axxess-triaxis/STILL#status-said-plainly).
- **Verified end to end 2026-10-29:** two synthetic Callismatic leads became AXXESS tasks
  `fa971d9e-2282-4c46-9d0d-1b96177ddc3c` and `556eb2bb-1cf5-4b9b-a83b-c0668cf6921b`, and a real
  Omnidamus WhatsApp conversation became task `15b11f0f-a636-46ad-8022-b667344757d5`. Evidence:
  [STILL#1](https://github.com/axxess-triaxis/STILL/pull/1) and STILL's idempotency records (COMPLETED, with those task ids).

