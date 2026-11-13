import { describe, expect, it } from "vitest";
import { decideDailyBudget, RAMP_FLOOR, RAMP_MIN_SAMPLE } from "./sendRamp";

// sentPerDay: emails sent on each of the last 7 UTC days, oldest first, today last.
const health = (sentPerDay: number[], bounces = 0, complaints = 0, ceiling = 200) => ({ ceiling, sentPerDay, bounces7d: bounces, complaints7d: complaints });

describe("decideDailyBudget", () => {
  it("holds at the warm-up floor and never pauses on a small sample", () => {
    expect(decideDailyBudget(health([0, 0, 0, 0, 0, 0, 1], 1))).toEqual({ budget: RAMP_FLOOR, reason: "warming_up" });
    expect(RAMP_MIN_SAMPLE).toBe(50);
  });

  it("never goes above the founder's ceiling", () => {
    expect(decideDailyBudget(health([0, 0, 0, 0, 0, 0, 1], 0, 0, 10))).toEqual({ budget: 10, reason: "warming_up" });
    expect(decideDailyBudget(health([150, 150, 150, 150, 150, 150, 10], 0, 0, 160)).budget).toBe(160);
  });

  it("ramps to 1.5 times the busiest day while healthy, from the floor", () => {
    expect(decideDailyBudget(health([10, 20, 20, 0, 0, 0, 0]))).toEqual({ budget: 30, reason: "ramping" });
    expect(decideDailyBudget(health([20, 20, 30, 40, 0, 0, 0]))).toEqual({ budget: 60, reason: "ramping" });
    expect(decideDailyBudget(health([5, 5, 5, 5, 5, 5, 25])).budget).toBe(37);
  });

  it("pauses at a 2% bounce rate and stays paused until it drops", () => {
    expect(decideDailyBudget(health([20, 20, 20, 20, 20, 0, 0], 2))).toEqual({ budget: 0, reason: "paused_bounce_rate" });
    expect(decideDailyBudget(health([20, 20, 20, 20, 20, 0, 0], 1)).reason).toBe("ramping");
  });

  it("pauses at a 0.1% complaint rate", () => {
    expect(decideDailyBudget(health([200, 200, 200, 200, 200, 0, 0], 0, 1))).toEqual({ budget: 0, reason: "paused_complaint_rate" });
    expect(decideDailyBudget(health([200, 200, 200, 200, 200, 200, 200], 0, 1)).reason).toBe("ramping");
  });

  it("treats a missing or bad ceiling as the floor", () => {
    expect(decideDailyBudget(health([0, 0, 0, 0, 0, 0, 0], 0, 0, Number.NaN)).budget).toBe(RAMP_FLOOR);
  });
});
