import { describe, expect, it } from "vitest";
import { routeForPath, routeForSection, sectionFromPath } from "./routes";

describe("enterprise route metadata", () => {
  it("maps canonical sections to Next paths", () => {
    expect(routeForSection("dashboard").path).toBe("dashboard");
    expect(routeForSection("projects").path).toBe("projects");
  });

  it("maps enterprise aliases to preserved feature sections", () => {
    expect(sectionFromPath("/programs")).toBe("projects");
    expect(sectionFromPath("/crm")).toBe("stakeholders");
    expect(routeForPath("/admin").section).toBe("settings");
  });
});
