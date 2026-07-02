import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "../../../components/ui/Card";
import type { DashboardKpi } from "../types";

type KpiCardProps = {
  metric: DashboardKpi;
};

const sentimentClass: Record<NonNullable<DashboardKpi["sentiment"]>, string> = {
  positive: "text-emerald-600",
  negative: "text-red-600",
  warning: "text-amber-600",
};

export function KpiCard({ metric }: KpiCardProps) {
  const Icon = metric.icon;
  const TrendIcon = metric.trend === "up" ? TrendingUp : TrendingDown;
  const trendColor = sentimentClass[metric.sentiment ?? "warning"];

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: metric.color + "15" }}>
          <Icon size={16} style={{ color: metric.color }} />
        </div>
        <span className={"text-xs font-semibold flex items-center gap-0.5 " + trendColor}>
          <TrendIcon size={11} />
          {metric.delta}
        </span>
      </div>
      <div className="text-3xl font-bold text-[#0F1117] tracking-tight">{metric.value}</div>
      <div className="text-xs text-[#5F6B73] mt-1 font-medium">{metric.label}</div>
    </Card>
  );
}
