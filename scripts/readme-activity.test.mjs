import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { END, START, applyBlock, clean, isBot, isShown, onlyBlockChanged, repoBlock } from "./readme-activity.mjs";

const item = { title: "feat: x", url: "https://github.com/o/r/pull/1", date: "2026-11-24" };
const block = (over = {}) => repoBlock({ date: "2026-11-25", days: 14, items: [item], hidden: 0, ...over });
const readme = ["# T", "", "keep", "", START, "old", END, "", "tail", ""].join("\n");

describe("README activity block", () => {
  it("replaces only the block", () => {
    const next = applyBlock(readme, block());
    expect(next.split("\n")).not.toContain("old");
    expect(onlyBlockChanged(readme, next)).toBe(true);
  });

  it("does nothing when only the date would change", () => {
    const once = applyBlock(readme, block());
    expect(applyBlock(once, block({ date: "2026-11-27" }))).toBe(once);
    expect(applyBlock(once, block({ date: "2026-11-27", hidden: 2 }))).not.toBe(once);
  });

  it("reports a live check that stopped answering", () => {
    expect(block({ checks: [{ url: "https://a", result: "HTTP 500" }] })).toContain("| https://a | HTTP 500 |");
  });

  it("refuses missing, repeated or reversed markers", () => {
    for (const bad of ["no markers", readme + START, END + START]) expect(() => applyBlock(bad, block())).toThrow();
  });

  it("guard rejects any edit outside the block", () => {
    const next = applyBlock(readme, block());
    expect(onlyBlockChanged(readme, next.replace("keep", "changed"))).toBe(false);
    expect(onlyBlockChanged(readme, `${next}more`)).toBe(false);
  });

  it("keeps titles from adding markup, mentions or markers", () => {
    expect(clean(`a <img src=x> @someone ${START}`)).not.toMatch(/[<>@]/);
  });

  it("shows product changes by people only", () => {
    expect(isShown("feat(rag): y")).toBe(true);
    expect(isShown("docs: y")).toBe(false);
    expect(isShown("chore(deps): y")).toBe(false);
    expect(isShown("feat: hidden launch", /hidden/i)).toBe(false);
    expect(isBot("github-actions[bot]")).toBe(true);
  });

  it("finds exactly one pair of markers in this repository's README", () => {
    const real = readFileSync(join(process.cwd(), "README.md"), "utf8");
    expect(onlyBlockChanged(real, applyBlock(real, block()))).toBe(true);
  });
});
