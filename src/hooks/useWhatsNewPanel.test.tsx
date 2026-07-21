import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { releaseVersion } from "../services/analytics/config";
import { useWhatsNewPanel } from "./useWhatsNewPanel";

function Harness() {
  const panel = useWhatsNewPanel();
  return (
    <div>
      <span>{panel.visible ? "visible" : "hidden"}</span>
      <button onClick={panel.dismiss}>dismiss</button>
    </div>
  );
}

describe("useWhatsNewPanel", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows for a user who has never seen this release's entries", () => {
    render(<Harness />);
    expect(screen.getByText("visible")).toBeInTheDocument();
  });

  it("hides after dismissal and stays hidden for the same release version", () => {
    const { unmount } = render(<Harness />);
    fireEvent.click(screen.getByText("dismiss"));
    expect(window.localStorage.getItem("axxess.whats-new.last-seen-version")).toBe(releaseVersion);
    unmount();

    render(<Harness />);
    expect(screen.getByText("hidden")).toBeInTheDocument();
  });

  it("shows again once the release version changes -- unlike the once-ever A9 micro-survey", () => {
    window.localStorage.setItem("axxess.whats-new.last-seen-version", "some-older-release");
    render(<Harness />);
    expect(screen.getByText("visible")).toBeInTheDocument();
  });
});
