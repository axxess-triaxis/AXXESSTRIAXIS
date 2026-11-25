// Runs the golden set through the real RAG code against a disposable local Supabase stack.
//
// Nothing here reimplements retrieval. Documents are written by ingestTenantDocument and questions go
// through answerTenantQuestion, with the same Supabase repositories POST /api/rag/query passes in and a
// real signed-in user token, so row-level security, PostgREST, pgvector and the embed function all take
// part. The three modes are the ways production itself degrades:
//   semantic  the embed function is configured
//   fulltext  it is not, so full-text search narrows the documents and the token hash ranks them
//   hash      it is not, and there is no full-text repository, so the token hash ranks every document
//
// It refuses any host that is not local. It creates users and documents and must never be pointed at a
// shared or production project.

import { randomBytes, randomUUID } from "node:crypto";
import type { RoleName } from "../../../domain";
import type { TenantScope } from "../../../repositories/interfaces";
import { supabaseAdminRest } from "../../../repositories/supabaseAdmin";
import {
  documentPermissionsRepository,
  documentsRepository,
  documentVersionsRepository,
  knowledgeArticlesRepository,
  ragFullTextSearchRepository,
} from "../../../repositories/supabaseEnterpriseRepositories";
import { answerTenantQuestion, ingestTenantDocument, type TenantRagRepositories } from "../tenantRagWorkflow";
import type { GoldenSet } from "./goldenSet";
import { tenantOfDocument } from "./goldenSet";
import type { RetrievalMode, RetrievalObservation } from "./retrievalScoring";

export type HarnessBackend = { url: string; anonKey: string; serviceRoleKey: string; embedSecret: string };
export type HarnessState = {
  scopes: Record<string, TenantScope>;
  documentIds: Record<string, string>;
  chunks: number;
};

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
// No model provider may be reachable: this measures retrieval, costs nothing, and must not depend on a
// third party. Answers then come from the local extractive path.
const PROVIDER_KEY = /(GROQ|OPENAI|OPENROUTER|ANTHROPIC|GEMINI|GOOGLE|XAI|DEEPSEEK|MOONSHOT|KIMI).*(KEY|TOKEN)/;

export function assertLocalBackend(url: string) {
  const { hostname } = new URL(url);
  if (!LOCAL_HOSTS.has(hostname)) throw new Error(`The RAG gate only runs against a local Supabase stack, not ${hostname}.`);
}

export function configureEnvironment(backend: HarnessBackend, mode: RetrievalMode) {
  assertLocalBackend(backend.url);
  for (const name of Object.keys(process.env)) if (PROVIDER_KEY.test(name)) delete process.env[name];
  process.env.NEXT_PUBLIC_SUPABASE_URL = backend.url;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = backend.anonKey;
  process.env.SUPABASE_SERVICE_ROLE_KEY = backend.serviceRoleKey;
  delete process.env.SUPABASE_SECRET_KEY;
  if (mode === "semantic") process.env.EMBED_FUNCTION_SECRET = backend.embedSecret;
  else delete process.env.EMBED_FUNCTION_SECRET;
}

function repositoriesFor(mode: RetrievalMode): TenantRagRepositories {
  return {
    documentsRepository,
    documentVersionsRepository,
    documentPermissionsRepository,
    knowledgeArticlesRepository,
    ...(mode === "hash" ? {} : { ragFullTextSearchRepository }),
  };
}

async function authRequest<T>(backend: HarnessBackend, path: string, key: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${backend.url}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Auth ${path} failed: ${response.status} ${await response.text()}`);
  return await response.json() as T;
}

function insert(table: string, body: Record<string, unknown> | Record<string, unknown>[]) {
  return supabaseAdminRest<Array<Record<string, unknown>>>(table, { method: "POST", body });
}

/** Creates the tenants and users, then indexes every document through the real ingestion path. */
export async function prepareGoldenSet(backend: HarnessBackend, golden: GoldenSet): Promise<HarnessState> {
  configureEnvironment(backend, "semantic");
  const run = randomUUID().slice(0, 8);
  const organizationIds: Record<string, string> = {};

  for (const tenant of golden.corpus.tenants) {
    const id = randomUUID();
    organizationIds[tenant.key] = id;
    await insert("organizations", { id, tenant_id: id, name: tenant.name, slug: `${tenant.slug}-${run}`, sector: tenant.sector });
  }

  const scopes: Record<string, TenantScope> = {};
  for (const user of golden.corpus.users) {
    const organizationId = organizationIds[user.tenant];
    const email = `${user.key}.${run}@rag-golden.test`;
    const password = randomBytes(24).toString("base64url");
    const created = await authRequest<{ id: string }>(backend, "admin/users", backend.serviceRoleKey, { email, password, email_confirm: true });
    const profile = { id: created.id, email, display_name: user.key, avatar_initials: "RG" };
    await insert("profiles", profile);
    // The sync_user_access trigger grants the database role from this row, as it does for real users.
    await insert("users", { ...profile, organization_id: organizationId, role: user.role, status: "active" });
    await insert("organization_members", { organization_id: organizationId, user_id: created.id, title: user.role, status: "active" });
    const session = await authRequest<{ access_token: string }>(backend, "token?grant_type=password", backend.anonKey, { email, password });
    scopes[user.key] = { organizationId, userId: created.id, role: user.role as RoleName, accessToken: session.access_token };
  }

  // Wake the embed function up first: its first request loads the model, and a cold start longer than
  // the client timeout would silently leave the first document without an embedding.
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(`${backend.url}/functions/v1/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-embed-secret": backend.embedSecret },
      body: JSON.stringify({ texts: ["warm up"] }),
    }).catch((error: unknown) => error as Error);
    if (response instanceof Response && response.ok) break;
    const detail = response instanceof Response ? `${response.status} ${await response.text()}` : response.message;
    if (attempt === 10) throw new Error(`The embed function did not become ready after ${attempt} attempts. Last: ${detail}`);
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  const documentIds: Record<string, string> = {};
  let expectedChunks = 0;
  for (const document of golden.corpus.documents) {
    const scope = scopes[document.owner];
    const result = await ingestTenantDocument(repositoriesFor("semantic"), scope, {
      title: document.title,
      bodyText: document.body,
      visibility: document.visibility,
      classification: document.classification,
    });
    documentIds[document.key] = result.document.id;
    expectedChunks += result.chunkCount;
    for (const reader of document.sharedWith ?? []) {
      await insert("document_permissions", {
        organization_id: organizationIds[tenantOfDocument(golden.corpus, document)],
        document_id: result.document.id,
        principal_type: "user",
        principal_id: scopes[reader].userId,
        access_level: "viewer",
      });
    }
    if (document.archived) await documentsRepository.archive(scope, result.document.id);
  }

  // Ingestion keeps going without an embedding when the embed function fails. That is right for users
  // and wrong for a measurement, so every chunk must be stored and embedded before any question is asked.
  const chunks = await supabaseAdminRest<Array<{ id: string; embedding: string | null }>>("rag_document_chunks", {
    query: new URLSearchParams({ select: "id,embedding", organization_id: `in.(${Object.values(organizationIds).join(",")})`, limit: "1000" }),
  });
  const missing = chunks.filter((chunk) => !chunk.embedding).length;
  if (chunks.length !== expectedChunks) throw new Error(`Expected ${expectedChunks} stored chunks, found ${chunks.length}.`);
  if (missing > 0) throw new Error(`${missing} of ${chunks.length} chunks have no embedding.`);

  return { scopes, documentIds, chunks: chunks.length };
}

/** Asks every golden question in one mode and reports exactly what came back. */
export async function observeMode(
  backend: HarnessBackend,
  golden: GoldenSet,
  state: HarnessState,
  mode: RetrievalMode,
): Promise<RetrievalObservation[]> {
  configureEnvironment(backend, mode);
  const keyById = new Map(Object.entries(state.documentIds).map(([key, id]) => [id, key]));
  const repositories = repositoriesFor(mode);
  const observations: RetrievalObservation[] = [];
  for (const question of golden.questions) {
    try {
      const answer = await answerTenantQuestion(repositories, state.scopes[question.user], question.question, { limit: 5 });
      observations.push({
        questionId: question.id,
        sources: answer.sources.map((source) => ({
          key: keyById.get(source.sourceId) ?? null,
          score: source.score,
          excerpt: source.excerpt,
          title: source.title,
        })),
        answer: answer.answer,
        humanReviewRequired: answer.humanReviewRequired,
        servedBy: answer.retrievalMode ?? "unknown",
      });
    } catch (error) {
      observations.push({
        questionId: question.id,
        sources: [],
        answer: "",
        humanReviewRequired: false,
        servedBy: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return observations;
}
