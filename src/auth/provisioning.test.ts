import { describe, expect, it } from "vitest";
import { initialsForName, normalizeOnboardingRole, normalizeOnboardingSector, slugFromOrganizationName } from "./provisioning";

describe("tenant provisioning helpers", () => {
  it("creates stable tenant slugs from organization names", () => {
    expect(slugFromOrganizationName("North East Public Health Authority")).toBe("north-east-public-health-authority");
    expect(slugFromOrganizationName("  AXXESS / TRIAXIS Pilot  ")).toBe("axxess-triaxis-pilot");
  });

  it("normalizes onboarding sector and role inputs", () => {
    expect(normalizeOnboardingSector("Healthcare")).toBe("healthcare");
    expect(normalizeOnboardingSector("Unknown")).toBe("other");
    expect(normalizeOnboardingRole("Manager")).toBe("Manager");
    expect(normalizeOnboardingRole("Department Admin")).toBe("Organization Admin");
  });

  it("derives readable avatar initials from names and email addresses", () => {
    expect(initialsForName("Ananya Bora")).toBe("AB");
    expect(initialsForName("district.lead@health.example")).toBe("DL");
  });
});
