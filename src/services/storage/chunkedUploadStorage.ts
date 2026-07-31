// Shared server-side helpers for the chunked document upload flow. All calls here are
// service-to-service (our route handler -> Supabase Storage REST), authenticated with the
// caller's own session access token so RLS is enforced exactly as it is for every other
// Supabase-backed write in this app -- no elevated/service-role credential involved.
import { DOCUMENT_STORAGE_BUCKET } from "./documentStorage";

export type SupabaseStorageConfig = { url: string; anonKey: string };

export function getSupabaseConfig(): SupabaseStorageConfig | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return undefined;
  return { url, anonKey };
}

export function encodeStoragePath(path: string) {
  return path.split("/").map((part) => encodeURIComponent(part)).join("/");
}

// Temp chunks live under the same organizations/{orgId}/... prefix the bucket's RLS policies
// already key off (see 202607040001_sprint9_knowledge_hub.sql) -- no new policy needed.
export function tempChunkPath(organizationId: string, uploadId: string, chunkIndex: number) {
  return `organizations/${organizationId}/_upload-chunks/${uploadId}/${chunkIndex}`;
}

export async function putStorageObject(config: SupabaseStorageConfig, path: string, body: ArrayBuffer | Buffer, accessToken: string, mimeType = "application/octet-stream") {
  const response = await fetch(`${config.url}/storage/v1/object/${DOCUMENT_STORAGE_BUCKET}/${encodeStoragePath(path)}`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": mimeType,
      "x-upsert": "true",
    },
    body: Buffer.isBuffer(body) ? new Uint8Array(body) : body,
    cache: "no-store",
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Supabase Storage write failed for ${path}: ${response.status} ${message}`);
  }
}

export async function getStorageObject(config: SupabaseStorageConfig, path: string, accessToken: string): Promise<ArrayBuffer> {
  const response = await fetch(`${config.url}/storage/v1/object/${DOCUMENT_STORAGE_BUCKET}/${encodeStoragePath(path)}`, {
    method: "GET",
    headers: { apikey: config.anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Supabase Storage read failed for ${path}: ${response.status} ${message}`);
  }
  return response.arrayBuffer();
}

export async function deleteStorageObject(config: SupabaseStorageConfig, path: string, accessToken: string) {
  const response = await fetch(`${config.url}/storage/v1/object/${DOCUMENT_STORAGE_BUCKET}/${encodeStoragePath(path)}`, {
    method: "DELETE",
    headers: { apikey: config.anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Supabase Storage delete failed for ${path}: ${response.status} ${message}`);
  }
}
