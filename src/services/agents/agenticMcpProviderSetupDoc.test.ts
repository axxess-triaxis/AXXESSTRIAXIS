import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// MCP3-3 required test: "provider docs do not overclaim Copilot." A source-string regression guard
// (same convention as eventTaxonomy.test.ts's dispatch-site checks) against
// docs/readiness/AGENTIC_MCP_PROVIDER_SETUP_OPENAI_CLAUDE_COPILOT_2026_08_14.md drifting into an
// unqualified Copilot-readiness claim in a future edit, without needing a human to re-read the whole
// doc every time it changes.
const docPath = "docs/readiness/AGENTIC_MCP_PROVIDER_SETUP_OPENAI_CLAUDE_COPILOT_2026_08_14.md";

function readDoc() {
  return readFileSync(join(process.cwd(), docPath), "utf8");
}

describe("Agentic MCP provider setup doc does not overclaim Copilot readiness", () => {
  it("still contains the honest adapter-pending framing", () => {
    const source = readDoc();
    expect(source).toMatch(/adapter-pending/i);
    expect(source).toMatch(/Copilot Studio still needs its own adapter\/manifest path/i);
  });

  it("does not contain an unqualified 'Copilot is ready' or 'Copilot integration complete' claim", () => {
    const source = readDoc();
    expect(source).not.toMatch(/copilot (is|was) ready/i);
    expect(source).not.toMatch(/copilot integration (is )?complete/i);
    expect(source).not.toMatch(/copilot (adapter|studio) (is )?(fully )?(built|live|working|verified)\b/i);
  });

  it("explicitly names Copilot as not built this sprint, with exact outstanding requirements", () => {
    const source = readDoc();
    expect(source).toMatch(/not attempted/i);
    expect(source).toMatch(/live Copilot Studio agent actually invoking a tool call/i);
  });

  it("still carries the explicit no-claim-without-live-proof lines for OpenAI and Claude", () => {
    const source = readDoc();
    expect(source).toContain("Do not claim OpenAI production agent readiness until a real OpenAI-side agent/client completes a live call.");
    expect(source).toContain("Do not claim Claude live readiness until a real Claude/MCP client completes a live call.");
  });
});
