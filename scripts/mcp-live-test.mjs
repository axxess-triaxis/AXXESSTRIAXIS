#!/usr/bin/env node
// MCP3-3 (2026-08-14): the "prepared, ready-to-run" live-test artifact for OpenAI/Claude/Copilot
// provider setup proof (docs/readiness/AGENTIC_MCP_PROVIDER_SETUP_OPENAI_CLAUDE_COPILOT_2026_08_14.md).
// No coding session has real provider credentials or a founder login session to generate a real
// agent API key -- this script is what HITL runs (or hands a real key to Claude Code to run) once
// one exists. It has never been executed against a real key by this session; running it is not the
// same claim as having run it.
//
// Usage:
//   node scripts/mcp-live-test.mjs --base-url https://investor.triaxisventures.com --key axa_live_...
//   AXXESS_MCP_BASE_URL=... AXXESS_MCP_KEY=... node scripts/mcp-live-test.mjs
//
// Exits 0 only if initialize, tools/list, and one auto tool call all succeed. Exits 1 on any
// failure, printing which step failed and the raw JSON-RPC response, so it's usable both
// interactively and as a HITL go/no-go gate.

function parseArgs(argv) {
  const args = { baseUrl: process.env.AXXESS_MCP_BASE_URL, key: process.env.AXXESS_MCP_KEY };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--base-url") args.baseUrl = argv[i + 1];
    if (argv[i] === "--key") args.key = argv[i + 1];
  }
  return args;
}

async function callMcp(baseUrl, key, body) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/agents/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  return { httpStatus: response.status, json };
}

async function main() {
  const { baseUrl, key } = parseArgs(process.argv.slice(2));
  if (!baseUrl || !key) {
    console.error("Usage: node scripts/mcp-live-test.mjs --base-url <url> --key <axa_live_...>");
    console.error("(or set AXXESS_MCP_BASE_URL / AXXESS_MCP_KEY)");
    process.exit(1);
  }

  const steps = [];
  let ok = true;

  // Step 1: initialize
  const init = await callMcp(baseUrl, key, { jsonrpc: "2.0", id: 1, method: "initialize" });
  const initOk = init.httpStatus === 200 && init.json?.result?.protocolVersion === "2025-06-18";
  steps.push({ step: "initialize", ok: initOk, response: init.json });
  ok = ok && initOk;
  console.log(`[${initOk ? "PASS" : "FAIL"}] initialize -> protocolVersion=${init.json?.result?.protocolVersion ?? "?"}`);

  // Step 2: tools/list
  const list = await callMcp(baseUrl, key, { jsonrpc: "2.0", id: 2, method: "tools/list" });
  const tools = Array.isArray(list.json?.result?.tools) ? list.json.result.tools : [];
  const listOk = list.httpStatus === 200 && tools.length > 0;
  steps.push({ step: "tools/list", ok: listOk, toolCount: tools.length });
  ok = ok && listOk;
  console.log(`[${listOk ? "PASS" : "FAIL"}] tools/list -> ${tools.length} tool(s) available to this connection`);

  if (!listOk) {
    console.log("\nNo tools available -- stopping before tools/call (this connection may have zero capabilities enabled).");
    printSummary(steps, false);
    process.exit(1);
  }

  // Step 3: one auto (non-critical) tool call -- prefer query_knowledge_hub if present, else the
  // first tool that isn't obviously a write action, so this script never creates real data.
  const preferredNames = ["query_knowledge_hub", "list_tasks", "list_projects", "list_meetings", "list_documents", "get_dashboard_snapshot", "list_stakeholders", "search_audit_logs"];
  const target = tools.find((tool) => preferredNames.includes(tool.name)) ?? tools[0];
  const args = target?.name === "query_knowledge_hub" ? { question: "MCP live test -- ignore." } : {};
  const call = await callMcp(baseUrl, key, { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: target?.name, arguments: args } });
  const callOk = call.httpStatus === 200 && !call.json?.error;
  steps.push({ step: `tools/call (${target?.name ?? "none"})`, ok: callOk, response: call.json });
  ok = ok && callOk;
  console.log(`[${callOk ? "PASS" : "FAIL"}] tools/call(${target?.name ?? "none"}) -> ${callOk ? "succeeded" : JSON.stringify(call.json?.error ?? call.json)}`);

  printSummary(steps, ok);
  process.exit(ok ? 0 : 1);
}

function printSummary(steps, ok) {
  console.log(`\n${ok ? "ALL STEPS PASSED" : "ONE OR MORE STEPS FAILED"} (${steps.filter((s) => s.ok).length}/${steps.length})`);
}

main().catch((error) => {
  console.error("mcp-live-test.mjs crashed:", error);
  process.exit(1);
});
