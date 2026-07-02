import type { LucideIcon } from "lucide-react";

export type KpiTrend = "up" | "down";

export type DashboardKpi = {
  label: string;
  value: string;
  delta: string;
  trend: KpiTrend;
  icon: LucideIcon;
  color: string;
  sentiment?: "positive" | "negative" | "warning";
};
