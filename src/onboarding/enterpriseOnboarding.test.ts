import { describe, expect, it } from "vitest";
import { createDefaultOnboardingState, isOnboardingComplete, nextOnboardingPath, requiredOnboardingNotices } from "./enterpriseOnboarding";

describe("enterprise onboarding model", () => {
  it("routes new organizations through creation before sector and workspace setup", () => {
    expect(nextOnboardingPath("start", { ...createDefaultOnboardingState(), mode: "create-organization" })).toBe("/onboarding/create-organization");
    expect(nextOnboardingPath("create-organization", createDefaultOnboardingState())).toBe("/onboarding/sector");
  });

  it("requires tenant, sector, role, and notices before completion", () => {
    expect(isOnboardingComplete({
      organizationName: "North East Health Mission",
      sector: "Healthcare",
      role: "Organization Admin",
      departmentName: "Mission Secretariat",
      workspaceName: "Pilot Operations",
      acceptedNotices: [...requiredOnboardingNotices],
    })).toBe(true);
  });

  it("does not require department or workspace names -- an unnecessary setup decision the backend already defaults", () => {
    expect(isOnboardingComplete({
      organizationName: "North East Health Mission",
      sector: "Healthcare",
      role: "Organization Admin",
      acceptedNotices: [...requiredOnboardingNotices],
    })).toBe(true);
  });

  it("still requires the core fields", () => {
    expect(isOnboardingComplete({
      acceptedNotices: [...requiredOnboardingNotices],
    })).toBe(false);
    expect(isOnboardingComplete({
      organizationName: "North East Health Mission",
      sector: "Healthcare",
      role: "Organization Admin",
      acceptedNotices: [],
    })).toBe(false);
  });
});
