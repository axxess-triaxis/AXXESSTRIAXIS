// Pure parts of fire-callismatic.mjs, kept apart so tests need no network, AWS or secret.

// The buyer message from tests/stack/stack.spec.ts. Callismatic labelled it `lead` in the staging stack runs.
export const DEMO_MESSAGE =
  "Hello, I run a 40-bed hospital and we want to buy your platform for all our staff this quarter. " +
  "We have budget approved. Please confirm whether we can sign a contract by Friday.";

// A number that cannot belong to anyone: 555-0100 to 555-0199 are reserved for fiction.
export function demoPhone() {
  return `+120255501${String(Math.floor(Math.random() * 100)).padStart(2, "0")}`;
}

export function triageRequest({ url, key, sender, messageId }) {
  const base = url.endsWith("/") ? url : `${url}/`;
  return {
    url: `${base}api/triage/text`,
    init: {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key },
      // place_callbacks false: Callismatic must never phone anyone during a demo.
      body: JSON.stringify({ channel: "sms", sender, message_id: messageId, text: DEMO_MESSAGE, place_callbacks: false }),
    },
  };
}

// Errors name what is missing, never the secret's content.
export function adminKeyFrom(secretString) {
  let secret;
  try {
    secret = JSON.parse(secretString);
  } catch {
    throw new Error("The Callismatic secret is not JSON");
  }
  const key = typeof secret?.ADMIN_API_KEY === "string" ? secret.ADMIN_API_KEY.trim() : "";
  if (!key) throw new Error("ADMIN_API_KEY is not set in the Callismatic secret");
  return key;
}

// Mirrors STILL's production rule: every lead, or important with needs_decision, becomes a task.
function becomesTask(triage) {
  return triage.category === "lead" || (triage.category === "important" && triage.needs_decision === true);
}

// Only the label, urgency, message id and timing are printed. The sender's number and file name are not.
export function describeResult(result, messageId, elapsedMs) {
  const seconds = `${(elapsedMs / 1000).toFixed(1)} s`;
  if (result.error || !result.triage) {
    return [`Callismatic error: ${result.error ?? "no triage returned"} (message ${messageId}, ${seconds})`];
  }
  const { category, urgency } = result.triage;
  const lines = [`Callismatic triaged message ${messageId} as ${category.toUpperCase()} (urgency ${urgency}) in ${seconds}`];
  if (becomesTask(result.triage)) {
    lines.push("STILL routes it to AXXESS, where it becomes an AXXESS task. Watch /admin/stack.");
  } else {
    lines.push(`A ${category} message without a decision makes no task in AXXESS. Run again for the demo.`);
  }
  return lines;
}
