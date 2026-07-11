import type { TenantScope } from "../interfaces";
import type { RagIngestionRecord } from "../../services/rag/ingestion/ingestionPipeline";
import type { VectorRecord } from "../../services/rag/vector-store/vectorStore";

export interface RagChunkRepository {
  listByDocument(scope: TenantScope, documentId: string): Promise<VectorRecord[]>;
  upsertChunks(scope: TenantScope, records: VectorRecord[]): Promise<void>;
}

export interface RagIngestionRepository {
  listIngestionStatus(scope: TenantScope): Promise<RagIngestionRecord[]>;
  upsertIngestionStatus(scope: TenantScope, record: RagIngestionRecord): Promise<RagIngestionRecord>;
}

export class InMemoryRagRepository implements RagChunkRepository, RagIngestionRepository {
  private chunks: VectorRecord[] = [];
  private statuses = new Map<string, RagIngestionRecord>();

  async listByDocument(scope: TenantScope, documentId: string) {
    return this.chunks.filter((chunk) => chunk.organizationId === scope.organizationId && chunk.documentId === documentId);
  }

  async upsertChunks(scope: TenantScope, records: VectorRecord[]) {
    const scoped = records.filter((record) => record.organizationId === scope.organizationId);
    this.chunks = [...this.chunks.filter((chunk) => !scoped.some((record) => record.id === chunk.id)), ...scoped];
  }

  async listIngestionStatus(scope: TenantScope) {
    return [...this.statuses.values()].filter((record) => record.organizationId === scope.organizationId);
  }

  async upsertIngestionStatus(scope: TenantScope, record: RagIngestionRecord) {
    if (record.organizationId !== scope.organizationId) throw new Error("cross-tenant RAG ingestion is not allowed");
    this.statuses.set(record.documentId, record);
    return record;
  }
}

