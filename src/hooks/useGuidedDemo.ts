"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { NavSection } from "../app/navigation";
import {
  firstGuidedDemoStep,
  guidedDemoStepForSection,
  guidedDemoStepIndex,
  guidedDemoSteps,
  nextGuidedDemoStep,
  previousGuidedDemoStep,
} from "../lib/demo/demoWorkflow";

const STORAGE_KEY = "axxess.guided-demo";
const EVENT_NAME = "axxess-guided-demo-updated";

type StoredDemoState = {
  active: boolean;
  currentStepId: string;
  startedAt: string;
};

function readStoredState(): StoredDemoState | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as StoredDemoState;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return undefined;
  }
}

function writeStoredState(state: StoredDemoState | undefined) {
  if (typeof window === "undefined") return;
  if (!state) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

function syncUrl(active: boolean) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (active) url.searchParams.set("demo", "guided");
  else url.searchParams.delete("demo");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function useGuidedDemo(activeSection?: NavSection, navigateToSection?: (section: NavSection) => void) {
  const [state, setState] = useState<StoredDemoState>(() => {
    const stored = readStoredState();
    if (stored) return stored;
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "guided") {
      return { active: true, currentStepId: guidedDemoStepForSection(activeSection ?? "dashboard").id, startedAt: new Date().toISOString() };
    }
    return { active: false, currentStepId: firstGuidedDemoStep().id, startedAt: "" };
  });

  useEffect(() => {
    const sync = () => {
      const stored = readStoredState();
      if (stored) setState(stored);
    };
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!state.active || !activeSection) return;
    const sectionStep = guidedDemoStepForSection(activeSection);
    if (sectionStep.id === state.currentStepId) return;
    const nextState = { ...state, currentStepId: sectionStep.id };
    setState(nextState);
    writeStoredState(nextState);
  }, [activeSection, state]);

  const currentStep = useMemo(() => guidedDemoSteps.find((step) => step.id === state.currentStepId) ?? firstGuidedDemoStep(), [state.currentStepId]);
  const currentIndex = guidedDemoStepIndex(currentStep.id);

  const startDemo = useCallback(() => {
    const nextState = {
      active: true,
      currentStepId: guidedDemoStepForSection(activeSection ?? "dashboard").id,
      startedAt: new Date().toISOString(),
    };
    setState(nextState);
    writeStoredState(nextState);
    syncUrl(true);
  }, [activeSection]);

  const stopDemo = useCallback(() => {
    const nextState = { active: false, currentStepId: firstGuidedDemoStep().id, startedAt: "" };
    setState(nextState);
    writeStoredState(undefined);
    syncUrl(false);
  }, []);

  const goToStep = useCallback((stepId: string) => {
    const step = guidedDemoSteps.find((item) => item.id === stepId) ?? firstGuidedDemoStep();
    const nextState = { active: true, currentStepId: step.id, startedAt: state.startedAt || new Date().toISOString() };
    setState(nextState);
    writeStoredState(nextState);
    syncUrl(true);
    navigateToSection?.(step.section);
  }, [navigateToSection, state.startedAt]);

  const goNext = useCallback(() => goToStep(nextGuidedDemoStep(currentStep.id).id), [currentStep.id, goToStep]);
  const goPrevious = useCallback(() => goToStep(previousGuidedDemoStep(currentStep.id).id), [currentStep.id, goToStep]);

  return {
    active: state.active,
    currentStep,
    currentIndex,
    steps: guidedDemoSteps,
    progressPercent: Math.round(((currentIndex + 1) / guidedDemoSteps.length) * 100),
    startDemo,
    stopDemo,
    goToStep,
    goNext,
    goPrevious,
    isFirstStep: currentIndex === 0,
    isLastStep: currentIndex === guidedDemoSteps.length - 1,
  };
}
