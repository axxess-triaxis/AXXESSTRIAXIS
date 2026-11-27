// Refreshes the generated block of a README from public GitHub data. No dependencies; Node 20+.
//
//   node readme-activity.mjs repo    --repo owner/name [--readme README.md] [--days 14] [--active-days 7] [--check-url URL]...
//   node readme-activity.mjs profile --owner login     [--readme README.md] [--days 14]
//   node readme-activity.mjs active  --owner login [--hours 24]
//   node readme-activity.mjs guard   --before FILE --after FILE
//
// Only the text between the two markers is ever changed. Nothing is written when only the date would differ.
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const START = "<!-- readme-activity:start (generated; edits here are overwritten) -->";
export const END = "<!-- readme-activity:end -->";
const DATE_LINE = /^<sub>Generated .*<\/sub>$/m;
const MAX_REPO_ROWS = 8;
const MAX_PROFILE_ROWS = 3;

export function isBot(login, type) {
  return type === "Bot" || /\[bot\]$/.test(login ?? "") || login === "web-flow";
}

/** A title worth showing: a product change, not a docs, dependency, housekeeping or generated commit. */
export function isShown(title, exclude) {
  const text = title.trim();
  if (!text || /^merge (pull request|branch|remote-tracking)/i.test(text)) return false;
  if (/^(docs?|chore|ci|test|tests|style|build|copy|deps|gtm)\b[^:]*:/i.test(text)) return false;
  if (/^update (metrics\.svg|readme stats card|readme activity)/i.test(text)) return false;
  return !(exclude && exclude.test(text));
}

/** Titles are other people's text: one line, no markup, no mentions. */
export function clean(title) {
  return title
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/([\\`*_[\]|!~])/g, "\\$1")
    .replace(/@/g, "&#64;");
}

const note = (source, date, days) =>
  `<sub>Generated ${date} from ${source}, last ${days} days. Documentation, dependency and housekeeping changes are left out.</sub>`;

export function repoBlock({ date, days, items, hidden, checks = [] }) {
  const lines = [START, "## Recent changes", "", note("this repository's history", date, days), ""];
  if (items.length) {
    lines.push("| Date | Change |", "|---|---|");
    for (const item of items) lines.push(`| ${item.date} | [${clean(item.title)}](${item.url}) |`);
    if (hidden > 0) lines.push("", `And ${hidden} more in the same period.`);
  } else lines.push("None in this period.");
  if (checks.length) {
    lines.push("", "| Live check | Result |", "|---|---|");
    for (const check of checks) lines.push(`| ${check.url} | ${check.result} |`);
  }
  return [...lines, END].join("\n");
}

export function profileBlock({ date, days, repos }) {
  const lines = [START, "## Recent work", "", note("the public history of my repositories", date, days), ""];
  const rows = repos.filter((repo) => repo.items.length);
  if (rows.length) {
    lines.push("| Repository | Date | Change |", "|---|---|---|");
    for (const repo of rows)
      for (const item of repo.items)
        lines.push(`| [${clean(repo.name)}](${repo.url}) | ${item.date} | [${clean(item.title)}](${item.url}) |`);
  } else lines.push("None in this period.");
  return [...lines, END].join("\n");
}

/** Puts the block into the README. Returns the same text when only the generated date would change. */
export function applyBlock(readme, block) {
  const eol = readme.includes("\r\n") ? "\r\n" : "\n";
  const text = readme.replace(/\r\n/g, "\n");
  const starts = text.split(START).length - 1;
  const ends = text.split(END).length - 1;
  if (starts === 0 && ends === 0) throw new Error("README has no readme-activity markers");
  if (starts !== 1 || ends !== 1 || text.indexOf(END) < text.indexOf(START)) throw new Error("README markers are broken");
  const from = text.indexOf(START);
  const to = text.indexOf(END) + END.length;
  const undated = (value) => value.replace(DATE_LINE, "");
  if (undated(text.slice(from, to)) === undated(block)) return readme;
  return (text.slice(0, from) + block + text.slice(to)).replace(/\n/g, eol);
}

/** True only when the two versions are identical outside the markers. */
export function onlyBlockChanged(before, after) {
  const outside = (value) => {
    const text = value.replace(/\r\n/g, "\n");
    const from = text.indexOf(START);
    const to = text.indexOf(END);
    if (from < 0 || to < from) return null;
    return JSON.stringify([text.slice(0, from), text.slice(to + END.length)]);
  };
  const a = outside(before);
  return a !== null && a === outside(after);
}

async function api(path, { allow = [] } = {}) {
  const headers = { accept: "application/vnd.github+json", "user-agent": "readme-activity", "x-github-api-version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(30_000) });
  if (allow.includes(response.status)) return [];
  if (!response.ok) throw new Error(`GitHub ${response.status} for ${path}`);
  return response.json();
}

const day = (iso) => iso.slice(0, 10);

async function recentItems(repo, branch, since, exclude) {
  const merged = [];
  for (let page = 1; page <= 5; page += 1) {
    const pulls = await api(
      `/repos/${repo}/pulls?state=closed&base=${encodeURIComponent(branch)}&sort=updated&direction=desc&per_page=100&page=${page}`,
    );
    merged.push(...pulls.filter((pull) => pull.merged_at && pull.merged_at >= since));
    if (pulls.length < 100 || pulls.at(-1).updated_at < since) break;
  }
  const human = merged.filter((pull) => !isBot(pull.user?.login, pull.user?.type));
  if (human.length)
    return human
      .sort((a, b) => b.merged_at.localeCompare(a.merged_at))
      .filter((pull) => isShown(pull.title, exclude))
      .map((pull) => ({ title: pull.title, url: pull.html_url, date: day(pull.merged_at) }));
  // No merged pull requests: this repository takes commits directly. 409 means it is empty.
  const commits = await api(`/repos/${repo}/commits?sha=${encodeURIComponent(branch)}&since=${since}&per_page=100`, { allow: [409] });
  return commits
    .filter((commit) => commit.parents.length < 2 && !isBot(commit.author?.login, commit.author?.type))
    .map((commit) => ({
      title: commit.commit.message.split("\n")[0],
      url: commit.html_url,
      date: day(commit.commit.committer.date),
    }))
    .filter((item) => isShown(item.title, exclude));
}

/** Somebody other than a bot committed to the default branch since the given time. */
async function hadActivity(repo, branch, since) {
  const commits = await api(`/repos/${repo}/commits?sha=${encodeURIComponent(branch)}&since=${since}&per_page=100`, { allow: [409] });
  return commits.some((commit) => !isBot(commit.author?.login, commit.author?.type));
}

async function ownRepos(owner) {
  const repos = await api(`/users/${owner}/repos?type=owner&sort=pushed&per_page=100`);
  return repos.filter((repo) => !repo.fork && !repo.archived && !repo.private && !repo.disabled);
}

async function liveCheck(url) {
  try {
    const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(30_000) });
    return { url, result: `HTTP ${response.status}` };
  } catch {
    return { url, result: "no response" };
  }
}

function output(name, value) {
  console.log(`${name}=${value}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function parse(argv) {
  const options = { "check-url": [] };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "");
    if (argv[i + 1] === undefined) throw new Error(`--${key} needs a value`);
    if (key === "check-url") options[key].push(argv[i + 1]);
    else options[key] = argv[i + 1];
  }
  return options;
}

async function main([mode, ...rest]) {
  const options = parse(rest);
  const now = Date.now();
  const ago = (days) => new Date(now - days * 86_400_000).toISOString().replace(/\.\d+Z$/, "Z");
  const date = new Date(now).toISOString().slice(0, 10);
  const days = Number(options.days ?? 14);
  const exclude = process.env.README_EXCLUDE_TITLES ? new RegExp(process.env.README_EXCLUDE_TITLES, "i") : undefined;

  if (mode === "guard") {
    if (!onlyBlockChanged(readFileSync(options.before, "utf8"), readFileSync(options.after, "utf8")))
      throw new Error("README changed outside the generated block");
    console.log("README changed only inside the generated block");
    return;
  }

  if (mode === "active") {
    const since = ago(Number(options.hours ?? 24) / 24);
    const profile = `${options.owner}/${options.owner}`.toLowerCase();
    let active = false;
    for (const repo of await ownRepos(options.owner)) {
      if (repo.full_name.toLowerCase() === profile || repo.pushed_at < since) continue;
      const events = await api(`/repos/${repo.full_name}/activity?time_period=week&per_page=100`);
      if (events.some((event) => event.timestamp >= since && !isBot(event.actor?.login, event.actor?.type))) {
        console.log(`Activity in ${repo.full_name}`);
        active = true;
        break;
      }
    }
    output("active", active);
    return;
  }

  const readmePath = options.readme ?? "README.md";
  const readme = readFileSync(readmePath, "utf8");
  let block;
  if (mode === "repo") {
    const info = await api(`/repos/${options.repo}`);
    if (options["active-days"] && !(await hadActivity(options.repo, info.default_branch, ago(Number(options["active-days"]))))) {
      console.log(`No activity in ${options["active-days"]} days`);
      output("changed", false);
      return;
    }
    const items = await recentItems(options.repo, info.default_branch, ago(days), exclude);
    const checks = await Promise.all(options["check-url"].map(liveCheck));
    block = repoBlock({ date, days, items: items.slice(0, MAX_REPO_ROWS), hidden: items.length - MAX_REPO_ROWS, checks });
  } else if (mode === "profile") {
    const since = ago(days);
    const repos = [];
    for (const repo of await ownRepos(options.owner)) {
      if (repo.name.toLowerCase() === options.owner.toLowerCase() || repo.pushed_at < since) continue;
      const items = await recentItems(repo.full_name, repo.default_branch, since, exclude);
      repos.push({ name: repo.name, url: repo.html_url, items: items.slice(0, MAX_PROFILE_ROWS) });
    }
    block = profileBlock({ date, days, repos });
  } else throw new Error(`Unknown mode: ${mode}`);

  const next = applyBlock(readme, block);
  if (next !== readme) writeFileSync(readmePath, next);
  output("changed", next !== readme);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main(process.argv.slice(2)).catch((error) => {
    console.error(`readme-activity: ${error.message}`);
    process.exitCode = 1;
  });
