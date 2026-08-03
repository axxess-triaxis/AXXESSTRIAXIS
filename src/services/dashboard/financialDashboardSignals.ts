// Executive Dashboard Redesign Sprint ED-R3: pure aggregation of already-fetched
// financial_watch_items rows into dashboard-ready counts. No network calls here. This is a MANUAL
// watchlist -- every tile built from this must describe itself as "manual tracking," never "bank
// connected," since no banking provider integration exists in this codebase.
import type { FinancialWatchItem } from "../../domain";

export type FinancialDashboardSignals = {
  budgetThresholdsCount: number;
  budgetOvershootCount: number;
  accountsBelowThresholdCount: number;
  accountsActionablesCount: number;
  accountsActionablesOverdueCount: number;
};

function isBreaching(item: FinancialWatchItem): boolean {
  if (item.currentAmount === undefined) return false;
  return item.thresholdType === "below" ? item.currentAmount < item.thresholdAmount : item.currentAmount > item.thresholdAmount;
}

export function computeFinancialDashboardSignals(items: FinancialWatchItem[], now = new Date()): FinancialDashboardSignals {
  // Resolved items are excluded entirely -- a resolved threshold breach is not an active signal.
  const openItems = items.filter((item) => item.status === "open");
  const budgetItems = openItems.filter((item) => item.category === "budget");
  const bankItems = openItems.filter((item) => item.category === "bank_balance");
  const actionableItems = openItems.filter((item) => item.category === "accounts_actionable");

  return {
    budgetThresholdsCount: budgetItems.length,
    budgetOvershootCount: budgetItems.filter(isBreaching).length,
    accountsBelowThresholdCount: bankItems.filter(isBreaching).length,
    accountsActionablesCount: actionableItems.length,
    accountsActionablesOverdueCount: actionableItems.filter((item) => item.dueAt && new Date(item.dueAt).getTime() < now.getTime()).length,
  };
}
