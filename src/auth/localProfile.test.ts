import { afterEach, describe, expect, it } from "vitest";
import { demoUserContext, isDemoLogin } from "../demo/demoMode";
import { createUserProfile, loadStoredUserProfile, mergeUserProfile, saveStoredUserProfile } from "./localProfile";

afterEach(() => {
  window.localStorage.clear();
});

describe("local profile helpers", () => {
  it("creates and merges editable user profile fields", () => {
    const profile = createUserProfile(demoUserContext, {
      displayName: "Dr. Ananya Rao",
      email: "investor.preview@axxess.demo",
      avatarInitials: "dar",
      department: "Knowledge & Analytics",
      title: "Investor Preview Executive",
      timezone: "Asia/Kolkata",
    });

    expect(profile.displayName).toBe("Dr. Ananya Rao");
    expect(profile.avatarInitials).toBe("DAR");
    expect(profile.department).toBe("Knowledge & Analytics");
    expect(profile.role).toBe("Organization Admin");
  });

  it("persists profile edits by organization and user", () => {
    saveStoredUserProfile(demoUserContext, {
      displayName: "Ananya Rao",
      department: "Mission Secretariat",
    });

    expect(loadStoredUserProfile(demoUserContext)).toEqual(expect.objectContaining({
      displayName: "Ananya Rao",
      department: "Mission Secretariat",
    }));
    expect(mergeUserProfile(demoUserContext, loadStoredUserProfile(demoUserContext) ?? {}).department).toBe("Mission Secretariat");
  });

  it("accepts the investor preview login credential", () => {
    expect(isDemoLogin("investor.preview@axxess.demo", "preview")).toBe(true);
    expect(isDemoLogin("investor.preview@axxess.demo", "wrong-password")).toBe(false);
  });
});
