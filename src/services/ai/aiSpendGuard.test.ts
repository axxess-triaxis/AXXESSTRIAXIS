import { afterEach, describe, expect, it, vi } from "vitest";

const mockIsConfigured = vi.fn();
const mockAdminRest = vi.fn();
vi.mock("../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: (...args: unknown[]) => mockIsConfigured(...args),
  supabaseAdminRest: (...args: unknown[]) => mockAdminRest(...args),
}));

import { checkProviderBudgetHeadroom, recordProviderSpend } from "./aiSpendGuard";

describe("checkProviderBudgetHeadroom", () => {
  afterEach(() => {
    mockIsConfigured.mockReset();
    mockAdminRest.mockReset();
  });

  it("fails closed when Supabase admin configuration is unavailable -- never assumes it's safe to spend", async () => {
    mockIsConfigured.mockReturnValue(false);

    const result = await checkProviderBudgetHeadroom("openai");

    expect(result.ok).toBe(false);
    expect(mockAdminRest).not.toHaveBeenCalled();
    if (!result.ok) expect(result.reason).toContain("could not be verified");
  });

  it("fails closed when no budget row exists for the provider", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockAdminRest.mockResolvedValue([]);

    const result = await checkProviderBudgetHeadroom("anthropic");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("No budget record exists");
  });

  it("reports real remaining headroom when well under the ceiling", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockAdminRest.mockResolvedValue([{ provider: "openai", budget_ceiling_usd: 20, spent_usd: 5 }]);

    const result = await checkProviderBudgetHeadroom("openai");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.remainingUsd).toBeCloseTo(15, 5);
  });

  it("fails closed once remaining balance is at or below the safety margin -- this is the founder's 'never go pay-as-you-go' requirement", async () => {
    mockIsConfigured.mockReturnValue(true);
    // $19.60 spent of $20 ceiling = $0.40 remaining, below the $0.50 safety margin.
    mockAdminRest.mockResolvedValue([{ provider: "openai", budget_ceiling_usd: 20, spent_usd: 19.6 }]);

    const result = await checkProviderBudgetHeadroom("openai");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("Budget safety margin reached");
      expect(result.reason).toContain("openai");
    }
  });

  it("fails closed exactly at the safety margin boundary (never allows remaining balance to reach zero)", async () => {
    mockIsConfigured.mockReturnValue(true);
    // Exactly $0.50 remaining -- at the margin, not below it, but still refused (>= not >).
    mockAdminRest.mockResolvedValue([{ provider: "openai", budget_ceiling_usd: 20, spent_usd: 19.5 }]);

    const result = await checkProviderBudgetHeadroom("openai");

    expect(result.ok).toBe(false);
  });

  it("fails closed when the admin request itself throws", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockAdminRest.mockRejectedValue(new Error("connection refused"));

    const result = await checkProviderBudgetHeadroom("openai");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("connection refused");
  });
});

describe("recordProviderSpend", () => {
  afterEach(() => {
    mockIsConfigured.mockReset();
    mockAdminRest.mockReset();
  });

  it("does nothing when Supabase admin configuration is unavailable", async () => {
    mockIsConfigured.mockReturnValue(false);
    await recordProviderSpend("openai", 0.01);
    expect(mockAdminRest).not.toHaveBeenCalled();
  });

  it("does nothing for a zero or negative cost", async () => {
    mockIsConfigured.mockReturnValue(true);
    await recordProviderSpend("openai", 0);
    await recordProviderSpend("openai", -0.5);
    expect(mockAdminRest).not.toHaveBeenCalled();
  });

  it("reads the current spend, adds the real cost, and writes back the new total", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockAdminRest
      .mockResolvedValueOnce([{ spent_usd: 5 }]) // read
      .mockResolvedValueOnce(undefined); // write

    await recordProviderSpend("openai", 0.25);

    expect(mockAdminRest).toHaveBeenCalledTimes(2);
    const writeCall = mockAdminRest.mock.calls[1] as [string, { method: string; body: { spent_usd: number } }];
    expect(writeCall[0]).toBe("ai_provider_budget");
    expect(writeCall[1].method).toBe("PATCH");
    expect(writeCall[1].body.spent_usd).toBeCloseTo(5.25, 5);
  });

  it("does not throw when the write fails -- a lost spend record is non-fatal, the completion already succeeded", async () => {
    mockIsConfigured.mockReturnValue(true);
    mockAdminRest.mockRejectedValue(new Error("write failed"));

    await expect(recordProviderSpend("openai", 0.25)).resolves.toBeUndefined();
  });
});
