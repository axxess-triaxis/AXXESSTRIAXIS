import { describe, expect, it } from "vitest";
import type { FinancialWatchItem } from "../../domain";
import { computeFinancialDashboardSignals } from "./financialDashboardSignals";

function item(overrides: Partial<FinancialWatchItem>): FinancialWatchItem {
  return {
    id: "item", organizationId: "org-1", title: "x", category: "budget", thresholdType: "above",
    thresholdAmount: 1000, currency: "USD", status: "open",
    createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeFinancialDashboardSignals", () => {
  it("returns all-zero for an empty watchlist, not fabricated financial data", () => {
    expect(computeFinancialDashboardSignals([])).toEqual({
      budgetThresholdsCount: 0, budgetOvershootCount: 0, accountsBelowThresholdCount: 0,
      accountsActionablesCount: 0, accountsActionablesOverdueCount: 0,
    });
  });

  it("flags a budget item as overshoot only when current_amount exceeds an 'above' threshold", () => {
    const items = [
      item({ id: "1", category: "budget", thresholdType: "above", thresholdAmount: 1000, currentAmount: 1200 }),
      item({ id: "2", category: "budget", thresholdType: "above", thresholdAmount: 1000, currentAmount: 800 }),
    ];
    const signals = computeFinancialDashboardSignals(items);
    expect(signals.budgetThresholdsCount).toBe(2);
    expect(signals.budgetOvershootCount).toBe(1);
  });

  it("flags a bank_balance item as below-threshold only when current_amount is under a 'below' threshold", () => {
    const items = [
      item({ id: "1", category: "bank_balance", thresholdType: "below", thresholdAmount: 5000, currentAmount: 3000 }),
      item({ id: "2", category: "bank_balance", thresholdType: "below", thresholdAmount: 5000, currentAmount: 9000 }),
    ];
    const signals = computeFinancialDashboardSignals(items);
    expect(signals.accountsBelowThresholdCount).toBe(1);
  });

  it("excludes resolved items entirely from every count (resolved item excluded, not downgraded)", () => {
    const items = [
      item({ id: "1", category: "bank_balance", thresholdType: "below", thresholdAmount: 5000, currentAmount: 1, status: "resolved" }),
      item({ id: "2", category: "budget", status: "resolved" }),
    ];
    const signals = computeFinancialDashboardSignals(items);
    expect(signals).toEqual({
      budgetThresholdsCount: 0, budgetOvershootCount: 0, accountsBelowThresholdCount: 0,
      accountsActionablesCount: 0, accountsActionablesOverdueCount: 0,
    });
  });

  it("does not count an item with no current_amount as breaching (unknown is not a breach)", () => {
    const items = [item({ id: "1", category: "budget", currentAmount: undefined })];
    const signals = computeFinancialDashboardSignals(items);
    expect(signals.budgetOvershootCount).toBe(0);
  });

  it("counts overdue accounts_actionable items separately from the total actionable count", () => {
    const now = new Date("2026-08-01T12:00:00.000Z");
    const items = [
      item({ id: "1", category: "accounts_actionable", dueAt: "2026-07-01T00:00:00.000Z" }),
      item({ id: "2", category: "accounts_actionable", dueAt: "2026-09-01T00:00:00.000Z" }),
      item({ id: "3", category: "accounts_actionable" }),
    ];
    const signals = computeFinancialDashboardSignals(items, now);
    expect(signals.accountsActionablesCount).toBe(3);
    expect(signals.accountsActionablesOverdueCount).toBe(1);
  });
});
