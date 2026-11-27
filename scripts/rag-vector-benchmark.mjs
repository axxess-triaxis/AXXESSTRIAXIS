// pgvector half of the vector search benchmark. Runs in CI against the throwaway Supabase stack.
//
//   Part A  the golden sets through the real retrieval code, recording every similarity search
//   Part B  the shipped match_rag_document_chunks on larger, skewed, seeded tenants, against brute force
//
// It also writes export.json.gz, which scripts/rag-vector-benchmark-mongo.mjs answers privately. No
// MongoDB software runs here and no MongoDB number is written. See
// docs/readiness/RAG_VECTOR_BENCHMARK_PLAN_2026_11_25.md.
//
// Part B truncates rag_document_chunks, so this refuses to start outside CI.

import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVALUATION = "src/services/rag/evaluation";
const OUTPUT = path.join(ROOT, "test-results", "rag-vector-benchmark");
const DATABASE_CONTAINER = "supabase_db_axxess-triaxis";
const SEED = 20261125;
const SIZES = [2000, 20000, 50000];

function notMeasured(reason) {
  console.error(`Vector benchmark: not measured. ${reason}`);
  console.log(JSON.stringify({ benchmark: "rag-vector-benchmark", status: "not_measured", reason }, null, 2));
  process.exit(2);
}

if (process.env.CI !== "true") notMeasured("It truncates a table, so it only runs on a CI runner's throwaway database.");
const names = { url: "RAG_GATE_SUPABASE_URL", anonKey: "RAG_GATE_ANON_KEY", serviceRoleKey: "RAG_GATE_SERVICE_ROLE_KEY", embedSecret: "RAG_GATE_EMBED_SECRET" };
const missing = Object.values(names).filter((name) => !process.env[name]);
if (missing.length > 0) notMeasured(`Set ${missing.join(", ")} for a local Supabase stack.`);
const backend = Object.fromEntries(Object.entries(names).map(([key, name]) => [key, process.env[name]]));

const { runnerImport } = await import("vite");
async function load(file) {
  const { module } = await runnerImport(path.join(ROOT, EVALUATION, file), { root: ROOT, configFile: false, logLevel: "error" });
  return module;
}
const harness = await load("retrievalHarness.ts");
const { gateFailures, scoreMode } = await load("retrievalScoring.ts");
const { scoreRun } = await load("vectorBenchmark/exactSearch.ts");
const { recordMatchRequests } = await load("vectorBenchmark/recordRequests.ts");
const { buildScaleCorpus, buildScaleRequests } = await load("vectorBenchmark/scaleCorpus.ts");
harness.assertLocalBackend(backend.url);

const readJson = (version, file) => JSON.parse(readFileSync(path.join(ROOT, EVALUATION, "golden", version, file), "utf8"));

/** supabase_admin is the local image's superuser; "postgres" is its published local default password. */
function psql(sql, { stderr = false } = {}) {
  const output = execFileSync(
    "docker",
    ["exec", "-i", "-e", "PGPASSWORD=postgres", DATABASE_CONTAINER, "sh", "-c",
      `psql -h 127.0.0.1 -U supabase_admin -d postgres -XqAt -v ON_ERROR_STOP=1 ${stderr ? "2>&1" : ""}`],
    { input: sql, encoding: "utf8", maxBuffer: 1 << 30 },
  );
  return output.trim();
}

// ---- Part A
const failures = [];
const golden = [];
const partA = [];
for (const version of ["v1", "v2"]) {
  const set = { corpus: readJson(version, "corpus.json"), questions: readJson(version, "questions.json").questions };
  const thresholds = readJson(version, "thresholds.json");
  const state = await harness.prepareGoldenSet(backend, set);
  const recorder = recordMatchRequests(globalThis.fetch);
  const original = globalThis.fetch;
  globalThis.fetch = recorder.fetch;
  let observations;
  try {
    observations = await harness.observeMode(backend, set, state, "semantic");
  } finally {
    globalThis.fetch = original;
  }
  if (recorder.failures.length > 0) failures.push(`${version}: ${recorder.failures.length} similarity searches failed.`);
  const { metrics } = scoreMode(set, "semantic", observations);
  failures.push(...gateFailures(set, metrics, thresholds.modes.semantic).map((failure) => `${version}: ${failure}`));

  const organizations = [...new Set(Object.values(state.scopes).map((scope) => scope.organizationId))];
  const rows = psql(
    `select id, organization_id, document_id, embedding::text from public.rag_document_chunks
     where organization_id in (${organizations.map((id) => `'${id}'`).join(",")}) order by metadata ->> 'title', chunk_index;`,
  ).split("\n").map((line) => {
    const [id, organizationId, documentId, embedding] = line.split("|");
    return { id, organizationId, documentId, vector: Float32Array.from(JSON.parse(embedding)) };
  });
  if (rows.length !== state.chunks) failures.push(`${version}: exported ${rows.length} of ${state.chunks} chunks.`);
  const raw = scoreRun(rows, recorder.recorded.map(({ request, hits }) => ({ request, hits, milliseconds: 0 })));
  if (raw.recall < 1 || raw.crossTenant + raw.unlisted + raw.unknown > 0) failures.push(`${version}: pgvector candidates differ from exact search (recall ${raw.recall}).`);
  golden.push({ version, rows, searches: recorder.recorded });
  partA.push({ version, questions: set.questions.length, searches: recorder.recorded.length, metrics, candidateRecall: raw.recall, crossTenant: raw.crossTenant, unlisted: raw.unlisted });
}

// ---- Part B
const base = golden.flatMap((set) => set.rows.map((row) => row.vector));
const queryBase = golden.flatMap((set) => set.searches.map((search) => search.request.vector));
const pgvector = psql("select extversion from pg_extension where extname = 'vector';");
const postgres = psql("show server_version;");
const iterative = Number(pgvector.split(".").slice(0, 2).join(".")) >= 0.8;

// The shipped function, plus copies with a filter removed to show that this benchmark would notice.
const SHIPPED = "public.match_rag_document_chunks";
const ARMS = [
  { id: "shipped", settings: "", fn: SHIPPED },
  { id: "ef_search 200", settings: "set hnsw.ef_search = 200;", fn: SHIPPED },
  ...(iterative ? [{ id: "iterative scan", settings: "set hnsw.iterative_scan = 'strict_order';", fn: SHIPPED }] : []),
  { id: "exact (index off)", settings: "set enable_indexscan = off;", fn: SHIPPED },
];
const BREAKAGES = [
  { id: "organization filter removed", fn: "bench.match_no_organization", settings: "set enable_indexscan = off;", caught: (result) => result.crossTenant > 0 },
  { id: "document filter removed", fn: "bench.match_no_document", settings: "set enable_indexscan = off;", caught: (result) => result.unlisted > 0 },
];
psql(`
  create schema bench;
  create table bench.requests (ord int primary key, org uuid, docs uuid[], vec extensions.vector(384), lim int);
  create table bench.results (ord int, ids uuid[], scores double precision[], ms double precision);
  create function bench.match_no_organization(uuid, uuid[], extensions.vector, int) returns table (id uuid, similarity double precision)
    language sql stable set search_path = public, extensions as $$
      select c.id, 1 - (c.embedding <=> $3) from public.rag_document_chunks c where c.document_id = any($2) order by c.embedding <=> $3 limit $4 $$;
  create function bench.match_no_document(uuid, uuid[], extensions.vector, int) returns table (id uuid, similarity double precision)
    language sql stable set search_path = public, extensions as $$
      select c.id, 1 - (c.embedding <=> $3) from public.rag_document_chunks c where c.organization_id = $1 order by c.embedding <=> $3 limit $4 $$;
`);

const PREPARE = "set search_path = public, extensions; select '[1]'::vector;";

function runArm(arm, requests) {
  psql(`${PREPARE} ${arm.settings}
    truncate bench.results;
    do $$ declare r record; started timestamptz; i uuid[]; s double precision[];
    begin
      for r in select * from bench.requests order by ord loop
        started := clock_timestamp();
        select array_agg(m.id order by m.similarity desc), array_agg(m.similarity order by m.similarity desc) into i, s
          from ${arm.fn}(r.org, r.docs, r.vec, r.lim) m;
        insert into bench.results values (r.ord, i, s, extract(epoch from clock_timestamp() - started) * 1000);
      end loop;
    end $$;`);
  const lines = psql("select json_build_object('ord', ord, 'ids', coalesce(ids, '{}'), 'scores', coalesce(scores, '{}'), 'ms', ms) from bench.results order by ord;").split("\n");
  return lines.map((line) => {
    const { ord, ids, scores, ms } = JSON.parse(line);
    return { request: requests[ord], hits: ids.map((id, index) => ({ id, score: scores[index] })), milliseconds: ms };
  });
}

// auto_explain reports the plan Postgres used inside the function, which a plain EXPLAIN would not show.
function plan(arm, ord) {
  const output = psql(`load 'auto_explain'; set auto_explain.log_min_duration = 0; set auto_explain.log_analyze = on;
    set auto_explain.log_nested_statements = on; set auto_explain.log_parameter_max_length = 0; set client_min_messages = log;
    set search_path = public, extensions; ${arm.settings}
    select count(*) from bench.requests r, lateral ${arm.fn}(r.org, r.docs, r.vec, r.lim) m where r.ord = ${ord};`, { stderr: true });
  return output.slice(0, 6000);
}

const partB = [];
for (const size of SIZES) {
  const corpus = buildScaleCorpus(base, size, SEED);
  const requests = buildScaleRequests(corpus, queryBase, SEED);
  const started = Date.now();
  psql("truncate public.rag_document_chunks cascade; truncate bench.requests;");
  // Batches keep each psql input well under Node's string limit. Nine digits round-trip a float32.
  const pgVector = (vector) => `[${Array.from(vector, (value) => Number(value.toPrecision(9))).join(",")}]`;
  for (let from = 0; from < corpus.rows.length; from += 5000) {
    psql([
      "set session_replication_role = replica;",
      "copy public.rag_document_chunks (id, organization_id, document_id, chunk_index, chunk_text, embedding) from stdin;",
      ...corpus.rows.slice(from, from + 5000).map((row) => [row.id, row.organizationId, row.documentId, 0, "synthetic", pgVector(row.vector)].join("\t")),
      "\\.",
    ].join("\n") + "\n");
  }
  psql([
    "copy bench.requests from stdin;",
    ...requests.map((request, ord) => [ord, request.organizationId, `{${request.documentIds.join(",")}}`, pgVector(request.vector), request.limit].join("\t")),
    "\\.",
    "analyze public.rag_document_chunks;",
  ].join("\n") + "\n");
  const loadSeconds = (Date.now() - started) / 1000;
  const stored = Number(psql("select count(*) from public.rag_document_chunks where embedding is not null;"));
  if (stored !== size) failures.push(`${size}: stored ${stored} rows.`);

  const groups = [...new Set(requests.map((request) => request.group))];
  for (const arm of ARMS) {
    runArm(arm, requests); // warm the cache; not counted
    const runs = runArm(arm, requests);
    const byGroup = Object.fromEntries(groups.map((group) => [group, scoreRun(corpus.rows, runs.filter((run) => run.request.group === group))]));
    const plans = Object.fromEntries(groups.map((group) => [group, plan(arm, requests.findIndex((request) => request.group === group))]));
    partB.push({ size, loadSeconds, arm: arm.id, byGroup, plans });
    const leaks = Object.values(byGroup).reduce((sum, result) => sum + result.crossTenant + result.unlisted + result.unknown, 0);
    if (leaks > 0) failures.push(`${size} ${arm.id}: ${leaks} candidates outside the request.`);
    if (arm.id.startsWith("exact") && Object.values(byGroup).some((result) => result.recall < 0.999)) failures.push(`${size}: the exact arm disagrees with brute force.`);
  }
  if (size === SIZES[0]) {
    for (const breakage of BREAKAGES) {
      const caught = breakage.caught(scoreRun(corpus.rows, runArm(breakage, requests)));
      partB.push({ size, breakage: breakage.id, caught });
      if (!caught) failures.push(`Breakage not caught: ${breakage.id}.`);
    }
  }
  console.error(`${size} rows measured (loaded in ${loadSeconds.toFixed(0)} s).`);
}

// ---- Report
const result = {
  benchmark: "rag-vector-benchmark",
  status: failures.length === 0 ? "passed" : "failed",
  commit: process.env.RAG_GATE_COMMIT ?? "unknown",
  measuredAt: new Date().toISOString(),
  versions: { postgres, pgvector },
  seed: SEED,
  failures,
  partA,
  partB,
};
const fixed = (value) => value.toFixed(4);
const report = [
  `## Vector benchmark, pgvector half: ${result.status}`, "",
  `Commit \`${result.commit}\`, measured ${result.measuredAt}. Postgres ${postgres}, pgvector ${pgvector}. Synthetic data only.`,
  "", "### Part A: golden sets, semantic mode", "",
  "| Set | Questions | Recall at 5 | MRR | nDCG at 5 | No-answer correct | Leaks | Errors | Searches | Candidate recall |",
  "|---|---|---|---|---|---|---|---|---|---|",
  ...partA.map(({ version, questions, searches, candidateRecall, metrics: m }) =>
    `| ${version} | ${questions} | ${fixed(m.recallAt5)} | ${fixed(m.mrr)} | ${fixed(m.ndcgAt5)} | ${fixed(m.noAnswerCorrectness)} | ${m.crossTenantLeaks + m.unauthorizedLeaks} | ${m.errors} | ${searches} | ${fixed(candidateRecall)} |`),
  "", "### Part B: filtered search at scale", "",
  "| Rows | Arm | Requests | Recall at 50 | Returned | Exist | Short results | p50 ms | p95 ms |",
  "|---|---|---|---|---|---|---|---|---|",
  ...partB.filter((entry) => entry.arm).flatMap(({ size, arm, byGroup }) => Object.entries(byGroup).map(([group, r]) =>
    `| ${size} | ${arm} | ${group} ${r.requests} | ${fixed(r.recall)} | ${r.returned} | ${r.expected} | ${r.shortResults} | ${r.p50.toFixed(2)} | ${r.p95.toFixed(2)} |`)),
  "", ...partB.filter((entry) => entry.breakage).map((entry) => `- Breakage, ${entry.breakage}: ${entry.caught ? "caught" : "NOT CAUGHT"}`),
  ...(failures.length > 0 ? ["", "### Failures", "", ...failures.map((failure) => `- ${failure}`)] : []),
  "",
].join("\n");
mkdirSync(OUTPUT, { recursive: true });
writeFileSync(path.join(OUTPUT, "results.json"), `${JSON.stringify(result, null, 2)}\n`);
writeFileSync(path.join(OUTPUT, "report.md"), report);
writeFileSync(path.join(OUTPUT, "export.json.gz"), gzipSync(JSON.stringify({
  commit: result.commit, seed: SEED, sizes: SIZES,
  golden: golden.map((set) => ({ ...set, rows: set.rows.map((row) => ({ ...row, vector: [...row.vector] })) })),
})));
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
process.exitCode = failures.length === 0 ? 0 : 1;
