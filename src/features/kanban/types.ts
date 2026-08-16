export type KanbanCardBadge = {
  label: string;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
};

export type KanbanCardData = {
  id: string;
  title: string;
  subtitle?: string;
  metrics: { label: string; value: string }[];
  badges?: KanbanCardBadge[];
  route?: string;
};

export type KanbanColumnData = {
  id: string;
  title: string;
  description?: string;
  cards: KanbanCardData[];
};
