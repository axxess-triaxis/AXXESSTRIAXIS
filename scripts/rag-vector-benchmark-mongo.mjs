// MongoDB half of the vector search benchmark. PRIVATE: run it on your own machine, never in CI.
//
//   node scripts/rag-vector-benchmark-mongo.mjs --export <export.json.gz>
//        a MongoDB Atlas Local container on 127.0.0.1:27117
//   node scripts/rag-vector-benchmark-mongo.mjs --export <export.json.gz> --atlas-host <host> --atlas-user <user>
//        an Atlas cluster. The password is asked for with hidden input and is not stored or printed. Use a
//        database user limited to readWrite on rag_benchmark.
//
// Results go to test-results/, which is gitignored. Do not commit or post them: MongoDB's Customer
// Agreement section 4(f) restricts publishing benchmark results. Synthetic data only.
//
// It answers the searches recorded by scripts/rag-vector-benchmark.mjs, then the same seeded scale
// requests. It does not run answerTenantQuestion: where the candidates match pgvector's, everything after
// them is the same code on the same input.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { gunzipSync } from "node:zlib";
import { Binary, MongoClient } from "mongodb";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, "test-results", "rag-vector-benchmark-mongo");
const LOCAL_PORT = 27117;
const SCORE_TOLERANCE = 1e-4;
const ATLAS_MAX_ROWS = 20_000;

function notMeasured(reason) {
  console.error(`MongoDB vector benchmark: not measured. ${reason}`);
  process.exit(2);
}
if (process.env.CI) notMeasured("Its results are private, so it does not run in CI.");

const { values: args } = parseArgs({
  options: { export: { type: "string" }, "atlas-host": { type: "string" }, "atlas-user": { type: "string" }, "max-rows": { type: "string" } },
});
if (!args.export) notMeasured("Pass --export with the export.json.gz from a CI run.");
const atlas = Boolean(args["atlas-host"]);
if (atlas && !args["atlas-user"]) notMeasured("--atlas-host also needs --atlas-user.");

const { runnerImport } = await import("vite");
const load = async (file) => (await runnerImport(path.join(ROOT, "src/services/rag/evaluation/vectorBenchmark", file), { root: ROOT, configFile: false, logLevel: "error" })).module;
const { scoreRun } = await load("exactSearch.ts");
const { buildScaleCorpus, buildScaleRequests } = await load("scaleCorpus.ts");
const { BENCHMARK_DATABASE, BENCHMARK_INDEX, assertBenchmarkTarget, atlasScoreToCosine, scoreProblems, vectorIndexDefinition, vectorSearchPipeline } =
  await load("mongoCandidates.ts");

const host = args["atlas-host"] ?? "127.0.0.1";
assertBenchmarkTarget({ kind: atlas ? "atlas" : "local", host, database: BENCHMARK_DATABASE });

function askHidden(question) {
  return new Promise((resolve) => {
    const terminal = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    terminal.question(question, (answer) => { terminal.close(); process.stdout.write("\n"); resolve(answer); });
    terminal._writeToOutput = () => {};
  });
}
// The password goes to the driver as an option, never into a URL, so no error message can contain it.
const client = atlas
  ? new MongoClient(`mongodb+srv://${host}/?compressors=zlib`, { auth: { username: args["atlas-user"], password: await askHidden(`Password for ${args["atlas-user"]} (hidden): `) } })
  : new MongoClient(`mongodb://127.0.0.1:${LOCAL_PORT}/?directConnection=true`);

const exported = JSON.parse(gunzipSync(readFileSync(args.export)).toString("utf8"));
const golden = exported.golden.map((set) => ({ ...set, rows: set.rows.map((row) => ({ ...row, vector: Float32Array.from(row.vector) })) }));
const base = golden.flatMap((set) => set.rows.map((row) => row.vector));
const queryBase = golden.flatMap((set) => set.searches.map((search) => search.request.vector));
const maxRows = Math.min(Number(args["max-rows"] ?? Infinity), atlas ? ATLAS_MAX_ROWS : Infinity);

const results = { target: atlas ? "atlas" : "local container", exportCommit: exported.commit, measuredAt: new Date().toISOString(), partA: [], partB: [], breakages: [], failures: [] };

async function withCollection(rows, work) {
  const collection = client.db(BENCHMARK_DATABASE).collection(`vectors_${Date.now()}`);
  await client.db(BENCHMARK_DATABASE).createCollection(collection.collectionName);
  try {
    for (let from = 0; from < rows.length; from += 2000) {
      await collection.insertMany(rows.slice(from, from + 2000).map((row) => ({
        _id: row.id, organizationId: row.organizationId, documentId: row.documentId, embedding: Binary.fromFloat32Array(row.vector),
      })));
    }
    await collection.createSearchIndex({ name: BENCHMARK_INDEX, type: "vectorSearch", definition: vectorIndexDefinition(rows[0].vector.length) });
    const deadline = Date.now() + 10 * 60_000;
    for (;;) {
      const [index] = await collection.listSearchIndexes(BENCHMARK_INDEX).toArray();
      // Queryable is not complete: wait until an unfiltered exact search can see every row it should.
      if (index?.queryable) {
        const probe = { id: "ready", organizationId: "", documentIds: [], vector: [...rows[0].vector], limit: Math.min(rows.length, 10_000) };
        const seen = await collection.aggregate(vectorSearchPipeline(probe, { exact: true, dropFilters: ["organization", "document"] })).toArray();
        if (seen.length === probe.limit && index.status === "READY") break;
      }
      if (Date.now() > deadline) throw new Error(`The index was not ready after 10 minutes (status ${index?.status}).`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    return await work(collection);
  } finally {
    await collection.drop();
  }
}

async function run(collection, requests, options, convert = atlasScoreToCosine) {
  const runs = [];
  for (const request of requests) {
    const started = performance.now();
    const found = await collection.aggregate(vectorSearchPipeline(request, options)).toArray();
    runs.push({ request, hits: found.map((hit) => ({ id: hit._id, score: convert(hit.score) })), milliseconds: performance.now() - started });
  }
  return runs;
}

function checkScores(rows, runs) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return runs.flatMap(({ request, hits }) => scoreProblems(byId, request, hits, SCORE_TOLERANCE));
}

try {
  await client.connect();
  results.server = (await client.db(BENCHMARK_DATABASE).command({ buildInfo: 1 })).version;

  for (const set of golden) {
    await withCollection(set.rows, async (collection) => {
      const requests = set.searches.map((search) => search.request);
      for (const exact of [false, true]) {
        const runs = await run(collection, requests, { exact });
        const problems = checkScores(set.rows, runs);
        if (problems.length > 0) throw new Error(`Scores are not (1 + cosine) / 2, so nothing can be compared. First: ${problems[0]}`);
        const same = runs.filter(({ hits }, index) => JSON.stringify(hits.map((hit) => hit.id)) === JSON.stringify(set.searches[index].hits.map((hit) => hit.id))).length;
        results.partA.push({ set: set.version, arm: exact ? "exact" : "ann", searches: runs.length, sameOrderAsPgvector: same, ...scoreRun(set.rows, runs) });
      }
    });
  }

  for (const size of exported.sizes.filter((value) => value <= maxRows)) {
    const corpus = buildScaleCorpus(base, size, exported.seed);
    const requests = buildScaleRequests(corpus, queryBase, exported.seed);
    await withCollection(corpus.rows, async (collection) => {
      for (const exact of [false, true]) {
        await run(collection, requests, { exact }); // warm the cache; not counted
        const runs = await run(collection, requests, { exact });
        const problems = checkScores(corpus.rows, runs);
        if (problems.length > 0) results.failures.push(`${size}: ${problems.length} scores differ from cosine. First: ${problems[0]}`);
        for (const group of new Set(requests.map((request) => request.group))) {
          const scored = scoreRun(corpus.rows, runs.filter((entry) => entry.request.group === group));
          results.partB.push({ size, arm: exact ? "exact" : "ann", group, ...scored });
          if (scored.crossTenant + scored.unlisted + scored.unknown > 0) results.failures.push(`${size} ${group}: candidates outside the request.`);
        }
      }
      if (size === exported.sizes[0]) {
        const broken = async (dropFilters) => scoreRun(corpus.rows, await run(collection, requests, { exact: true, dropFilters }));
        const wrongScores = await run(collection, requests.slice(0, 5), { exact: true }, (score) => score);
        results.breakages = [
          { id: "organization filter removed", caught: (await broken(["organization"])).crossTenant > 0 },
          { id: "document filter removed", caught: (await broken(["document"])).unlisted > 0 },
          { id: "score conversion wrong", caught: checkScores(corpus.rows, wrongScores).length > 0 },
        ];
        for (const breakage of results.breakages) if (!breakage.caught) results.failures.push(`Breakage not caught: ${breakage.id}.`);
      }
    });
    console.error(`${size} rows measured.`);
  }
} finally {
  await client.close();
}

mkdirSync(OUTPUT, { recursive: true });
const file = path.join(OUTPUT, `results-${atlas ? "atlas" : "local"}.json`);
writeFileSync(file, `${JSON.stringify(results, null, 2)}\n`);
console.log(`Private results: ${file}`);
console.table(results.partA.map(({ set, arm, searches, sameOrderAsPgvector, recall, crossTenant }) => ({ set, arm, searches, sameOrderAsPgvector, recall, crossTenant })));
console.table(results.partB.map(({ size, arm, group, recall, returned, expected, shortResults, p50, p95 }) => ({ size, arm, group, recall, returned, expected, shortResults, p50, p95 })));
for (const failure of results.failures) console.error(`FAILED: ${failure}`);
process.exitCode = results.failures.length === 0 ? 0 : 1;
