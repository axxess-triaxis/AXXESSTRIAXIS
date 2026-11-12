import { describe, expect, it } from "vitest";
import { validateSequence } from "./sequenceDefinition";

const step = (dayOffset: number, subject = "Hi {{first_name}}", body = "Hello {{company}}") => ({ dayOffset, subject, body });

describe("validateSequence", () => {
  it("accepts a named sequence starting at day 0 with ascending offsets", () => {
    expect(validateSequence({ name: " Founders IN ", steps: [step(0), step(3), step(7)] })).toEqual({
      ok: true,
      value: { name: "Founders IN", steps: [step(0), step(3), step(7)] },
    });
  });

  it("rejects a missing name, no steps, or more than 10 steps", () => {
    expect(validateSequence({ name: "", steps: [step(0)] })).toEqual({ ok: false, error: "Sequence name is required." });
    expect(validateSequence({ name: "A", steps: [] })).toEqual({ ok: false, error: "A sequence needs 1 to 10 steps." });
    expect(validateSequence({ name: "A", steps: Array.from({ length: 11 }, (_, i) => step(i)) }).ok).toBe(false);
  });

  it("requires the first step at day 0 and strictly ascending whole-day offsets", () => {
    expect(validateSequence({ name: "A", steps: [step(1)] })).toEqual({ ok: false, error: "Step 1 must be on day 0." });
    expect(validateSequence({ name: "A", steps: [step(0), step(0)] })).toEqual({ ok: false, error: "Step 2 must come after step 1." });
    expect(validateSequence({ name: "A", steps: [step(0), step(2.5)] }).ok).toBe(false);
  });

  it("rejects empty subjects or bodies and unknown merge fields", () => {
    expect(validateSequence({ name: "A", steps: [step(0, " ", "x")] })).toEqual({ ok: false, error: "Step 1 needs a subject and a body." });
    expect(validateSequence({ name: "A", steps: [step(0, "Hi {{revenue}}", "x")] })).toEqual({ ok: false, error: "Step 1 uses an unknown merge field: revenue." });
  });

  it("rejects input that is not the right shape", () => {
    expect(validateSequence(null).ok).toBe(false);
    expect(validateSequence({ name: "A", steps: "x" }).ok).toBe(false);
    expect(validateSequence({ name: "A", steps: [{ dayOffset: "0", subject: "s", body: "b" }] }).ok).toBe(false);
  });
});
