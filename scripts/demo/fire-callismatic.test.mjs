import { describe, expect, it } from "vitest";
import {
  DEMO_MESSAGE,
  adminKeyFrom,
  demoPhone,
  describeResult,
  triageRequest,
} from "./fire-callismatic-lib.mjs";

const FAKE_KEY = "fake-admin-key-for-tests-0000";

describe("triageRequest", () => {
  it("never asks Callismatic to place a real callback", () => {
    const request = triageRequest({ url: "https://example.lambda-url.us-east-1.on.aws/", key: FAKE_KEY, sender: "+12025550142", messageId: "triaxis-demo-1" });
    expect(JSON.parse(request.init.body)).toEqual({
      channel: "sms",
      sender: "+12025550142",
      message_id: "triaxis-demo-1",
      text: DEMO_MESSAGE,
      place_callbacks: false,
    });
  });

  it("posts to /api/triage/text with the key only in the header", () => {
    const request = triageRequest({ url: "https://example.lambda-url.us-east-1.on.aws/", key: FAKE_KEY, sender: "+12025550142", messageId: "triaxis-demo-1" });
    expect(request.url).toBe("https://example.lambda-url.us-east-1.on.aws/api/triage/text");
    expect(request.init.method).toBe("POST");
    expect(request.init.headers["x-api-key"]).toBe(FAKE_KEY);
    expect(request.init.body).not.toContain(FAKE_KEY);
  });

  it("adds the slash a Function URL may be missing", () => {
    const request = triageRequest({ url: "https://example.lambda-url.us-east-1.on.aws", key: FAKE_KEY, sender: "+12025550142", messageId: "m" });
    expect(request.url).toBe("https://example.lambda-url.us-east-1.on.aws/api/triage/text");
  });
});

describe("demoPhone", () => {
  it("only returns numbers reserved for fiction (555-0100 to 555-0199)", () => {
    for (let i = 0; i < 200; i += 1) expect(demoPhone()).toMatch(/^\+120255501\d\d$/);
  });
});

describe("adminKeyFrom", () => {
  it("reads ADMIN_API_KEY from the secret JSON", () => {
    expect(adminKeyFrom(JSON.stringify({ ADMIN_API_KEY: ` ${FAKE_KEY}\n`, OTHER: "x" }))).toBe(FAKE_KEY);
  });

  it("names the missing key without echoing the secret", () => {
    const secret = JSON.stringify({ READ_API_KEY: "should-not-appear" });
    expect(() => adminKeyFrom(secret)).toThrow(/ADMIN_API_KEY is not set/);
    try {
      adminKeyFrom(secret);
    } catch (error) {
      expect(String(error)).not.toContain("should-not-appear");
    }
  });

  it("does not echo a secret that is not JSON", () => {
    expect(() => adminKeyFrom("not-json-secret-value")).toThrow(/not JSON/);
    try {
      adminKeyFrom("not-json-secret-value");
    } catch (error) {
      expect(String(error)).not.toContain("not-json-secret-value");
    }
  });
});

describe("describeResult", () => {
  const base = { file_name: "sms_+12025550142.json", caller_number: "+12025550142", callback_result: null, error: null };

  it("says a lead becomes a task", () => {
    const lines = describeResult({ ...base, triage: { category: "lead", urgency: "high", needs_decision: false } }, "triaxis-demo-1", 6200);
    expect(lines.join("\n")).toMatch(/LEAD/);
    expect(lines.join("\n")).toMatch(/becomes an AXXESS task/);
    expect(lines.join("\n")).toMatch(/6\.2 s/);
  });

  it("says an important message with a decision becomes a task", () => {
    const lines = describeResult({ ...base, triage: { category: "important", urgency: "medium", needs_decision: true } }, "m", 1000);
    expect(lines.join("\n")).toMatch(/becomes an AXXESS task/);
  });

  it("says an important message without a decision makes no task", () => {
    const lines = describeResult({ ...base, triage: { category: "important", urgency: "medium", needs_decision: false } }, "m", 1000);
    expect(lines.join("\n")).toMatch(/no task/);
  });

  it("reports a Callismatic error", () => {
    const lines = describeResult({ ...base, triage: null, error: "model timeout" }, "m", 1000);
    expect(lines.join("\n")).toMatch(/Callismatic error: model timeout/);
  });

  it("never prints the sender's number", () => {
    const lines = describeResult({ ...base, triage: { category: "lead", urgency: "high", needs_decision: true } }, "m", 1000);
    expect(lines.join("\n")).not.toContain("5550142");
  });
});
