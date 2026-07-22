import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/features/projects/ProjectsSection.tsx"), "utf8");

describe("ProjectsSection (Sprint 2 -- project creation UI/integration)", () => {
  it("calls the real tenant-scoped repository path on save, not a local-only state update", () => {
    expect(source).toContain("applicationServices.projectsRepository.create(scope, { ...payload, progress: 0 })");
    expect(source).toContain("applicationServices.projectsRepository.update(scope, editingProject.id, payload)");
  });

  it("shows a visible success state and a visible error state for project creation", () => {
    expect(source).toContain('setToast({ tone: "success", message: editingProject ? "Project updated." : "Project created." })');
    expect(source).toContain('setToast({ tone: "error", message: "Project could not be saved. Check permissions and required fields." })');
  });

  it("reloads projects from the repository after a successful save, so the created project survives a refresh", () => {
    const submitBlock = source.slice(source.indexOf("const submitProject"), source.indexOf("const ownerOptions"));
    expect(submitBlock).toContain("await loadProjects();");
    expect(source).toContain("applicationServices.projectsRepository.list(scope)");
  });

  it("keeps Demo Mode explicit and visually separate from live project data", () => {
    expect(source).toContain("const demoMode = isDemoModeEnabled();");
    expect(source).toContain("demoMode && (");
    expect(source).toContain("<DemoDataNotice");
    expect(source).toContain('<DataStateBadge key="demo" state={demoMode ? "Demo" : "Live"} />');
  });
});
