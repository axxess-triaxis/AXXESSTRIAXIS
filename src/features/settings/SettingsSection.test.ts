import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initialTabFromLocation } from "./SettingsSection";

const source = readFileSync(join(process.cwd(), "src/features/settings/SettingsSection.tsx"), "utf8");

function setLocationSearch(search: string) {
  window.history.pushState({}, "", `/settings${search}`);
}

describe("initialTabFromLocation (A-36/A-37 fix -- respects ?tab= intent instead of always defaulting to Security)", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/settings");
  });

  it("defaults to security when no tab is requested", () => {
    setLocationSearch("");
    expect(initialTabFromLocation()).toBe("security");
  });

  it("honors ?tab=users (the real Invite Pilot Team / role-change destination)", () => {
    setLocationSearch("?tab=users");
    expect(initialTabFromLocation()).toBe("users");
  });

  it("honors ?tab=permissions", () => {
    setLocationSearch("?tab=permissions");
    expect(initialTabFromLocation()).toBe("permissions");
  });

  it("falls back to security for an unrecognized tab value rather than rendering nothing", () => {
    setLocationSearch("?tab=not-a-real-tab");
    expect(initialTabFromLocation()).toBe("security");
  });
});

describe("SettingsSection (Sprint 3 -- audited, does not hang)", () => {
  it("does not gate its main render behind an unresolved loading flag", () => {
    // Settings renders its form/user-admin state unconditionally and populates it asynchronously --
    // there is no `if (loading) return <LoadingState .../>` style gate that could get stuck. If a
    // future change introduces one, it must also guarantee a terminal (timeout/error) fallback.
    expect(source).not.toMatch(/if \(loading\) return/);
    expect(source).not.toMatch(/state\.loading \? <LoadingState/);
  });

  it("shows a user-facing error toast rather than hanging when user-admin data fails to load", () => {
    const loadUsersBlock = source.slice(source.indexOf("const loadUsers"), source.indexOf("const loadUsers") + 700);
    expect(loadUsersBlock).toContain("catch {");
    expect(loadUsersBlock).toContain("Unable to load user administration data.");
  });
});
