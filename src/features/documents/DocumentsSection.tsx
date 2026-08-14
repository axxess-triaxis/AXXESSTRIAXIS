"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { WorkflowTimelinePanel } from "../../components/enterprise/WorkflowTimelinePanel";
import { EmptyState } from "../../components/feedback/EmptyState";
import { Card } from "../../components/ui/Card";
import { isDemoModeEnabled } from "../../demo/demoMode";
import type { Document } from "../../domain";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { useWorkflowTimeline } from "../../hooks/useWorkflowTimeline";
import { useAnalytics } from "../../services/analytics";
import { Filter, Plus, Sparkles } from "lucide-react";

// Illustrative content for the investor-demo experience only -- this browse list isn't wired to
// the real documentsRepository yet (data shapes differ; ingestion above is real, browsing below
// is not). Gated behind isDemoModeEnabled(). See DEMO_DATA_LEAKAGE_AUDIT.md.
const documents = applicationServices.institutionalRepository.getDocuments();

// RAG Remediation Sprint 1 (RAG1-03/08): documents a HITL user can pick as an indexing target.
// Excludes archived/deleted rows for the same reason governedRag.ts's canRetrieveDocument does --
// an archived document should not be selectable for (re-)indexing into live governed retrieval.
export function selectableDocumentsForIndexing(candidates: Document[]): Document[] {
  return candidates.filter((document) => document.status !== "archived" && document.status !== "deleted");
}

export const DocumentsSection = () => {
  const { session } = useAuth();
  const user = session.user;
  const analytics = useAnalytics();
  const scope = user ? tenantScopeFromUser(user) : undefined;
  const [showIngest, setShowIngest] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [form, setForm] = useState({
    title: "",
    bodyText: "",
    classification: "internal",
    visibility: "organization",
  });
  const [indexableDocuments, setIndexableDocuments] = useState<Document[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const documentTimeline = useWorkflowTimeline(scope, { limit: 5, resourceType: "document" });

  const loadIndexableDocuments = useCallback(async () => {
    if (!scope) return;
    try {
      const rows = await applicationServices.documentsRepository.list(scope, { pageSize: 500 });
      setIndexableDocuments(selectableDocumentsForIndexing(rows));
    } catch {
      setIndexableDocuments([]);
    }
  }, [scope]);

  useEffect(() => {
    if (showIngest) void loadIndexableDocuments();
  }, [showIngest, loadIndexableDocuments]);

  const selectedDocument = indexableDocuments.find((document) => document.id === selectedDocumentId);

  async function ingestDocument() {
    // Sprint 2 (Live Golden Path Execution): the HITL's walkthrough hit the server's own
    // "Document title and text are required for ingestion." validation error despite the form
    // visibly showing both fields filled. The server-side check itself is correct; this guard
    // makes the same requirement checkable and correctable *before* a network round-trip, so an
    // empty-after-trim field (leading/trailing whitespace only, or a field cleared after a prior
    // attempt) is caught with specific, actionable copy instead of the generic server message.
    if (!selectedDocumentId && !form.title.trim()) {
      setMessage({ tone: "error", text: "Enter a document title before indexing." });
      return;
    }
    if (!form.bodyText.trim()) {
      setMessage({ tone: "error", text: "Enter the document text before indexing." });
      return;
    }
    setIngesting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/documents/ingest", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, documentId: selectedDocumentId || undefined }),
      });
      const result = await response.json().catch(() => ({} as { error?: string; chunkCount?: number; reindexedExistingDocument?: boolean }));
      if (!response.ok) throw new Error(result.error ?? "Document ingestion failed.");
      setMessage({
        tone: "success",
        text: result.reindexedExistingDocument
          ? `"${selectedDocument?.title ?? selectedDocument?.name ?? "Document"}" indexed with ${result.chunkCount ?? 0} governed chunks.`
          : `Document indexed with ${result.chunkCount ?? 0} governed chunks.`,
      });
      analytics.trackEvent("document_uploaded", { classification: form.classification, visibility: form.visibility }, {
        organization_id: scope?.organizationId,
        user_id: scope?.userId,
        module_name: "documents",
        route: "/documents",
      });
      analytics.trackEvent("rag_ingestion_completed", { chunk_count: result.chunkCount ?? 0 }, {
        organization_id: scope?.organizationId,
        user_id: scope?.userId,
        module_name: "documents",
        route: "/documents",
      });
      setForm({ title: "", bodyText: "", classification: "internal", visibility: "organization" });
      setSelectedDocumentId("");
      void loadIndexableDocuments();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Document ingestion failed." });
    } finally {
      setIngesting(false);
    }
  }

  return (
    <div>
      <SectionHeader
        title="Documents & File Intelligence"
        subtitle="AI-assisted document analysis across all mission programs"
        action={
          <div className="flex items-center gap-2">
            <button className="text-xs border border-[rgba(0,0,0,0.1)] text-[#5F6B73] px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-[#F2F3F5]">
              <Filter size={12} /> Filter
            </button>
            <button onClick={() => setShowIngest((current) => !current)} className="text-xs bg-[#8B1E2D] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-[#7a1a27]">
              <Plus size={12} /> Upload
            </button>
          </div>
        }
      />

      {showIngest && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/30 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="upload-document-title">
        <Card className="w-full max-w-2xl p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-[#8B1E2D]" />
              <h3 id="upload-document-title" className="text-sm font-semibold text-[#0F1117]">Index a document for governed retrieval</h3>
            </div>
            <button type="button" onClick={() => setShowIngest(false)} aria-label="Close" className="rounded-lg px-2 py-1 text-xs font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]">
              Close
            </button>
          </div>
          <label className="mb-3 block">
            <span className="mb-1 block text-[11px] font-semibold text-[#0F1117]">Index an uploaded document</span>
            <select
              value={selectedDocumentId}
              onChange={(event) => setSelectedDocumentId(event.target.value)}
              className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E2D]"
            >
              <option value="">New document (paste text only)</option>
              {indexableDocuments.map((document) => (
                <option key={document.id} value={document.id}>{document.title ?? document.name}</option>
              ))}
            </select>
            {indexableDocuments.length === 0 && (
              <span className="mt-1 block text-[11px] text-[#5F6B73]">No uploaded Knowledge Hub documents are available yet -- upload one in Knowledge Hub first, or paste text below to create a new one.</span>
            )}
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-[#0F1117]">Document title</span>
              {selectedDocument ? (
                <div className="w-full rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#F8F9FA] px-3 py-2 text-sm text-[#5F6B73]">{selectedDocument.title ?? selectedDocument.name}</div>
              ) : (
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E2D]" />
              )}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-[#0F1117]">Classification</span>
                {selectedDocument ? (
                  <div className="w-full rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#F8F9FA] px-3 py-2 text-sm text-[#5F6B73] capitalize">{selectedDocument.classification ?? "internal"}</div>
                ) : (
                  <select value={form.classification} onChange={(event) => setForm({ ...form, classification: event.target.value })} className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E2D]">
                    {["public", "internal", "confidential", "restricted"].map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                )}
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-[#0F1117]">Visibility</span>
                {selectedDocument ? (
                  <div className="w-full rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#F8F9FA] px-3 py-2 text-sm text-[#5F6B73] capitalize">{selectedDocument.visibility ?? "organization"}</div>
                ) : (
                  <select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value })} className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E2D]">
                    {["private", "department", "organization", "shared"].map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                )}
              </label>
            </div>
          </div>
          {selectedDocument && (
            <p className="mt-2 text-[11px] text-[#5F6B73]">Title, classification, and visibility are inherited from the selected document and cannot be changed here.</p>
          )}
          <label className="mt-3 block">
            <span className="mb-1 block text-[11px] font-semibold text-[#0F1117]">Document text</span>
            <span className="mb-1 block text-[11px] text-[#5F6B73]">Automatic text extraction from PDFs and other files isn&apos;t available yet -- paste the text to index below.</span>
            <textarea value={form.bodyText} onChange={(event) => setForm({ ...form, bodyText: event.target.value })} rows={6} className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E2D]" />
          </label>
          {message && <p className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${message.tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{message.text}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowIngest(false)} className="rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-xs font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]">
              Cancel
            </button>
            <button onClick={() => void ingestDocument()} disabled={ingesting} className="rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60">
              {ingesting ? "Indexing..." : "Index document"}
            </button>
          </div>
        </Card>
        </div>
      )}

      <div className="mb-4">
        <WorkflowTimelinePanel
          title="Document workflow timeline"
          description="Uploads, selected-message imports, indexing, RAG use and audit evidence for the tenant knowledge base."
          events={documentTimeline.timeline}
          compact
        />
      </div>

      <div className="space-y-3">
        {!isDemoModeEnabled() && documents.length === 0 && (
          <EmptyState message="No documents indexed yet. Use Upload above to index your first document." />
        )}
        {documents.map((document) => (
          <Card key={document.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${document.type === "PDF" ? "bg-red-50 text-red-700" : document.type === "XLSX" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                {document.type}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-[#0F1117] leading-snug">{document.name}</h4>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {document.tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-medium text-[#5F6B73] bg-[#F2F3F5] px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono text-[#8B1E2D] bg-[#8B1E2D]/8 px-1.5 py-0.5 rounded">{document.project}</span>
                  <span className="text-[11px] text-[#5F6B73]">{document.size}</span>
                  <span className="text-[11px] text-[#5F6B73]">-</span>
                  <span className="text-[11px] text-[#5F6B73]">Modified {document.modified}</span>
                </div>
                <div className="flex items-start gap-1.5 bg-[#F8F9FA] rounded-lg px-3 py-2">
                  <Sparkles size={11} className="text-[#8B1E2D] mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-[#5F6B73] leading-relaxed">{document.aiSummary}</p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DocumentsSection;
