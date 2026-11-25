// RAG release gate: indexes the synthetic golden set in a disposable local Supabase stack, runs the real
// retrieval code in every mode, and fails on any leak, error or drop below the measured baseline.
//
//   node scripts/rag-release-gate.mjs              measure and gate
//   node scripts/rag-release-gate.mjs --self-test  also break retrieval on purpose, and fail unless the
//                                                  gate catches every breakage
//
// Until 2026-11-24 this script scored observations it built from its own fixtures and could not fail.
// It has no such path now: without a database and the embed function there is nothing to measure, and
// that exits 2, never 0. See docs/RAG.md.

import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVALUATION = "src/services/rag/evaluation";
// Measured in this order. Each set is measured and self-tested before the next one is indexed, so adding a
// set never changes the numbers of the ones before it. v1 is for choosing rules, v2 is held out.
const GOLDEN_VERSIONS = ["v1", "v2"];
const SELF_TEST_VERSION = "v1";
const OUTPUT_DIRECTORY = path.join(ROOT, "test-results", "rag-release-gate");

function notMeasured(reason) {
  console.error(`RAG release gate: not measured. ${reason}`);
  console.log(JSON.stringify({ gate: "rag-release-gate", status: "not_measured", reason }, null, 2));
  process.exit(2);
}

function readBackend() {
  const names = { url: "RAG_GATE_SUPABASE_URL", anonKey: "RAG_GATE_ANON_KEY", serviceRoleKey: "RAG_GATE_SERVICE_ROLE_KEY", embedSecret: "RAG_GATE_EMBED_SECRET" };
  const missing = Object.values(names).filter((name) => !process.env[name]);
  if (missing.length > 0) notMeasured(`No retrieval backend: set ${missing.join(", ")} for a local Supabase stack.`);
  return Object.fromEntries(Object.entries(names).map(([key, name]) => [key, process.env[name]]));
}

function readJson(version, file) {
  return JSON.parse(readFileSync(path.join(ROOT, EVALUATION, "golden", version, file), "utf8"));
}

function commit() {
  if (process.env.RAG_GATE_COMMIT) return process.env.RAG_GATE_COMMIT;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const percent = (value) => value.toFixed(4);

function resultsTable(modes) {
  const rows = modes.map(({ metrics: m }) =>
    `| ${m.mode} | ${m.questions} | ${percent(m.recallAt5)} | ${percent(m.mrr)} | ${percent(m.ndcgAt5)} | ${percent(m.noAnswerCorrectness)} | ${percent(m.noAnswerAbstainedOrFlagged)} | ${m.crossTenantLeaks} | ${m.unauthorizedLeaks} | ${m.errors} | ${Object.entries(m.servedBy).map(([name, count]) => `${name} ${count}`).join(", ")} |`);
  return [
    "| Mode | Questions | Recall at 5 | MRR | nDCG at 5 | No-answer correct | No-answer abstained or flagged | Cross-tenant leaks | Unauthorized leaks | Errors | Served by |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
    ...rows,
  ].join("\n");
}

function categoryTable(modes) {
  const rows = modes.flatMap(({ metrics: m }) => Object.entries(m.byCategory).map(([category, c]) =>
    `| ${m.mode} | ${category} | ${c.questions} | ${percent(c.recallAt5)} | ${percent(c.mrr)} | ${percent(c.ndcgAt5)} |`));
  return ["| Mode | Category | Questions with an answer | Recall at 5 | MRR | nDCG at 5 |", "|---|---|---|---|---|---|", ...rows].join("\n");
}

const backend = readBackend();
if (!existsSync(path.join(ROOT, EVALUATION, "retrievalHarness.ts"))) notMeasured("The retrieval harness is missing.");

const { runnerImport } = await import("vite");
const { MUTATIONS, mutationPlugin } = await import("./rag-gate-mutations.mjs");

async function load(file, plugins = []) {
  const { module } = await runnerImport(path.join(ROOT, EVALUATION, file), { root: ROOT, configFile: false, logLevel: "error", plugins });
  return module;
}

const { goldenSetProblems } = await load("goldenSet.ts");
const { RETRIEVAL_MODES, gateFailures, scoreMode } = await load("retrievalScoring.ts");
const harness = await load("retrievalHarness.ts");

async function measureSet(version) {
  const golden = { corpus: readJson(version, "corpus.json"), questions: readJson(version, "questions.json").questions };
  const thresholds = readJson(version, "thresholds.json");
  const problems = goldenSetProblems(golden);
  if (problems.length > 0) notMeasured(`Golden set ${version} is inconsistent: ${problems.join(" ")}`);

  const state = await harness.prepareGoldenSet(backend, golden);
  console.error(`${version}: indexed ${golden.corpus.documents.length} documents as ${state.chunks} chunks for ${golden.corpus.tenants.length} tenants.`);

  const modes = [];
  for (const mode of RETRIEVAL_MODES) {
    const { metrics, scores } = scoreMode(golden, mode, await harness.observeMode(backend, golden, state, mode));
    modes.push({ metrics, scores, failures: gateFailures(golden, metrics, thresholds.modes[mode] ?? {}) });
  }
  const failures = modes.flatMap((mode) => mode.failures);
  for (const mode of RETRIEVAL_MODES) if (!thresholds.modes[mode]) failures.push(`${mode}: no thresholds are set.`);

  const selfTest = [];
  if (version === SELF_TEST_VERSION && process.argv.includes("--self-test")) {
    for (const mutation of MUTATIONS) {
      const { plugin, assertApplied } = mutationPlugin(mutation);
      const broken = await load("retrievalHarness.ts", [plugin]);
      assertApplied();
      for (const mode of mutation.modes) {
        const { metrics } = scoreMode(golden, mode, await broken.observeMode(backend, golden, state, mode));
        const caughtBy = gateFailures(golden, metrics, thresholds.modes[mode] ?? {});
        selfTest.push({ mutation: mutation.id, description: mutation.description, mode, caught: caughtBy.length > 0, caughtBy, metrics });
        if (caughtBy.length === 0) failures.push(`Self-test: ${mutation.id} in ${mode} mode was not caught.`);
      }
    }
  }

  const set = {
    goldenVersion: version,
    documents: golden.corpus.documents.length,
    chunks: state.chunks,
    questions: golden.questions.length,
    failures: failures.map((failure) => `${version}: ${failure}`),
    thresholds: thresholds.modes,
    modes: modes.map(({ metrics }) => metrics),
    selfTest: selfTest.map(({ metrics, ...entry }) => ({
      ...entry,
      recallAt5: metrics.recallAt5,
      mrr: metrics.mrr,
      crossTenantLeaks: metrics.crossTenantLeaks,
      unauthorizedLeaks: metrics.unauthorizedLeaks,
    })),
    perQuestion: Object.fromEntries(modes.map(({ metrics, scores }) => [metrics.mode, scores])),
  };
  return { set, modes };
}

const measured = [];
for (const version of GOLDEN_VERSIONS) measured.push(await measureSet(version));

const failures = measured.flatMap(({ set }) => set.failures);
const result = {
  gate: "rag-release-gate",
  status: failures.length === 0 ? "passed" : "failed",
  commit: commit(),
  measuredAt: new Date().toISOString(),
  failures,
  sets: Object.fromEntries(measured.map(({ set }) => [set.goldenVersion, set])),
};

mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
writeFileSync(path.join(OUTPUT_DIRECTORY, "results.json"), `${JSON.stringify(result, null, 2)}\n`);

function selfTestTable(selfTest) {
  return selfTest.length === 0 ? "" : [
    "", "### Deliberate breakages", "", "| Breakage | Mode | Caught | Reason |", "|---|---|---|---|",
    ...selfTest.map((entry) => `| ${entry.mutation} | ${entry.mode} | ${entry.caught ? "yes" : "NO"} | ${entry.caughtBy.join(" ")} |`),
  ].join("\n");
}
const report = [
  `## RAG release gate: ${result.status}`, "",
  `Commit \`${result.commit}\`, measured ${result.measuredAt}.`,
  ...measured.flatMap(({ set, modes }) => [
    "", `### Golden set ${set.goldenVersion}: ${set.documents} synthetic documents, ${set.chunks} chunks, ${set.questions} questions`,
    "", resultsTable(modes), "", categoryTable(modes), selfTestTable(set.selfTest),
  ]),
  ...(failures.length > 0 ? ["", "### Failures", "", ...failures.map((failure) => `- ${failure}`)] : []),
  "",
].join("\n");
writeFileSync(path.join(OUTPUT_DIRECTORY, "report.md"), report);
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);

process.exitCode = failures.length === 0 ? 0 : 1;
