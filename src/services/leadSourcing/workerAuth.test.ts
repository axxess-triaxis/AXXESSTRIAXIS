import { describe, expect, it } from "vitest";
import { workerAuthorized } from "./workerAuth";

const SECRET = "a".repeat(64); // test-only placeholder

const request = (authorization?: string) =>
  new Request("https://app.example.com/api/lead-sourcing/worker/claim", {
    method: "POST",
    headers: authorization === undefined ? {} : { authorization },
  });

describe("workerAuthorized", () => {
  it("accepts the exact bearer secret", () => {
    expect(workerAuthorized(request(`Bearer ${SECRET}`), SECRET)).toBe(true);
  });

  it("ignores a trailing line break or spaces around the configured secret", () => {
    expect(workerAuthorized(request(`Bearer ${SECRET}`), `${SECRET}\r\n`)).toBe(true);
    expect(workerAuthorized(request(`Bearer ${SECRET}`), `  ${SECRET} `)).toBe(true);
  });

  it("refuses a wrong, missing or short secret", () => {
    expect(workerAuthorized(request(`Bearer ${"b".repeat(64)}`), SECRET)).toBe(false);
    expect(workerAuthorized(request(), SECRET)).toBe(false);
    expect(workerAuthorized(request(`Bearer ${SECRET}`), undefined)).toBe(false);
    expect(workerAuthorized(request("Bearer short"), "short")).toBe(false);
    expect(workerAuthorized(request(`Bearer ${"a".repeat(31)}`), `${"a".repeat(31)}\n`)).toBe(false);
  });
});
