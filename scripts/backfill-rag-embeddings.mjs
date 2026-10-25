#!/usr/bin/env node
// Backfill gte-small embeddings for rag_document_chunks rows indexed before semantic retrieval
// existed (migration 20261005120000_rag_chunk_embeddings_gte_small.sql). New ingestions write
// embeddings themselves (tenantRagWorkflow.ts); this only fills the gap for older chunks.
//
// Idempotent and resumable: it only touches rows where embedding is null, one page at a time,
// so a re-run after an interruption picks up where it stopped. It writes nothing but the
// embedding column. Never prints keys or secrets.
//
// Needs: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) and
// EMBED_FUNCTION_SECRET in the environment. Usage:
//   node scripts/backfill-rag-embeddings.mjs --dry-run   # count only
//   node scripts/backfill-rag-embeddings.mjs             # embed and write

const PAGE = 32; // matches the app's batch size; the embed function accepts up to 64
const dryRun = process.argv.includes("--dry-run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const embedSecret = process.env.EMBED_FUNCTION_SECRET;
const missing = [
  !url && "NEXT_PUBLIC_SUPABASE_URL",
  !serviceKey && "SUPABASE_SECRET_KEY",
  !embedSecret && !dryRun && "EMBED_FUNCTION_SECRET",
].filter(Boolean);
if (missing.length) {
  console.error(`[backfill-rag-embeddings] missing env: ${missing.join(", ")}`);
  process.exit(1);
}

const rest = (path, init = {}) => fetch(`${url}/rest/v1/${path}`, {
  ...init,
  headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", ...init.headers },
});

async function pendingCount() {
  const response = await rest("rag_document_chunks?select=id&embedding=is.null", { method: "HEAD", headers: { Prefer: "count=exact" } });
  if (!response.ok) throw new Error(`count failed: HTTP ${response.status} (is the embedding migration applied?)`);
  return Number(response.headers.get("content-range")?.split("/")[1] ?? 0);
}

async function embed(texts) {
  const response = await fetch(`${url}/functions/v1/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-embed-secret": embedSecret },
    body: JSON.stringify({ texts }),
  });
  if (!response.ok) throw new Error(`embed function: HTTP ${response.status}`);
  const { embeddings } = await response.json();
  if (!Array.isArray(embeddings) || embeddings.length !== texts.length || embeddings.some((v) => v?.length !== 384)) {
    throw new Error("embed function returned an unexpected shape");
  }
  return embeddings;
}

const total = await pendingCount();
console.log(`[backfill-rag-embeddings] ${total} chunk(s) without an embedding`);
if (dryRun || total === 0) process.exit(0);

let done = 0;
for (;;) {
  const page = await rest(`rag_document_chunks?select=id,chunk_text&embedding=is.null&order=id&limit=${PAGE}`);
  if (!page.ok) throw new Error(`read failed: HTTP ${page.status}`);
  const rows = await page.json();
  if (rows.length === 0) break;

  const vectors = await embed(rows.map((row) => row.chunk_text));
  for (let i = 0; i < rows.length; i += 1) {
    const update = await rest(`rag_document_chunks?id=eq.${rows[i].id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ embedding: `[${vectors[i].join(",")}]` }),
    });
    if (!update.ok) throw new Error(`update failed for one chunk: HTTP ${update.status}`);
  }
  done += rows.length;
  console.log(`[backfill-rag-embeddings] ${done}/${total}`);
}
console.log(`[backfill-rag-embeddings] done: ${done} chunk(s) embedded; ${await pendingCount()} remaining`);
