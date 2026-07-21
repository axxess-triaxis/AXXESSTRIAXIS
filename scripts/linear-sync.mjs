#!/usr/bin/env node
// Syncs the 20 pre-demo actionables' status (parsed from
// "Enterprise beta feedback - Batch 1 (30 responses)/PRE_DEMO_ACTIONABLES.md") into Linear issues,
// one-way (doc -> Linear). GitHub-independent: talks directly to Linear's GraphQL API, no GitHub
// Actions or Git host involved. See docs/LINEAR_SYNC.md.
//
// Requires LINEAR_API_KEY (personal API key, Linear Settings -> API) and LINEAR_TEAM_KEY (the
// team's short key, e.g. "AXX", shown in Linear's issue IDs like AXX-123). Neither exists in this
// environment as of writing -- without them, this script only prints what it *would* do (parses
// the doc, reports the plan) and makes no network calls. This has never been run against a real
// Linear workspace; treat the GraphQL query/mutation shapes as reviewed-not-verified until a real
// key is available to test against.

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const actionablesPath = path.join(
  root,
  "Enterprise beta feedback - Batch 1 (30 responses)",
  "PRE_DEMO_ACTIONABLES.md",
);

const LINEAR_API_URL = "https://api.linear.app/graphql";
const apiKey = process.env.LINEAR_API_KEY;
const teamKey = process.env.LINEAR_TEAM_KEY;

// ✅ -> issue should be in a "completed" state; 🔨 -> "started" (in progress/in review);
// 🔜 -> "unstarted" (todo/backlog). These are Linear's state *types*, not exact state names --
// state names are team-configurable, so the actual state is picked from whichever of the team's
// configured states matches this type (see pickStateForType below).
const statusToStateType = {
  "✅": "completed",
  "🔨": "started",
  "🔜": "unstarted",
};

function parseActionables(markdown) {
  // Titles occasionally wrap onto a second line before the closing ** (e.g. items 9 and 11) --
  // [\s\S] (rather than .) matches across newlines so those aren't silently dropped.
  const itemPattern = /^(\d+)\.\s+(✅|🔨|🔜)\s+\*\*([\s\S]+?)\*\*/gmu;
  const items = [];
  for (const match of markdown.matchAll(itemPattern)) {
    const [, id, statusEmoji, rawTitle] = match;
    items.push({
      id: Number(id),
      externalRef: `A${id}`,
      statusEmoji,
      stateType: statusToStateType[statusEmoji] ?? "unstarted",
      title: rawTitle.replace(/\s+/g, " ").replace(/\.$/, "").trim(),
    });
  }
  return items;
}

async function linearRequest(query, variables) {
  const response = await fetch(LINEAR_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors) {
    throw new Error(`Linear API error: ${JSON.stringify(payload.errors ?? payload)}`);
  }
  return payload.data;
}

async function fetchTeamAndStates() {
  const data = await linearRequest(
    `query TeamStates($key: String!) {
      teams(filter: { key: { eq: $key } }) {
        nodes {
          id
          name
          states { nodes { id name type } }
        }
      }
    }`,
    { key: teamKey },
  );
  const team = data.teams.nodes[0];
  if (!team) throw new Error(`No Linear team found with key '${teamKey}'.`);
  return team;
}

function pickStateForType(team, stateType) {
  const candidates = team.states.nodes.filter((state) => state.type === stateType);
  if (candidates.length === 0) {
    throw new Error(`Team '${team.name}' has no workflow state of type '${stateType}'.`);
  }
  return candidates[0];
}

async function findExistingIssue(team, externalRef) {
  const data = await linearRequest(
    `query FindIssue($teamId: String!, $query: String!) {
      issueSearch(filter: { team: { id: { eq: $teamId } } }, query: $query, first: 5) {
        nodes { id identifier title state { id type } }
      }
    }`,
    { teamId: team.id, query: externalRef },
  );
  return data.issueSearch.nodes.find((issue) => issue.title.startsWith(`${externalRef}:`));
}

async function upsertIssue(team, item) {
  const targetState = pickStateForType(team, item.stateType);
  const title = `${item.externalRef}: ${item.title}`;
  const existing = await findExistingIssue(team, item.externalRef);

  if (existing) {
    if (existing.state.id === targetState.id) {
      return { action: "unchanged", identifier: existing.identifier, title };
    }
    await linearRequest(
      `mutation UpdateIssue($id: String!, $stateId: String!) {
        issueUpdate(id: $id, input: { stateId: $stateId }) { success }
      }`,
      { id: existing.id, stateId: targetState.id },
    );
    return { action: "updated", identifier: existing.identifier, title, newState: targetState.name };
  }

  const created = await linearRequest(
    `mutation CreateIssue($teamId: String!, $title: String!, $stateId: String!) {
      issueCreate(input: { teamId: $teamId, title: $title, stateId: $stateId }) {
        issue { identifier }
      }
    }`,
    { teamId: team.id, title, stateId: targetState.id },
  );
  return { action: "created", identifier: created.issueCreate.issue.identifier, title, newState: targetState.name };
}

async function main() {
  const markdown = fs.readFileSync(actionablesPath, "utf8");
  const items = parseActionables(markdown);
  console.log(`[linear-sync] Parsed ${items.length} actionables from PRE_DEMO_ACTIONABLES.md.`);

  if (!apiKey || !teamKey) {
    console.log("[linear-sync] LINEAR_API_KEY and/or LINEAR_TEAM_KEY not set -- dry-run only, no network calls will be made.");
    console.log("[linear-sync] Plan:");
    for (const item of items) {
      console.log(`  ${item.externalRef} [${item.statusEmoji} -> ${item.stateType}]: ${item.title}`);
    }
    console.log("[linear-sync] Set LINEAR_API_KEY and LINEAR_TEAM_KEY to actually sync. See docs/LINEAR_SYNC.md.");
    return;
  }

  const team = await fetchTeamAndStates();
  console.log(`[linear-sync] Syncing into Linear team '${team.name}' (${teamKey}).`);

  for (const item of items) {
    const result = await upsertIssue(team, item);
    console.log(`  [${result.action}] ${result.identifier ?? "?"} ${result.title}${result.newState ? ` -> ${result.newState}` : ""}`);
  }
  console.log("[linear-sync] Done.");
}

main().catch((error) => {
  console.error(`[linear-sync] Failed: ${error.message}`);
  process.exit(1);
});
