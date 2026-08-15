import { describe, expect, it } from "vitest";
import { buildChatPrompt, parseChatResponse } from "./chatIntentPrompt";

describe("buildChatPrompt", () => {
  it("includes the user message and every catalogue action", () => {
    const prompt = buildChatPrompt("create a task called Ship the report", [
      { action: "create_task", description: "Create a task.", argsHint: "title (required)" },
    ]);
    expect(prompt).toContain("create a task called Ship the report");
    expect(prompt).toContain("create_task");
  });
});

describe("parseChatResponse", () => {
  it("parses a valid type:chat response", () => {
    expect(parseChatResponse('{"type":"chat","reply":"Sure, what do you need?"}')).toEqual({
      type: "chat",
      reply: "Sure, what do you need?",
    });
  });

  it("parses a valid type:command response, including args", () => {
    expect(
      parseChatResponse('{"type":"command","action":"create_task","args":{"title":"Ship the report"},"reply":"Creating that task now."}'),
    ).toEqual({
      type: "command",
      action: "create_task",
      args: { title: "Ship the report" },
      reply: "Creating that task now.",
    });
  });

  it("defaults args to {} when the command response omits it", () => {
    const result = parseChatResponse('{"type":"command","action":"create_task","reply":"On it."}');
    expect(result).toEqual({ type: "command", action: "create_task", args: {}, reply: "On it." });
  });

  it("falls back to a plain chat reply on malformed JSON, never throwing", () => {
    expect(parseChatResponse("not json at all")).toEqual({ type: "chat", reply: "not json at all" });
  });

  it("falls back to a plain chat reply when the shape matches neither variant", () => {
    expect(parseChatResponse('{"foo":"bar"}')).toEqual({ type: "chat", reply: '{"foo":"bar"}' });
  });
});
