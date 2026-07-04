import {
  Archive,
  BookOpen,
  Clock3,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Heart,
  ImageIcon,
  Link2,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Tag,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { EmptyState } from "../../components/feedback/EmptyState";
import { LoadingState } from "../../components/feedback/LoadingState";
import { InlineToast } from "../../components/forms/InlineToast";
import { SelectField, TextAreaField, TextField } from "../../components/forms/FormField";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Card } from "../../components/ui/Card";
import type { Document, DocumentActivity, DocumentCategory, DocumentTag, DocumentVisibility, KnowledgeArticle } from "../../domain";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import {
  buildDocumentStoragePath,
  inferDocumentKind,
  validateDocumentUpload,
} from "../../services/storage/documentStorage";
import {
  fallbackDocumentActivity,
  fallbackDocumentCategories,
  fallbackDocuments,
  fallbackDocumentTags,
  fallbackKnowledgeArticles,
} from "./knowledgeHubData";

type HubTab = "documents" | "articles" | "categories" | "tags" | "search" | "recent" | "shared" | "favorites" | "archived";

const tabs: { id: HubTab; label: string; icon: typeof FileText }[] = [
  { id: "documents", label: "Documents", icon: FileText },
  { id: "articles", label: "Knowledge Base", icon: BookOpen },
  { id: "categories", label: "Categories", icon: FolderOpen },
  { id: "tags", label: "Tags", icon: Tag },
  { id: "search", label: "Search", icon: Search },
  { id: "recent", label: "Recent Activity", icon: Clock3 },
  { id: "shared", label: "Shared With Me", icon: ShieldCheck },
  { id: "favorites", label: "Favorites", icon: Heart },
  { id: "archived", label: "Archived", icon: Archive },
];

const visibilityOptions: { value: DocumentVisibility; label: string }[] = [
  { value: "private", label: "Private" },
  { value: "team", label: "Team" },
  { value: "department", label: "Department" },
  { value: "organization", label: "Organization" },
  { value: "shared", label: "Shared" },
];

function formatBytes(size?: number) {
  if (!size) return "Size pending";
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value?: string) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function documentBadge(document: Document) {
  const type = document.documentType ?? inferDocumentKind(document.fileName ?? document.name, document.mimeType);
  if (type === "image") return { label: "IMG", icon: ImageIcon, tone: "bg-emerald-50 text-emerald-700" };
  if (type === "pdf") return { label: "PDF", icon: FileText, tone: "bg-red-50 text-red-700" };
  if (type === "markdown") return { label: "MD", icon: FileText, tone: "bg-blue-50 text-blue-700" };
  if (type === "link") return { label: "URL", icon: Link2, tone: "bg-[#F2F3F5] text-[#5F6B73]" };
  return { label: type.toUpperCase().slice(0, 4), icon: FileText, tone: "bg-[#F2F3F5] text-[#5F6B73]" };
}

function localDocumentSearch(documents: Document[], articles: KnowledgeArticle[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const documentResults = documents
    .filter((document) => [
      document.name,
      document.title,
      document.description,
      document.fileName,
      document.categoryName,
      ...(document.tags ?? []),
    ].some((value) => value?.toLowerCase().includes(normalized)))
    .map((item) => ({ type: "document" as const, item }));

  const articleResults = articles
    .filter((article) => [
      article.title,
      article.summary,
      article.bodyMarkdown,
      article.categoryName,
      ...article.tags,
    ].some((value) => value?.toLowerCase().includes(normalized)))
    .map((item) => ({ type: "article" as const, item }));

  return [...documentResults, ...articleResults];
}

export const KnowledgeHubSection = () => {
  const { session } = useAuth();
  const user = session.user;
  const scope = useMemo(() => user ? tenantScopeFromUser(user) : undefined, [user]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<HubTab>(() => (typeof window !== "undefined" && window.location.pathname.includes("documents") ? "documents" : "documents"));
  const [documents, setDocuments] = useState<Document[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [tags, setTags] = useState<DocumentTag[]>([]);
  const [activity, setActivity] = useState<DocumentActivity[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | undefined>();
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [tagName, setTagName] = useState("");
  const [articleForm, setArticleForm] = useState({ title: "", bodyMarkdown: "", status: "draft" as KnowledgeArticle["status"] });

  const canWrite = Boolean(user && ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee"].includes(user.role));
  const canManageTaxonomy = Boolean(user && ["Super Admin", "Organization Admin", "Executive", "Manager"].includes(user.role));

  const loadKnowledgeHub = useCallback(async () => {
    if (!scope) return;
    setLoading(true);
    setToast(null);
    try {
      const [documentRows, categoryRows, tagRows, articleRows, activityRows] = await Promise.all([
        applicationServices.documentsRepository.list(scope, { pageSize: 100 }),
        applicationServices.documentCategoriesRepository.list(scope, { pageSize: 100 }),
        applicationServices.documentTagsRepository.list(scope, { pageSize: 100 }),
        applicationServices.knowledgeArticlesRepository.list(scope, { pageSize: 100 }),
        applicationServices.documentActivityRepository.list(scope, { pageSize: 100 }),
      ]);
      setDocuments(documentRows.length > 0 ? documentRows : fallbackDocuments);
      setCategories(categoryRows.length > 0 ? categoryRows : fallbackDocumentCategories);
      setTags(tagRows.length > 0 ? tagRows : fallbackDocumentTags);
      setArticles(articleRows.length > 0 ? articleRows : fallbackKnowledgeArticles);
      setActivity(activityRows.length > 0 ? activityRows : fallbackDocumentActivity);
    } catch {
      setDocuments(fallbackDocuments);
      setCategories(fallbackDocumentCategories);
      setTags(fallbackDocumentTags);
      setArticles(fallbackKnowledgeArticles);
      setActivity(fallbackDocumentActivity);
      setToast({ tone: "info", message: "Knowledge Hub is using local Sprint 9 sample data." });
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void loadKnowledgeHub();
  }, [loadKnowledgeHub]);

  const filteredDocuments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return documents.filter((document) => {
      if (activeTab === "archived" && document.status !== "archived") return false;
      if (activeTab === "shared" && document.visibility !== "shared") return false;
      if (activeTab === "favorites" && !document.isFavorite) return false;
      if (activeTab === "documents" && (document.status === "archived" || document.status === "deleted")) return false;
      if (!normalized) return true;
      return [
        document.name,
        document.description,
        document.fileName,
        document.categoryName,
        ...(document.tags ?? []),
      ].some((value) => value?.toLowerCase().includes(normalized));
    });
  }, [activeTab, documents, query]);

  const searchResults = useMemo(() => localDocumentSearch(documents, articles, query), [articles, documents, query]);

  const selectDocument = async (document: Document) => {
    setSelectedDocument(document);
    setRenameValue(document.name);
    setPreviewUrl(undefined);
    if (!scope) return;

    await applicationServices.documentsRepository.recordActivity(scope, {
      documentId: document.id,
      action: "viewed",
      metadata: { fileName: document.fileName ?? document.name },
    }).catch(() => undefined);

    try {
      const intent = await applicationServices.storageRepository.createDocumentDownloadIntent({
        path: document.storagePath,
        expiresIn: 600,
      });
      setPreviewUrl(intent.signedUrl);
    } catch {
      setPreviewUrl(undefined);
    }
  };

  const updateDocument = async (document: Document, input: Partial<Document>, successMessage: string) => {
    if (!scope) return;
    setSaving(true);
    setToast(null);
    try {
      const updated = await applicationServices.documentsRepository.update(scope, document.id, input);
      setDocuments((rows) => rows.map((row) => row.id === updated.id ? updated : row));
      setSelectedDocument(updated);
      setToast({ tone: "success", message: successMessage });
    } catch {
      const updated = { ...document, ...input, updatedAt: new Date().toISOString() };
      setDocuments((rows) => rows.map((row) => row.id === updated.id ? updated : row));
      setSelectedDocument(updated);
      setToast({ tone: "info", message: `${successMessage} Local fallback is active.` });
    } finally {
      setSaving(false);
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (!scope || !user || !canWrite) return;
    const uploads = Array.from(files);
    if (uploads.length === 0) return;

    setSaving(true);
    setToast(null);
    const uploadedDocuments: Document[] = [];

    for (const file of uploads) {
      const validationError = validateDocumentUpload({ fileName: file.name, mimeType: file.type, sizeBytes: file.size });
      if (validationError) {
        setToast({ tone: "error", message: validationError });
        continue;
      }

      const documentId = crypto.randomUUID();
      const versionId = crypto.randomUUID();
      const storagePath = buildDocumentStoragePath(scope.organizationId, documentId, versionId, file.name);
      const documentType = inferDocumentKind(file.name, file.type);
      const createdAt = new Date().toISOString();
      const payload: Document = {
        id: documentId,
        organizationId: scope.organizationId,
        name: file.name,
        title: file.name.replace(/\.[^.]+$/, ""),
        description: "Uploaded through Knowledge Hub.",
        storagePath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        documentType,
        status: "active",
        visibility: "organization",
        ownerId: scope.userId,
        createdByUserId: scope.userId,
        currentVersion: 1,
        tags: [],
        classification: "internal",
        createdAt,
        updatedAt: createdAt,
      };

      try {
        const intent = await applicationServices.storageRepository.createDocumentUploadIntent({
          path: storagePath,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        });
        await fetch(intent.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        const saved = await applicationServices.documentsRepository.create(scope, payload);
        await applicationServices.documentVersionsRepository.create(scope, {
          id: versionId,
          documentId: saved.id,
          versionNumber: 1,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
          storagePath,
        }).catch(() => undefined);
        await applicationServices.documentsRepository.recordActivity(scope, {
          documentId: saved.id,
          action: "uploaded",
          metadata: { fileName: file.name, sizeBytes: file.size },
        }).catch(() => undefined);
        uploadedDocuments.push(saved);
      } catch {
        uploadedDocuments.push(payload);
      }
    }

    if (uploadedDocuments.length > 0) {
      setDocuments((rows) => [...uploadedDocuments, ...rows]);
      setSelectedDocument(uploadedDocuments[0]);
      setRenameValue(uploadedDocuments[0].name);
      setToast({
        tone: "success",
        message: uploadedDocuments.length === 1 ? "Document uploaded." : `${uploadedDocuments.length} documents uploaded.`,
      });
    }
    setSaving(false);
  };

  const createCategory = async () => {
    if (!scope || !categoryName.trim() || !canManageTaxonomy) return;
    const name = categoryName.trim();
    try {
      const category = await applicationServices.documentCategoriesRepository.create(scope, { name });
      setCategories((rows) => [...rows, category]);
    } catch {
      setCategories((rows) => [...rows, {
        id: crypto.randomUUID(),
        organizationId: scope.organizationId,
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }]);
    }
    setCategoryName("");
  };

  const createTag = async () => {
    if (!scope || !tagName.trim() || !canManageTaxonomy) return;
    const name = tagName.trim();
    try {
      const tag = await applicationServices.documentTagsRepository.create(scope, { name });
      setTags((rows) => [...rows, tag]);
    } catch {
      setTags((rows) => [...rows, {
        id: crypto.randomUUID(),
        organizationId: scope.organizationId,
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }]);
    }
    setTagName("");
  };

  const saveArticle = async () => {
    if (!scope || !articleForm.title.trim() || !canWrite) return;
    try {
      const article = await applicationServices.knowledgeArticlesRepository.create(scope, {
        title: articleForm.title.trim(),
        bodyMarkdown: articleForm.bodyMarkdown.trim(),
        status: articleForm.status,
        tags: [],
      });
      setArticles((rows) => [article, ...rows]);
    } catch {
      const now = new Date().toISOString();
      setArticles((rows) => [{
        id: crypto.randomUUID(),
        organizationId: scope.organizationId,
        title: articleForm.title.trim(),
        bodyMarkdown: articleForm.bodyMarkdown.trim(),
        status: articleForm.status,
        authorUserId: scope.userId,
        tags: [],
        createdAt: now,
        updatedAt: now,
      }, ...rows]);
    }
    setArticleForm({ title: "", bodyMarkdown: "", status: "draft" });
    setToast({ tone: "success", message: "Knowledge article saved." });
  };

  if (loading) return <LoadingState label="Loading Knowledge Hub" />;

  return (
    <div className="h-full min-h-0">
      <SectionHeader
        title="Knowledge Hub"
        subtitle={`${documents.length} documents, ${articles.length} articles, ${categories.length} categories`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => void loadKnowledgeHub()}
              className="flex items-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.1)] px-3 py-1.5 text-xs text-[#5F6B73] hover:bg-[#F2F3F5]"
            >
              <RefreshCw size={12} /> Refresh
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!canWrite || saving}
              className="flex items-center gap-1.5 rounded-lg bg-[#8B1E2D] px-3 py-1.5 text-xs text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UploadCloud size={12} /> Upload
            </button>
          </div>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(event) => {
          if (event.target.files) void handleFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />

      {toast && <div className="mb-3"><InlineToast tone={toast.tone} message={toast.message} /></div>}

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${activeTab === tab.id ? "bg-[#8B1E2D] text-white" : "border border-[rgba(0,0,0,0.08)] text-[#5F6B73] hover:bg-[#F2F3F5]"}`}
          >
            <tab.icon size={12} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="grid min-h-[560px] grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-[rgba(0,0,0,0.1)] bg-white px-4 py-3 shadow-sm focus-within:border-[#8B1E2D]/40">
            <Search size={16} className="text-[#5F6B73]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, filename, category, tags, owner, or article body"
              className="flex-1 bg-transparent text-sm text-[#0F1117] outline-none placeholder:text-[#5F6B73]"
            />
          </div>

          {activeTab === "documents" || activeTab === "shared" || activeTab === "favorites" || activeTab === "archived" ? (
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void handleFiles(event.dataTransfer.files);
              }}
              className="rounded-xl border-2 border-dashed border-[rgba(139,30,45,0.18)] bg-white/70 p-3"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#5F6B73]">{tabs.find((tab) => tab.id === activeTab)?.label}</p>
                <span className="rounded-full bg-[#F2F3F5] px-2 py-0.5 font-mono text-[11px] text-[#5F6B73]">{filteredDocuments.length}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
                {filteredDocuments.map((document) => {
                  const badge = documentBadge(document);
                  return (
                    <Card key={document.id} className="p-4 transition-shadow hover:shadow-md">
                      <button type="button" onClick={() => void selectDocument(document)} className="w-full text-left">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${badge.tone}`}>
                            {badge.label}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <h3 className="text-sm font-semibold leading-snug text-[#0F1117]">{document.title ?? document.name}</h3>
                              {document.isFavorite && <Heart size={13} className="ml-auto flex-shrink-0 fill-[#C9A227] text-[#C9A227]" />}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#5F6B73]">{document.description ?? document.fileName}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#5F6B73]">
                              <span className="rounded bg-[#8B1E2D]/8 px-1.5 py-0.5 font-mono text-[#8B1E2D]">{document.categoryName ?? "Uncategorized"}</span>
                              <span>{formatBytes(document.fileSize)}</span>
                              <span>{document.visibility ?? "organization"}</span>
                              <span>Modified {formatDate(document.updatedAt)}</span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {(document.tags ?? []).map((tag) => (
                                <span key={tag} className="rounded-full bg-[#F2F3F5] px-2 py-0.5 text-[10px] font-medium text-[#5F6B73]">{tag}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>
                    </Card>
                  );
                })}
                {filteredDocuments.length === 0 && (
                  <EmptyState title="No documents found" message="Try another search or upload a document." />
                )}
              </div>
            </div>
          ) : null}

          {activeTab === "articles" && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
              <Card className="p-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[#0F1117]">New Article</h3>
                  <TextField label="Title" value={articleForm.title} onChange={(event) => setArticleForm({ ...articleForm, title: event.target.value })} disabled={!canWrite || saving} />
                  <TextAreaField label="Body" value={articleForm.bodyMarkdown} onChange={(event) => setArticleForm({ ...articleForm, bodyMarkdown: event.target.value })} disabled={!canWrite || saving} />
                  <SelectField label="Status" value={articleForm.status} options={[{ value: "draft", label: "Draft" }, { value: "published", label: "Published" }]} onChange={(event) => setArticleForm({ ...articleForm, status: event.target.value as KnowledgeArticle["status"] })} disabled={!canWrite || saving} />
                  <button onClick={() => void saveArticle()} disabled={!canWrite || saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:opacity-60">
                    <Save size={13} /> Save Article
                  </button>
                </div>
              </Card>
              <div className="space-y-3">
                {articles.map((article) => (
                  <Card key={article.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#5F6B73]">{article.categoryName ?? article.status}</p>
                        <h3 className="mt-1 text-sm font-semibold text-[#0F1117]">{article.title}</h3>
                        <p className="mt-2 text-xs leading-relaxed text-[#5F6B73]">{article.summary ?? article.bodyMarkdown}</p>
                      </div>
                      <span className="rounded-full bg-[#F2F3F5] px-2 py-1 text-[10px] font-medium capitalize text-[#5F6B73]">{article.status}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {article.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-[#F2F3F5] px-2 py-0.5 text-[10px] font-medium text-[#5F6B73]">{tag}</span>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === "categories" && (
            <div className="space-y-3">
              <Card className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <TextField label="Category" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} disabled={!canManageTaxonomy} />
                  <button onClick={() => void createCategory()} disabled={!canManageTaxonomy} className="mt-auto rounded-lg bg-[#8B1E2D] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">Add</button>
                </div>
              </Card>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {categories.map((category) => (
                  <Card key={category.id} className="p-4">
                    <h3 className="text-sm font-semibold text-[#0F1117]">{category.name}</h3>
                    <p className="mt-1 text-xs text-[#5F6B73]">{category.description ?? category.slug}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === "tags" && (
            <div className="space-y-3">
              <Card className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <TextField label="Tag" value={tagName} onChange={(event) => setTagName(event.target.value)} disabled={!canManageTaxonomy} />
                  <button onClick={() => void createTag()} disabled={!canManageTaxonomy} className="mt-auto rounded-lg bg-[#8B1E2D] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">Add</button>
                </div>
              </Card>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag.id} className="rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-3 py-1.5 text-xs font-medium text-[#5F6B73]">{tag.name}</span>
                ))}
              </div>
            </div>
          )}

          {activeTab === "search" && (
            <div className="space-y-3">
              {(query ? searchResults : []).map((result) => (
                <Card key={`${result.type}-${result.item.id}`} className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#5F6B73]">{result.type}</p>
                  <h3 className="mt-1 text-sm font-semibold text-[#0F1117]">{result.type === "document" ? result.item.title ?? result.item.name : result.item.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#5F6B73]">{result.type === "document" ? result.item.description : result.item.summary}</p>
                </Card>
              ))}
              {!query && <EmptyState title="Search Knowledge Hub" message="Enter a query to search documents and knowledge articles." />}
            </div>
          )}

          {activeTab === "recent" && (
            <div className="space-y-3">
              {activity.map((item) => {
                const document = documents.find((row) => row.id === item.documentId);
                return (
                  <Card key={item.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#8B1E2D]/8 text-[#8B1E2D]">
                        <Clock3 size={15} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#0F1117]">{document?.title ?? document?.name ?? "Document"} {item.action.replace("_", " ")}</p>
                        <p className="text-xs text-[#5F6B73]">{formatDate(item.createdAt)}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <Card className="h-full overflow-y-auto p-4">
          {selectedDocument ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">Document Preview</p>
                  <h3 className="mt-1 text-base font-semibold leading-snug text-[#0F1117]">{selectedDocument.title ?? selectedDocument.name}</h3>
                </div>
                <span className="rounded-full bg-[#F2F3F5] px-2 py-1 text-[10px] font-medium text-[#5F6B73]">{selectedDocument.status ?? "active"}</span>
              </div>

              <div className="min-h-44 overflow-hidden rounded-lg border border-[rgba(0,0,0,0.08)] bg-[#F8F9FA]">
                {previewUrl && selectedDocument.documentType === "image" && (
                  <div
                    role="img"
                    aria-label={selectedDocument.name}
                    className="h-72 w-full bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${previewUrl})` }}
                  />
                )}
                {previewUrl && selectedDocument.documentType === "pdf" && (
                  <iframe title={selectedDocument.name} src={previewUrl} className="h-72 w-full" />
                )}
                {selectedDocument.documentType === "markdown" && (
                  <div className="p-4 text-xs leading-relaxed text-[#5F6B73]">
                    <p className="font-semibold text-[#0F1117]">{selectedDocument.title}</p>
                    <p className="mt-2">{selectedDocument.description ?? "Markdown preview will render from the signed file when storage is connected."}</p>
                  </div>
                )}
                {!previewUrl && selectedDocument.documentType !== "markdown" && (
                  <div className="flex h-44 flex-col items-center justify-center gap-2 text-center text-xs text-[#5F6B73]">
                    <FileText size={24} />
                    <span>Signed preview pending</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <TextField label="Name" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} disabled={!canWrite || saving} />
                <SelectField
                  label="Visibility"
                  value={selectedDocument.visibility ?? "organization"}
                  options={visibilityOptions}
                  onChange={(event) => void updateDocument(selectedDocument, { visibility: event.target.value as DocumentVisibility }, "Visibility updated.")}
                  disabled={!canWrite || saving}
                />
                <button
                  onClick={() => void updateDocument(selectedDocument, { name: renameValue.trim(), title: renameValue.trim().replace(/\.[^.]+$/, "") }, "Document renamed.")}
                  disabled={!canWrite || saving || !renameValue.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#8B1E2D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:opacity-60"
                >
                  <Save size={13} /> Save Metadata
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => void selectDocument(selectedDocument)} className="flex items-center justify-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.1)] px-3 py-2 text-xs text-[#5F6B73] hover:bg-[#F2F3F5]">
                  <Eye size={13} /> View
                </button>
                <button onClick={() => previewUrl && window.open(previewUrl, "_blank", "noopener,noreferrer")} disabled={!previewUrl} className="flex items-center justify-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.1)] px-3 py-2 text-xs text-[#5F6B73] hover:bg-[#F2F3F5] disabled:opacity-60">
                  <Download size={13} /> Download
                </button>
                {selectedDocument.status === "archived" ? (
                  <button onClick={() => void updateDocument(selectedDocument, { status: "active", archivedAt: null as unknown as string, deletedAt: null as unknown as string }, "Document restored.")} disabled={!canWrite || saving} className="flex items-center justify-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.1)] px-3 py-2 text-xs text-[#5F6B73] hover:bg-[#F2F3F5] disabled:opacity-60">
                    <RefreshCw size={13} /> Restore
                  </button>
                ) : (
                  <button onClick={() => void updateDocument(selectedDocument, { status: "archived", archivedAt: new Date().toISOString() }, "Document archived.")} disabled={!canWrite || saving} className="flex items-center justify-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.1)] px-3 py-2 text-xs text-[#5F6B73] hover:bg-[#F2F3F5] disabled:opacity-60">
                    <Archive size={13} /> Archive
                  </button>
                )}
                <button onClick={() => void updateDocument(selectedDocument, { status: "deleted", deletedAt: new Date().toISOString() }, "Document deleted.")} disabled={!canWrite || saving} className="flex items-center justify-center gap-1.5 rounded-lg border border-red-100 px-3 py-2 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60">
                  <Trash2 size={13} /> Delete
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Category</span><span className="font-semibold text-[#0F1117]">{selectedDocument.categoryName ?? "Uncategorized"}</span></div>
                <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Version</span><span className="font-semibold text-[#0F1117]">v{selectedDocument.currentVersion ?? 1}</span></div>
                <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Type</span><span className="font-semibold text-[#0F1117]">{selectedDocument.documentType ?? "unknown"}</span></div>
                <div className="rounded-lg bg-[#F8F9FA] p-3"><span className="block text-[10px] uppercase text-[#5F6B73]">Size</span><span className="font-semibold text-[#0F1117]">{formatBytes(selectedDocument.fileSize)}</span></div>
              </div>
            </div>
          ) : (
            <EmptyState title="Select a document" message="Open a document to preview metadata, permissions, and versions." />
          )}
        </Card>
      </div>
    </div>
  );
};

export default KnowledgeHubSection;
