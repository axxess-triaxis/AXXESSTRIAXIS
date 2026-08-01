import { useEffect, useState } from "react";
import type { TenantScope } from "../repositories/interfaces";

type AiReviewsResponse = { reviews?: Array<{ status: string }> };

// Executive Dashboard Sprint ED-2: a literal count of real ai_operation_reviews rows with
// status "pending", sourced from the same authenticated, tenant-scoped, permission-filtered
// GET /api/ai/reviews endpoint the AI Review Inbox itself uses -- not a heuristic derived from an
// unrelated metric (the prior pendingApprovals/10 estimate). Capped at that endpoint's own page
// size (25, most recent first); acceptable for this product's current beta-stage review volume.
export function usePendingAiReviewCount(scope?: TenantScope, refreshToken = 0) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!scope?.organizationId) return;
    const controller = new AbortController();
    fetch("/api/ai/reviews", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json().catch(() => ({})) as AiReviewsResponse;
        setCount((payload.reviews ?? []).filter((review) => review.status === "pending").length);
      })
      .catch(() => {
        if (!controller.signal.aborted) setCount(0);
      });
    return () => controller.abort();
  }, [scope?.organizationId, refreshToken]);

  return count;
}
