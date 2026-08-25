import { approvalRequestsRepository } from "../../repositories/workflowActionRepositories";
import type { TenantScope } from "../../repositories/interfaces";

export type ApprovalCycleTimePoint = {
  month: string;
  avgDays: number;
  count: number;
};

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
}

// Analytics Sprint 1: approval_requests has real created_at/decided_at timestamps for every
// tenant -- cycle time is genuinely computable with basic date arithmetic, no forecasting model.
// Only decided requests (approved or rejected) have a decidedAt; still-pending ones are excluded
// from the average rather than treated as zero-day cycles.
export async function getApprovalCycleTimeTrend(scope: TenantScope): Promise<ApprovalCycleTimePoint[]> {
  try {
    const requests = await approvalRequestsRepository.list(scope, { pageSize: 200 });
    const decided = requests.filter((request) => request.decidedAt);

    const byMonth = new Map<string, { totalDays: number; count: number }>();
    for (const request of decided) {
      const days = (new Date(request.decidedAt!).getTime() - new Date(request.createdAt).getTime()) / 86_400_000;
      const label = monthLabel(request.decidedAt!);
      const bucket = byMonth.get(label) ?? { totalDays: 0, count: 0 };
      bucket.totalDays += days;
      bucket.count += 1;
      byMonth.set(label, bucket);
    }

    return decided.length === 0
      ? []
      : Array.from(byMonth.entries())
          .map(([month, { totalDays, count }]) => ({ month, avgDays: Math.round((totalDays / count) * 10) / 10, count }))
          .sort((a, b) => new Date(`${a.month} 1, 2000`).getMonth() - new Date(`${b.month} 1, 2000`).getMonth());
  } catch {
    return [];
  }
}
