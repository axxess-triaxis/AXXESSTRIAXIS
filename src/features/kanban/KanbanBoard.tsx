import type { KanbanCardBadge, KanbanCardData, KanbanColumnData } from "./types";

// Sprint 1 pilot portfolio (2026-08-15): a new, generic, reusable Kanban primitive -- this
// codebase had no board component of any kind before this (react-dnd/react-dnd-html5-backend are
// installed in package.json but unused anywhere in src/). Follows the same generic-render /
// domain-specific-builder split as the Executive Dashboard's ScoredTile/TileGrid (see
// src/features/dashboard/): this component only knows how to render KanbanColumnData/KanbanCardData,
// never a specific domain. Static columns only this sprint (no drag-and-drop) -- onCardMove is left
// typed and unconsumed so a later interactive layer doesn't require a structural rewrite.
const badgeToneStyles: Record<KanbanCardBadge["tone"], string> = {
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-[#8B1E2D]/8 text-[#8B1E2D]",
  info: "bg-sky-50 text-sky-700",
  neutral: "bg-[#F2F3F5] text-[#5F6B73]",
};

function KanbanCard({ card }: { card: KanbanCardData }) {
  const content = (
    <div className="flex flex-col gap-2 rounded-lg border border-[rgba(15,17,23,0.08)] bg-white p-3 transition-colors hover:border-[#8B1E2D]/30 hover:bg-[#F8F9FA]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-[#0F1117]">{card.title}</span>
      </div>
      {card.subtitle && <p className="text-[11px] leading-relaxed text-[#5F6B73]">{card.subtitle}</p>}
      {card.metrics.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
          {card.metrics.map((metric) => (
            <div key={metric.label} className="flex flex-col">
              <dt className="text-[9px] font-semibold uppercase tracking-wide text-[#5F6B73]">{metric.label}</dt>
              <dd className="font-mono text-xs font-semibold text-[#0F1117]">{metric.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {card.badges && card.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {card.badges.map((badge) => (
            <span key={badge.label} className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${badgeToneStyles[badge.tone]}`}>
              {badge.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  if (!card.route) return content;
  return (
    <a href={card.route} className="block focus:outline-none focus:ring-2 focus:ring-[#8B1E2D]/25 rounded-lg">
      {content}
    </a>
  );
}

function KanbanColumn({ column }: { column: KanbanColumnData }) {
  return (
    <div className="flex w-72 flex-shrink-0 flex-col gap-3 rounded-lg border border-[rgba(15,17,23,0.06)] bg-[#F8F9FA] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#0F1117]">{column.title}</span>
        <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-[#5F6B73]">{column.cards.length}</span>
      </div>
      {column.description && <p className="text-[11px] leading-relaxed text-[#5F6B73]">{column.description}</p>}
      <div className="flex flex-col gap-2">
        {column.cards.map((card) => (
          <KanbanCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({ columns, onCardMove }: { columns: KanbanColumnData[]; onCardMove?: (cardId: string, toColumnId: string) => void }) {
  void onCardMove; // unused this sprint -- reserved slot for a future drag-and-drop layer
  if (columns.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {columns.map((column) => (
        <KanbanColumn key={column.id} column={column} />
      ))}
    </div>
  );
}
