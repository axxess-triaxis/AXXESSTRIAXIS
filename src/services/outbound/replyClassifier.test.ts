import { describe, expect, it, vi } from "vitest";
import { classifyReply, type MessagesClient } from "./replyClassifier";

function fakeClient(result: unknown) {
  const create = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  return { client: { beta: { messages: { create } } } as unknown as MessagesClient, create };
}

const reply = { subject: "Re: Quick question", text: "Sounds useful, can we speak Thursday at 3?", headers: {} };

describe("classifyReply", () => {
  it("uses the rules without calling Claude for a clear unsubscribe", async () => {
    const { client, create } = fakeClient(null);
    expect(await classifyReply({ ...reply, text: "unsubscribe" }, client)).toEqual({ category: "unsubscribe", classifiedBy: "rules" });
    expect(create).not.toHaveBeenCalled();
  });

  it("maps Claude's structured output to the category, with fallbacks and low effort, sending only subject and text", async () => {
    const { client, create } = fakeClient({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ category: "interested", reason: "Asks for a call." }) }] });
    expect(await classifyReply(reply, client)).toEqual({ category: "interested", classifiedBy: "claude", reason: "Asks for a call." });
    const params = (create.mock.calls[0] as unknown[])[0] as Record<string, unknown> & { output_config: { effort: string }; messages: { content: string }[] };
    expect(params.model).toBe("claude-opus-5-5");
    expect(params.fallbacks).toBe("default");
    expect(params.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect(params.output_config.effort).toBe("low");
    expect(params.messages[0].content).toContain("Thursday at 3");
  });

  it("falls back to other on a refusal, an error, bad output, or no key", async () => {
    expect(await classifyReply(reply, fakeClient({ stop_reason: "refusal", content: [] }).client)).toMatchObject({ category: "other", classifiedBy: "fallback" });
    expect(await classifyReply(reply, fakeClient(new Error("boom")).client)).toMatchObject({ category: "other", classifiedBy: "fallback" });
    expect(await classifyReply(reply, fakeClient({ stop_reason: "end_turn", content: [{ type: "text", text: "{\"category\":\"maybe\"}" }] }).client)).toMatchObject({ category: "other", classifiedBy: "fallback" });
    expect(await classifyReply(reply, null)).toMatchObject({ category: "other", classifiedBy: "fallback" });
  });
});
