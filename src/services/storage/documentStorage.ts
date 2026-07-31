import type { DocumentKind } from "../../domain";
import type {
  DocumentFileUploadRequest,
  DocumentFileUploadResult,
  DocumentStorageIntent,
  DocumentStorageRequest,
  StorageRepository,
} from "../../repositories/interfaces";

export const DOCUMENT_STORAGE_BUCKET = "axxess-documents";
export const MAX_DOCUMENT_UPLOAD_BYTES = 50 * 1024 * 1024;

export const allowedDocumentMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/json",
] as const;

const allowedMimeTypeSet = new Set<string>(allowedDocumentMimeTypes);

const extensionKind: Record<string, DocumentKind> = {
  pdf: "pdf",
  doc: "docx",
  docx: "docx",
  xls: "xlsx",
  xlsx: "xlsx",
  ppt: "pptx",
  pptx: "pptx",
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  webp: "image",
  txt: "text",
  md: "markdown",
  markdown: "markdown",
  url: "link",
};

export function inferDocumentKind(fileName: string, mimeType?: string): DocumentKind {
  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "text/markdown" || mimeType === "text/x-markdown") return "markdown";
  if (mimeType === "text/plain" || mimeType === "application/json") return "text";
  if (mimeType?.includes("wordprocessingml") || mimeType === "application/msword") return "docx";
  if (mimeType?.includes("spreadsheetml") || mimeType === "application/vnd.ms-excel") return "xlsx";
  if (mimeType?.includes("presentationml") || mimeType === "application/vnd.ms-powerpoint") return "pptx";

  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return extensionKind[extension] ?? "unknown";
}

export function sanitizeStorageFileName(fileName: string) {
  const trimmed = fileName.trim() || "document";
  return trimmed
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 160);
}

export function buildDocumentStoragePath(organizationId: string, documentId: string, versionId: string, fileName: string) {
  return [
    "organizations",
    organizationId,
    "documents",
    documentId,
    "versions",
    versionId,
    sanitizeStorageFileName(fileName),
  ].join("/");
}

export function documentPathBelongsToOrganization(path: string, organizationId: string) {
  const parts = path.split("/");
  return parts[0] === "organizations" && parts[1] === organizationId && parts[2] === "documents";
}

export function validateDocumentUpload(input: { fileName: string; mimeType?: string; sizeBytes?: number }) {
  const mimeType = input.mimeType?.trim() || "application/octet-stream";
  const sizeBytes = input.sizeBytes ?? 0;

  if (sizeBytes > MAX_DOCUMENT_UPLOAD_BYTES) {
    return `File must be ${Math.floor(MAX_DOCUMENT_UPLOAD_BYTES / 1024 / 1024)}MB or smaller.`;
  }

  if (!allowedMimeTypeSet.has(mimeType) && inferDocumentKind(input.fileName, mimeType) === "unknown") {
    return "File type is not supported for enterprise document storage.";
  }

  return undefined;
}

async function requestStorageIntent(action: "upload" | "download", input: DocumentStorageRequest): Promise<DocumentStorageIntent> {
  const response = await fetch("/api/documents/storage-url", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...input }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error ?? "Document storage request failed.");
  }

  return await response.json() as DocumentStorageIntent;
}

// Vercel serverless functions cap an incoming request body at ~4.5MB; this stays safely under
// that so every chunk POST to our own same-origin route succeeds regardless of how large the
// whole file is (up to the 50MB bucket limit). See KNOWLEDGE_HUB_UPLOAD_PERSISTENCE_INCIDENT
// _CLOSEOUT_2026_07_26.md for why this is chunked through our own API rather than a direct
// browser-to-Supabase-Storage signed-URL PUT.
const UPLOAD_CHUNK_BYTES = 3.5 * 1024 * 1024;

async function uploadDocumentFile(input: DocumentFileUploadRequest): Promise<DocumentFileUploadResult> {
  const { path, file } = input;
  const uploadId = crypto.randomUUID();
  const totalChunks = Math.max(1, Math.ceil(file.size / UPLOAD_CHUNK_BYTES));
  const mimeType = file.type || "application/octet-stream";

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
    const start = chunkIndex * UPLOAD_CHUNK_BYTES;
    const chunk = file.slice(start, Math.min(start + UPLOAD_CHUNK_BYTES, file.size));
    const query = new URLSearchParams({
      path,
      uploadId,
      chunkIndex: String(chunkIndex),
      totalChunks: String(totalChunks),
      mimeType,
      sizeBytes: String(file.size),
      fileName: file.name,
    });

    const response = await fetch(`/api/documents/upload?${query.toString()}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/octet-stream" },
      body: chunk,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(payload.error ?? `Document upload failed on chunk ${chunkIndex + 1} of ${totalChunks}.`);
    }
  }

  const completeResponse = await fetch("/api/documents/upload/complete", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, uploadId, totalChunks, fileName: file.name, mimeType, sizeBytes: file.size }),
  });

  if (!completeResponse.ok) {
    const payload = await completeResponse.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error ?? "Document upload failed to finalize.");
  }

  return await completeResponse.json() as DocumentFileUploadResult;
}

export const documentStorageRepository: StorageRepository = {
  async getSignedUploadUrl(path) {
    return (await requestStorageIntent("upload", { path })).signedUrl;
  },
  async getSignedDownloadUrl(path) {
    return (await requestStorageIntent("download", { path })).signedUrl;
  },
  createDocumentUploadIntent(input) {
    return requestStorageIntent("upload", input);
  },
  createDocumentDownloadIntent(input) {
    return requestStorageIntent("download", input);
  },
  uploadDocumentFile,
};
