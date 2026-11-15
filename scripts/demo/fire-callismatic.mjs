#!/usr/bin/env node
// Demo trigger: sends one scripted buyer message to PRODUCTION Callismatic, which triages it and publishes
// lead.triaged.v1 to STILL. STILL then creates a real task in AXXESS Tenant 0 (Triaxis Ventures).
//
//   node scripts/demo/fire-callismatic.mjs            send one message
//   node scripts/demo/fire-callismatic.mjs --dry-run  print what would be sent; no AWS call, no secret read
//
// The founder runs this, signed in to AWS (profile axxess-triaxis by default, or AWS_PROFILE).
// The admin key is read from Secrets Manager at run time and is never printed or written anywhere.
// The sender is a fictional 555-01xx number, and place_callbacks is false, so nobody is contacted.
// Delete each demo task in AXXESS afterwards: agents cannot delete tasks.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DEMO_MESSAGE, adminKeyFrom, demoPhone, describeResult, triageRequest } from "./fire-callismatic-lib.mjs";

const FUNCTION_NAME = "callismatic";
const SECRET_ID = "callismatic/prod";
const REGION = "us-east-1";

function aws(...args) {
  const profile = process.env.AWS_PROFILE || "axxess-triaxis";
  // stdio pipe: nothing the CLI returns, including the secret, reaches the screen.
  return execFileSync("aws", [...args, "--region", REGION, "--profile", profile, "--output", "text"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function main() {
  const messageId = `triaxis-demo-${Date.now()}`;
  const sender = demoPhone();

  if (process.argv.includes("--dry-run")) {
    console.log(`Would send message ${messageId} to production Callismatic (${FUNCTION_NAME}, ${REGION}):`);
    console.log(`  "${DEMO_MESSAGE}"`);
    console.log("  from a fictional 555-01xx number, with place_callbacks false.");
    return;
  }

  const url = aws("lambda", "get-function-url-config", "--function-name", FUNCTION_NAME, "--query", "FunctionUrl");
  let key;
  try {
    key = adminKeyFrom(aws("secretsmanager", "get-secret-value", "--secret-id", SECRET_ID, "--query", "SecretString"));
  } catch (error) {
    // execFileSync errors carry the command's stdout; print only our own message.
    throw new Error(error instanceof Error && error.message.startsWith("ADMIN_API_KEY") ? error.message : "Could not read the Callismatic secret. Is AWS signed in?");
  }

  console.log(`Sending message ${messageId} to Callismatic...`);
  const request = triageRequest({ url, key, sender, messageId });
  const started = Date.now();
  const response = await fetch(request.url, request.init);
  if (!response.ok) throw new Error(`Callismatic answered HTTP ${response.status}`);
  for (const line of describeResult(await response.json(), messageId, Date.now() - started)) console.log(line);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Failed");
    process.exitCode = 1;
  });
}
