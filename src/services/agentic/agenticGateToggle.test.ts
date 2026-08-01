import { afterEach, describe, expect, it, vi } from "vitest";
import { agenticGateChangedEvent, agenticGateStorageKey, isAgenticGateEnabled, setAgenticGateEnabled } from "./agenticGateToggle";

describe("agenticGateToggle", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("defaults to enabled when never set", () => {
    expect(isAgenticGateEnabled()).toBe(true);
  });

  it("persists an explicit off/on choice", () => {
    setAgenticGateEnabled(false);
    expect(isAgenticGateEnabled()).toBe(false);
    expect(window.localStorage.getItem(agenticGateStorageKey)).toBe("false");

    setAgenticGateEnabled(true);
    expect(isAgenticGateEnabled()).toBe(true);
  });

  it("dispatches a change event other components can listen for", () => {
    const handler = vi.fn();
    window.addEventListener(agenticGateChangedEvent, handler);
    setAgenticGateEnabled(false);
    window.removeEventListener(agenticGateChangedEvent, handler);

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
