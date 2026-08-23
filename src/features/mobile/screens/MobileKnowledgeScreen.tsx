"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import type { Document, KnowledgeArticle } from "../../../domain";
import { applicationServices } from "../../../providers/serviceProvider";
import type { KnowledgeSearchResult } from "../../../repositories/interfaces";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { useMobileTenantScope } from "../useMobileTenantScope";
import { useMobileTabletLayout } from "../useMobileTabletLayout";
import { useRegisterMobileBackHandler } from "../MobileBackHandlerContext";

type SelectedItem = { type: "document"; item: Document } | { type: "article"; item: KnowledgeArticle };

// MN-2 (2026-08-23): real Knowledge Hub workflow -- recent documents + articles via
// documentsRepository/knowledgeArticlesRepository, real full-text search via
// knowledgeSearchRepository.search (same repositories desktop KnowledgeHubSection.tsx uses).
// "Search-index status" is deliberately not a fabricated freshness badge -- there is no such signal
// anywhere in this codebase's repositories, so this screen instead reports the real, computed match
// count from the search call itself, honest per docs/readiness's evidence-chain rule.
export function MobileKnowledgeScreen() {
  const scope = useMobileTenantScope();
  const isTablet = useMobileTabletLayout();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SelectedItem | null>(null);

  // MN-4 (2026-08-23): Android back button -- pops the phone-layout detail view back to the list.
  // On tablet there's no separate detail "screen" to leave (list and detail render side by side).
  useRegisterMobileBackHandler(() => {
    if (!isTablet && selected) {
      setSelected(null);
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (!scope) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      applicationServices.documentsRepository.list(scope, { pageSize: 50 }),
      applicationServices.knowledgeArticlesRepository.list(scope, { pageSize: 50 }),
    ])
      .then(([docRows, articleRows]) => {
        if (cancelled) return;
        setDocuments(docRows);
        setArticles(articleRows);
      })
      .catch(() => {
        if (cancelled) return;
        setDocuments([]);
        setArticles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  async function handleSearch() {
    if (!scope || !query.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const results = await applicationServices.knowledgeSearchRepository.search(scope, { search: query.trim(), pageSize: 30 });
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleOpenDocument(doc: Document) {
    try {
      const url = await applicationServices.storageRepository.getSignedDownloadUrl(doc.storagePath);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      // Resilient by design (see serviceProvider's withResilientFallback) -- a failed signed-URL
      // request already falls back to undefined rather than throwing; nothing further to do here.
    }
  }

  const displayList = useMemo(() => {
    if (searchResults) return searchResults;
    return [
      ...documents.map((item) => ({ type: "document" as const, item })),
      ...articles.map((item) => ({ type: "article" as const, item })),
    ];
  }, [searchResults, documents, articles]);

  if (loading) return <LoadingState label="Knowledge Hub" />;

  const listPanel = (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search documents and articles…"
          className="min-h-[44px] flex-1 rounded-lg border border-[rgba(15,17,23,0.12)] px-3 text-sm"
        />
        <button onClick={handleSearch} aria-label="Search" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-[#8B1E2D] text-white">
          <Search size={16} />
        </button>
      </div>
      {searchResults && (
        <p className="text-xs text-[#5F6B73]">{searching ? "Searching…" : `${searchResults.length} match${searchResults.length === 1 ? "" : "es"} found`}</p>
      )}

      {displayList.length === 0 ? (
        <EmptyState title={searchResults ? "No matches" : "Nothing here yet"} message={searchResults ? "Try a different search term." : "Documents and articles for your organization will appear here."} />
      ) : (
        <div className="flex flex-col gap-2">
          {displayList.map((entry) => (
            <button
              key={`${entry.type}-${entry.item.id}`}
              onClick={() => setSelected(entry)}
              className="flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-[rgba(15,17,23,0.08)] bg-white px-3.5 py-3 text-left"
            >
              <FileText size={18} className="flex-shrink-0 text-[#8B1E2D]" />
              <span className="flex-1 min-w-0">
                <span className="block truncate text-sm font-medium text-[#0F1117]">
                  {entry.type === "document" ? (entry.item.title ?? entry.item.name) : entry.item.title}
                </span>
                <span className="block text-[11px] text-[#5F6B73]">{entry.type === "document" ? "Document" : "Article"}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const detailPanel = selected ? (
    selected.type === "document" ? (
      <div className="flex flex-col gap-3 px-4 py-4">
        <h2 className="text-base font-semibold text-[#0F1117]">{selected.item.title ?? selected.item.name}</h2>
        {selected.item.description && <p className="text-sm text-[#5F6B73]">{selected.item.description}</p>}
        <p className="text-xs text-[#5F6B73]">Updated {new Date(selected.item.updatedAt).toLocaleDateString()}</p>
        <button onClick={() => handleOpenDocument(selected.item)} className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#8B1E2D] px-4 text-sm font-semibold text-white">
          Open document
        </button>
        {!isTablet && <button onClick={() => setSelected(null)} className="text-xs font-medium text-[#8B1E2D]">← Back to list</button>}
      </div>
    ) : (
      <div className="flex flex-col gap-3 px-4 py-4">
        <h2 className="text-base font-semibold text-[#0F1117]">{selected.item.title}</h2>
        {selected.item.summary && <p className="text-sm text-[#5F6B73]">{selected.item.summary}</p>}
        <p className="whitespace-pre-wrap text-sm text-[#0F1117]">{selected.item.bodyMarkdown}</p>
        {!isTablet && <button onClick={() => setSelected(null)} className="text-xs font-medium text-[#8B1E2D]">← Back to list</button>}
      </div>
    )
  ) : (
    <EmptyState title="Select an item" message="Choose a document or article to view it." />
  );

  if (isTablet) {
    return (
      <div className="flex h-full">
        <div className="w-[42%] flex-shrink-0 overflow-y-auto border-r border-[rgba(0,0,0,0.06)]">{listPanel}</div>
        <div className="flex-1 overflow-y-auto">{detailPanel}</div>
      </div>
    );
  }

  return selected ? detailPanel : listPanel;
}
