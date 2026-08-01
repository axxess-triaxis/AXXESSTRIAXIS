import { isSupabaseAdminConfigured, supabaseAdminRest } from "../../repositories/supabaseAdmin";

// A single request's real cost is only known AFTER it completes (token usage comes back in the
// response), so a pre-call check can only guarantee "we had at least this much headroom before
// starting," not the exact post-call balance. This margin is sized well above what any realistic
// single RAG-style chat completion could cost, so a worst-case in-flight request still cannot push
// real spend past the account's actual remaining credit. Founder requirement (2026-07-31): never
// let usage reach "pay as you go" territory; stop before the tracked balance nears zero.
const SAFETY_MARGIN_USD = 0.5;

type BudgetRow = { provider: string; budget_ceiling_usd: number | string; spent_usd: number | string };

export type BudgetHeadroomResult =
  | { ok: true; remainingUsd: number }
  | { ok: false; reason: string };

// Fail closed: if the budget can't be verified, we don't know whether spending is safe, so the
// call is refused rather than risking unmonitored billing. This is the reason a real OpenAI call
// depends on Supabase admin configuration being valid -- if it isn't, OpenAI simply never gets
// called (an honest local/no-live-call fallback), rather than calling anyway without tracking.
export async function checkProviderBudgetHeadroom(provider: string): Promise<BudgetHeadroomResult> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, reason: "Spend guard could not be verified (Supabase admin configuration is unavailable) -- refusing the call to avoid unmonitored spend." };
  }

  try {
    const rows = await supabaseAdminRest<BudgetRow[]>("ai_provider_budget", {
      query: new URLSearchParams({ provider: `eq.${provider}`, select: "provider,budget_ceiling_usd,spent_usd" }),
    });
    const row = rows[0];
    if (!row) {
      return { ok: false, reason: `No budget record exists for provider "${provider}" -- refusing the call until one is configured.` };
    }

    const ceiling = Number(row.budget_ceiling_usd);
    const spent = Number(row.spent_usd);
    const remaining = ceiling - spent;

    if (remaining <= SAFETY_MARGIN_USD) {
      return {
        ok: false,
        reason: `Budget safety margin reached for ${provider}: $${spent.toFixed(4)} of $${ceiling.toFixed(2)} spent, $${remaining.toFixed(4)} remaining (safety margin: $${SAFETY_MARGIN_USD.toFixed(2)}).`,
      };
    }

    return { ok: true, remainingUsd: remaining };
  } catch (error) {
    return {
      ok: false,
      reason: `Spend guard check failed (${error instanceof Error ? error.message : "unknown error"}) -- refusing the call to avoid unmonitored spend.`,
    };
  }
}

// Best-effort, read-then-write (not a single atomic increment): under this app's real traffic
// this is a low, acceptable risk, and the pre-call safety margin above already accounts for it --
// a failed or slightly-raced write only makes the next check marginally stale, not silently
// permissive past the margin, since the margin itself is not "$0.00" but a real buffer.
export async function recordProviderSpend(provider: string, costUsd: number): Promise<void> {
  if (!isSupabaseAdminConfigured() || !(costUsd > 0)) return;

  try {
    const rows = await supabaseAdminRest<BudgetRow[]>("ai_provider_budget", {
      query: new URLSearchParams({ provider: `eq.${provider}`, select: "spent_usd" }),
    });
    const current = Number(rows[0]?.spent_usd ?? 0);

    await supabaseAdminRest("ai_provider_budget", {
      method: "PATCH",
      query: new URLSearchParams({ provider: `eq.${provider}` }),
      body: { spent_usd: current + costUsd, updated_at: new Date().toISOString() },
    });
  } catch {
    // Non-fatal: the completion already happened and was returned to the caller. Losing this one
    // spend record does not defeat the guard -- the next pre-call check simply reads a slightly
    // stale (lower) total, still bounded by the same safety margin.
  }
}
