import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileText,
  Info,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Card } from "../ui/Card";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";
type DataState = "Live" | "Demo" | "Provider-gated" | "Empty";

const toneClasses: Record<Tone, string> = {
  neutral: "border-[rgba(15,17,23,0.08)] bg-[#F2F3F5] text-[#5F6B73]",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  brand: "border-[#8B1E2D]/20 bg-[#8B1E2D]/8 text-[#8B1E2D]",
};

const dataStateTone: Record<DataState, Tone> = {
  Live: "success",
  Demo: "brand",
  "Provider-gated": "warning",
  Empty: "neutral",
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function EnterpriseBadge({ label, tone = "neutral", icon: Icon }: { label: string; tone?: Tone; icon?: LucideIcon }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold leading-none", toneClasses[tone])}>
      {Icon && <Icon size={12} aria-hidden="true" />}
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone: Tone = normalized.includes("complete") || normalized.includes("ready") || normalized.includes("approved")
    ? "success"
    : normalized.includes("risk") || normalized.includes("pending") || normalized.includes("review")
      ? "warning"
      : normalized.includes("blocked") || normalized.includes("breach") || normalized.includes("reject")
        ? "danger"
        : "neutral";
  return <EnterpriseBadge label={status} tone={tone} />;
}

export function ConfidenceBadge({ score }: { score: number }) {
  const percent = score <= 1 ? Math.round(score * 100) : Math.round(score);
  return <EnterpriseBadge label={`Confidence ${percent}%`} tone={percent >= 80 ? "success" : percent >= 65 ? "warning" : "danger"} icon={Sparkles} />;
}

export function AuditTrailBadge({ eventId = "audit-demo-2026-07" }: { eventId?: string }) {
  return <EnterpriseBadge label={`Audit ${eventId}`} tone="info" icon={ShieldCheck} />;
}

export function HumanReviewBadge({ required = true }: { required?: boolean }) {
  return <EnterpriseBadge label={required ? "Human review required" : "Human review optional"} tone={required ? "warning" : "success"} icon={ShieldCheck} />;
}

export function TenantScopeBadge({ label = "Tenant scoped" }: { label?: string }) {
  return <EnterpriseBadge label={label} tone="brand" icon={Database} />;
}

export function DataStateBadge({ state }: { state: DataState }) {
  return <EnterpriseBadge label={state} tone={dataStateTone[state]} />;
}

export function ModuleHeader({
  title,
  eyebrow,
  description,
  badges = [],
  actions,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  badges?: ReactNode[];
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8B1E2D]">{eyebrow}</p>}
        <h1 className="text-xl font-bold tracking-tight text-[#0F1117]">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#5F6B73]">{description}</p>}
        {badges.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{badges.map((badge, index) => <span key={index}>{badge}</span>)}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div>}
    </div>
  );
}

export function PageShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cx("space-y-5", className)}>{children}</div>;
}

export function SectionCard({ title, description, action, children, className = "" }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cx("p-4", className)}>
      {(title || description || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-[#0F1117]">{title}</h2>}
            {description && <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </Card>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  state = "Demo",
  icon: Icon,
  href,
}: {
  label: string;
  value: string | number;
  detail?: string;
  state?: DataState;
  icon?: LucideIcon;
  href?: string;
}) {
  const content = (
    <Card className="h-full p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">{label}</p>
          <div className="mt-2 font-mono text-2xl font-semibold text-[#0F1117]">{value}</div>
        </div>
        {Icon && <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8B1E2D]/8 text-[#8B1E2D]"><Icon size={16} aria-hidden="true" /></div>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DataStateBadge state={state} />
        {detail && <span className="text-xs leading-relaxed text-[#5F6B73]">{detail}</span>}
      </div>
    </Card>
  );

  if (!href) return content;
  return <a href={href} className="block h-full focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/30">{content}</a>;
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-[rgba(15,17,23,0.12)] bg-[#F8F9FA] p-6 text-center">
      <Info className="mx-auto mb-3 text-[#8B1E2D]" size={22} aria-hidden="true" />
      <h3 className="text-sm font-semibold text-[#0F1117]">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-[#5F6B73]">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading enterprise workspace" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[rgba(15,17,23,0.08)] bg-white px-4 py-3 text-sm text-[#5F6B73]">
      <Loader2 className="animate-spin text-[#8B1E2D]" size={16} aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorState({ title = "Unable to load this module", message }: { title?: string; message: string }) {
  return (
    <div className="rounded-lg border border-red-100 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 text-red-700" size={16} aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold text-red-900">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-red-700">{message}</p>
        </div>
      </div>
    </div>
  );
}

export type FeedItem = {
  title: string;
  description?: string;
  time?: string;
  tone?: Tone;
};

export function ActivityFeed({ items }: { items: FeedItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={`${item.title}-${index}`} className="flex gap-3">
          <span className={cx("mt-1.5 h-2 w-2 rounded-full", item.tone === "danger" ? "bg-red-500" : item.tone === "warning" ? "bg-amber-500" : item.tone === "success" ? "bg-emerald-500" : "bg-[#8B1E2D]")} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-xs font-semibold text-[#0F1117]">{item.title}</p>
              {item.time && <span className="font-mono text-[10px] text-[#5F6B73]">{item.time}</span>}
            </div>
            {item.description && <p className="mt-0.5 text-xs leading-relaxed text-[#5F6B73]">{item.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Timeline({ items }: { items: FeedItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={`${item.title}-${index}`} className="grid grid-cols-[24px_1fr] gap-2">
          <div className="flex flex-col items-center">
            <CheckCircle2 size={14} className={item.tone === "warning" ? "text-amber-600" : "text-emerald-600"} />
            {index < items.length - 1 && <span className="mt-1 h-full w-px bg-[rgba(15,17,23,0.08)]" />}
          </div>
          <div>
            <p className="text-xs font-semibold text-[#0F1117]">{item.title}</p>
            {item.description && <p className="mt-0.5 text-xs leading-relaxed text-[#5F6B73]">{item.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DecisionCard({ title, owner, status, rationale }: { title: string; owner: string; status: string; rationale: string }) {
  return (
    <SectionCard title={title} description={rationale}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <EnterpriseBadge label={owner} tone="neutral" />
        <StatusBadge status={status} />
      </div>
    </SectionCard>
  );
}

export function ApprovalCard({ title, requestor, risk, children }: { title: string; requestor: string; risk: string; children?: ReactNode }) {
  return (
    <SectionCard title={title} description={`Requested by ${requestor}`}>
      <div className="mb-3 flex flex-wrap gap-2">
        <StatusBadge status={risk} />
        <HumanReviewBadge required />
        <AuditTrailBadge />
      </div>
      {children}
    </SectionCard>
  );
}

export function IntegrationCard({ name, status, description }: { name: string; status: string; description: string }) {
  return (
    <SectionCard title={name} description={description}>
      <StatusBadge status={status} />
    </SectionCard>
  );
}

export function DocumentCard({ title, description, status = "Ready", tags = [], onClick }: { title: string; description?: string; status?: string; tags?: string[]; onClick?: () => void }) {
  const body = (
    <Card className="h-full p-4 text-left transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#8B1E2D]/8 text-[#8B1E2D]"><FileText size={16} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold leading-snug text-[#0F1117]">{title}</h3>
            <StatusBadge status={status} />
          </div>
          {description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#5F6B73]">{description}</p>}
          {tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{tags.map((tag) => <EnterpriseBadge key={tag} label={tag} tone="neutral" />)}</div>}
        </div>
      </div>
    </Card>
  );
  if (!onClick) return body;
  return <button type="button" onClick={onClick} className="block h-full w-full text-left focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/30">{body}</button>;
}

export function WorkflowStepCard({ index, title, description, status }: { index: number; title: string; description: string; status: string }) {
  return (
    <div className="rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-3">
      <div className="flex items-start gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0F1117] font-mono text-[11px] font-semibold text-white">{index}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-[#0F1117]">{title}</p>
            <StatusBadge status={status} />
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function EnterpriseBreadcrumbs({ items }: { items: string[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">
      {items.map((item, index) => (
        <span key={item} className="flex items-center gap-1">
          {index > 0 && <span className="text-[rgba(95,107,115,0.5)]">/</span>}
          {item}
        </span>
      ))}
    </nav>
  );
}

export function ContextPanel({ title = "Context", children }: { title?: string; children: ReactNode }) {
  return (
    <SectionCard title={title} className="h-full">
      {children}
    </SectionCard>
  );
}

export function RightRail({ children }: { children: ReactNode }) {
  return <aside className="space-y-4 lg:sticky lg:top-4">{children}</aside>;
}

export function CommandSearchPlaceholder({ label = "Command search", placeholder = "Search modules, documents, approvals, and workflows" }: { label?: string; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[rgba(15,17,23,0.1)] bg-white px-3 py-2 text-xs text-[#5F6B73]">
      <Search size={14} className="text-[#8B1E2D]" aria-hidden="true" />
      <span className="font-semibold text-[#0F1117]">{label}</span>
      <span className="hidden sm:inline">{placeholder}</span>
      <span className="ml-auto rounded bg-[#F2F3F5] px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</span>
    </div>
  );
}

export function DemoDataNotice({ label = "Demo workflow using seeded enterprise data" }: { label?: string }) {
  return (
    <div className="rounded-lg border border-[#8B1E2D]/15 bg-[#8B1E2D]/8 px-4 py-3 text-sm text-[#5F6B73]">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 flex-shrink-0 text-[#8B1E2D]" size={15} aria-hidden="true" />
        <p><span className="font-semibold text-[#0F1117]">Investor Preview:</span> {label}. Live tenant data remains isolated from demo records.</p>
      </div>
    </div>
  );
}
