"use client";

import { useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { WorkflowTimelinePanel } from "../../components/enterprise/WorkflowTimelinePanel";
import { EmptyState } from "../../components/feedback/EmptyState";
import { Card } from "../../components/ui/Card";
import { isDemoModeEnabled } from "../../demo/demoMode";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import { useWorkflowTimeline } from "../../hooks/useWorkflowTimeline";
import { Filter, Plus, Sparkles } from "lucide-react";

// Illustrative content for the investor-demo experience only -- this browse list isn't wired to
// the real documentsRepository yet (data shapes differ; ingestion above is real, browsing below
// is not). Gated behind isDemoModeEnabled(). See DEMO_DATA_LEAKAGE_AUDIT.md.
const documents = applicationServices.institutionalRepository.getDocuments();

export const DocumentsSection = () => {
  const { session } = useAuth();
  const scope = session.user ? tenantScopeFromUser(session.user) : undefined;
  const [showIngest, setShowIngest] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [form, setForm] = useState({
    title: "",
    bodyText: "",
    classification: "internal",
    visibility: "organization",
  });
  const documentTimeline = useWorkflowTimeline(scope, { limit: 5, resourceType: "document" });

  async function ingestDocument() {
    // Sprint 2 (Live Golden Path Execution): the HITL's walkthrough hit the server's own
    // "Document title and text are required for ingestion." validation error despite the form
    // visibly showing both fields filled. The server-side check itself is correct; this guard
    // makes the same requirement checkable and correctable *before* a network round-trip, so an
    // empty-after-trim field (leading/trailing whitespace only, or a field cleared after a prior
    // attempt) is caught with specific, actionable copy instead of the generic server message.
    if (!form.title.trim() || !form.bodyText.trim()) {
      setMessage({ tone: "error", text: !form.title.trim() ? "Enter a document title before indexing." : "Enter the document text before indexing." });
      return;
    }
    setIngesting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/documents/ingest", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => ({} as { error?: string; chunkCount?: number }));
      if (!response.ok) throw new Error(result.error ?? "Document ingestion failed.");
      setMessage({ tone: "success", text: `Document indexed with ${result.chunkCount ?? 0} governed chunks.` });
      setForm({ title: "", bodyText: "", classification: "internal", visibility: "organization" });
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
        <Card className="mb-4 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={14} className="text-[#8B1E2D]" />
            <h3 className="text-sm font-semibold text-[#0F1117]">Ingest governed document text</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-[#0F1117]">Document title</span>
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E2D]" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-[#0F1117]">Classification</span>
                <select value={form.classification} onChange={(event) => setForm({ ...form, classification: event.target.value })} className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E2D]">
                  {["public", "internal", "confidential", "restricted"].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-[#0F1117]">Visibility</span>
                <select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value })} className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E2D]">
                  {["private", "department", "organization", "shared"].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
            </div>
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-[11px] font-semibold text-[#0F1117]">Document text</span>
            <textarea value={form.bodyText} onChange={(event) => setForm({ ...form, bodyText: event.target.value })} rows={6} className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E2D]" />
          </label>
          {message && <p className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${message.tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{message.text}</p>}
          <button onClick={() => void ingestDocument()} disabled={ingesting} className="mt-3 rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60">
            {ingesting ? "Indexing..." : "Index document"}
          </button>
        </Card>
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
