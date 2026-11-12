import { describe, expect, it } from "vitest";
import { actionsForCategory, classifyByRules } from "./replySorting";

const reply = (text: string, subject = "Re: Quick question", headers: Record<string, string> = {}) => ({ text, subject, headers });

describe("classifyByRules", () => {
  it("treats an Auto-Submitted header as out of office", () => {
    expect(classifyByRules(reply("Hi", "Re: x", { "Auto-Submitted": "auto-replied" }))).toBe("out_of_office");
  });
  it("treats an out-of-office subject as out of office", () => {
    expect(classifyByRules(reply("Back Monday", "Automatic reply: Quick question"))).toBe("out_of_office");
  });
  it("treats a bare unsubscribe as unsubscribe", () => {
    expect(classifyByRules(reply("Please unsubscribe.\n\nOn Mon, X wrote:\n> hello"))).toBe("unsubscribe");
    expect(classifyByRules(reply("STOP"))).toBe("unsubscribe");
  });
  it("leaves a longer message that mentions stop to the AI", () => {
    expect(classifyByRules(reply("We can't stop thinking about this, can we talk Tuesday?"))).toBeNull();
  });
});

describe("actionsForCategory", () => {
  it("maps each category to its actions", () => {
    expect(actionsForCategory("interested")).toMatchObject({ stopSequence: true, moveNewToQualifying: true, followUpInDays: 1, ownerTask: "Reply: interested - call back" });
    expect(actionsForCategory("not_now")).toMatchObject({ stopSequence: true, followUpInDays: 30, ownerTask: null });
    expect(actionsForCategory("unsubscribe")).toMatchObject({ stopSequence: true, markLost: true, suppressEmail: true });
    expect(actionsForCategory("out_of_office")).toMatchObject({ stopSequence: false, ownerTask: null });
    expect(actionsForCategory("other")).toMatchObject({ stopSequence: true, ownerTask: "Reply needs reading" });
  });
});
