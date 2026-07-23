"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { axxessBetaRoles, axxessSectors, createDefaultOnboardingState, enterpriseOnboardingSteps, isOnboardingComplete, nextOnboardingPath, onboardingGoals, requiredOnboardingNotices, type EnterpriseOnboardingState, type OnboardingStepId } from "../../onboarding/enterpriseOnboarding";
import { AuthProvider, useAuth } from "../../auth/AuthProvider";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/feedback/EmptyState";
import { LoadingState } from "../../components/feedback/LoadingState";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { trackEvent } from "../../services/analytics";

const storageKey = "axxess-enterprise-onboarding";

function loadState(): EnterpriseOnboardingState {
  if (typeof window === "undefined") return createDefaultOnboardingState();
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return createDefaultOnboardingState();
  try {
    return { ...createDefaultOnboardingState(), ...JSON.parse(stored) as EnterpriseOnboardingState };
  } catch {
    return createDefaultOnboardingState();
  }
}

function saveState(state: EnterpriseOnboardingState) {
  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

// Names exactly which of isOnboardingComplete's conditions are unmet, instead of one bundled
// message -- Attempt 3 of the live Tenant 0 walkthrough showed a user misdiagnose a missing-notice
// failure as a department/workspace bug because the message never said which requirement failed.
function missingRequirements(state: EnterpriseOnboardingState): string[] {
  const missing: string[] = [];
  if (!(state.organizationName || state.invitationCode)) missing.push("organization name or invitation code");
  if (!state.sector) missing.push("sector");
  if (!state.role) missing.push("role");
  const missingNotices = requiredOnboardingNotices.filter((notice) => !state.acceptedNotices.includes(notice));
  if (missingNotices.length > 0) missing.push(`notices (${missingNotices.join(", ")})`);
  return missing;
}

type EnterpriseOnboardingPageProps = {
  step: OnboardingStepId;
};

// /onboarding is edge-protected in src/proxy.ts, but wizard state persists in localStorage across
// page loads, so a session that expires mid-wizard (a real possibility across 5+ screens) would
// otherwise only be caught by the final provision call's 401 (Product Issue 2). This client-side
// guard mirrors src/app/App.tsx's loading/unauthenticated pattern so an expired session is caught
// immediately, with wizard progress preserved for when the user signs back in.
export function EnterpriseOnboardingPage({ step }: EnterpriseOnboardingPageProps) {
  return (
    <AuthProvider>
      <OnboardingWizard step={step} />
    </AuthProvider>
  );
}

function OnboardingWizard({ step }: EnterpriseOnboardingPageProps) {
  const router = useRouter();
  const { session, isAuthenticated } = useAuth();
  const [state, setState] = useState<EnterpriseOnboardingState>(() => createDefaultOnboardingState());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    setState(loadState());
  }, []);

  function updateState(nextState: EnterpriseOnboardingState) {
    setState(nextState);
    saveState(nextState);
  }

  async function continueFlow() {
    if (step === "complete") {
      if (!isOnboardingComplete(state)) {
        setMessage({ tone: "error", text: `Complete the following before provisioning: ${missingRequirements(state).join("; ")}.` });
        return;
      }

      setBusy(true);
      setMessage(null);
      try {
        const response = await fetch("/api/onboarding/provision", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state),
        });
        const result = await response.json().catch(() => ({} as { error?: string }));
        if (!response.ok) throw new Error(result.error ?? "Tenant provisioning failed.");
        window.localStorage.removeItem(storageKey);
        trackEvent("organization_created", { sector: state.sector, role: state.role }, { module_name: "onboarding", route: "/onboarding/complete" });

        const goal = onboardingGoals.find((item) => item.id === state.primaryGoal);
        if (goal) {
          const seedResponse = await fetch("/api/onboarding/seed-sample-data", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ goal: goal.id }),
          }).catch(() => undefined);
          trackEvent("onboarding_step_completed", { step: "seed-sample-data", goal: goal.id, seeded: Boolean(seedResponse?.ok) }, { module_name: "onboarding", route: "/onboarding/complete" });
          router.push(goal.route as Route);
          return;
        }
        router.push("/dashboard");
      } catch (error) {
        setMessage({ tone: "error", text: error instanceof Error ? error.message : "Tenant provisioning failed." });
      } finally {
        setBusy(false);
      }
      return;
    }

    if (step === "security") {
      const missingNotices = requiredOnboardingNotices.filter((notice) => !state.acceptedNotices.includes(notice));
      if (missingNotices.length > 0) {
        setMessage({ tone: "error", text: `Accept all required notices to continue: ${missingNotices.join(", ")}.` });
        return;
      }
      setMessage(null);
      trackEvent("onboarding_step_completed", { step, notices_accepted: state.acceptedNotices.length }, { module_name: "onboarding", route: "/onboarding/security" });
    }
    router.push(nextOnboardingPath(step, state) as Route);
  }

  if (session.status === "loading") {
    return <LoadingState label="Checking session" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F3F5] px-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <Card className="max-w-md p-8">
          <EmptyState
            title="Sign in required"
            message="Your session is required to continue onboarding. Your progress on this device is saved and will be here when you sign back in."
          />
          <a className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-[#8B1E2D] px-4 py-2 text-sm font-semibold text-white" href="/auth?next=/onboarding">
            Sign in
          </a>
        </Card>
      </div>
    );
  }

  const currentIndex = Math.max(0, enterpriseOnboardingSteps.findIndex((item) => item.id === step));
  const progress = Math.round(((currentIndex + 1) / enterpriseOnboardingSteps.length) * 100);
  const complete = isOnboardingComplete(state);

  return (
    <main className="min-h-screen bg-[#F2F3F5] px-4 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mx-auto max-w-5xl">
        <SectionHeader title="Enterprise onboarding" subtitle="Create a clean tenant, workspace, role, and beta-safe security baseline." />
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-[#8B1E2D]" style={{ width: `${progress}%` }} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <Card className="p-4">
            <div className="space-y-2">
              {enterpriseOnboardingSteps.map((item, index) => (
                <Link
                  key={item.id}
                  href={item.path as Route}
                  className={`block rounded-lg px-3 py-2 text-xs font-semibold ${item.id === step ? "bg-[#8B1E2D] text-white" : index <= currentIndex ? "bg-[#F8F9FA] text-[#0F1117]" : "text-[#5F6B73]"}`}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            {step === "start" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-[#0F1117]">How should this user enter AXXESS?</h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <button onClick={() => updateState({ ...state, mode: "create-organization" })} className={`rounded-lg border p-4 text-left ${state.mode === "create-organization" ? "border-[#8B1E2D] bg-[#8B1E2D]/5" : "border-[rgba(0,0,0,0.08)]"}`}>
                      <span className="block text-sm font-semibold text-[#0F1117]">Create organization</span>
                      <span className="mt-1 block text-xs text-[#5F6B73]">Provision a new clean tenant for a live beta customer.</span>
                    </button>
                    <button onClick={() => updateState({ ...state, mode: "join-organization" })} className={`rounded-lg border p-4 text-left ${state.mode === "join-organization" ? "border-[#8B1E2D] bg-[#8B1E2D]/5" : "border-[rgba(0,0,0,0.08)]"}`}>
                      <span className="block text-sm font-semibold text-[#0F1117]">Join organization</span>
                      <span className="mt-1 block text-xs text-[#5F6B73]">Use an invitation to join an existing tenant.</span>
                    </button>
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0F1117]">What do you want to try first?</h2>
                  <p className="mt-1 text-xs text-[#5F6B73]">Optional — pick one to get a sample workspace and land in the right place. Skip this and you&apos;ll start from an empty dashboard.</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {onboardingGoals.map((goal) => (
                      <button
                        key={goal.id}
                        onClick={() => updateState({ ...state, primaryGoal: state.primaryGoal === goal.id ? undefined : goal.id })}
                        className={`rounded-lg border p-4 text-left ${state.primaryGoal === goal.id ? "border-[#8B1E2D] bg-[#8B1E2D]/5" : "border-[rgba(0,0,0,0.08)]"}`}
                      >
                        <span className="block text-sm font-semibold text-[#0F1117]">{goal.title}</span>
                        <span className="mt-1 block text-xs text-[#5F6B73]">{goal.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === "create-organization" && (
              <FieldPanel title="Create organization" description="This creates a production tenant path. Demo Mode never writes to this tenant.">
                <TextInput label="Organization name" value={state.organizationName ?? ""} onChange={(value) => updateState({ ...state, mode: "create-organization", organizationName: value })} />
              </FieldPanel>
            )}

            {step === "join-organization" && (
              <FieldPanel title="Join organization" description="Invitation tokens are validated server-side in production. This screen stores no service-role material.">
                <TextInput label="Invitation code" value={state.invitationCode ?? ""} onChange={(value) => updateState({ ...state, mode: "join-organization", invitationCode: value })} />
              </FieldPanel>
            )}

            {step === "sector" && (
              <FieldPanel title="Sector and role" description="Select the operating context and initial role for RBAC provisioning.">
                <SelectInput label="Sector" value={state.sector ?? ""} options={axxessSectors} onChange={(value) => updateState({ ...state, sector: value as EnterpriseOnboardingState["sector"] })} />
                <SelectInput label="Role" value={state.role ?? ""} options={axxessBetaRoles} onChange={(value) => updateState({ ...state, role: value as EnterpriseOnboardingState["role"] })} />
              </FieldPanel>
            )}

            {step === "workspace" && (
              <FieldPanel title="Department and workspace" description="Optional — create a first department and workspace boundary now, or skip and add one later from Organization Admin.">
                <TextInput label="Department name (optional)" value={state.departmentName ?? ""} onChange={(value) => updateState({ ...state, departmentName: value })} />
                <TextInput label="Workspace name (optional)" value={state.workspaceName ?? ""} onChange={(value) => updateState({ ...state, workspaceName: value })} />
              </FieldPanel>
            )}

            {step === "security" && (
              <FieldPanel title="Security and beta notices" description="Users must accept the beta legal and AI usage notices before entering a clean tenant.">
                <div className="space-y-2">
                  {requiredOnboardingNotices.map((notice) => (
                    <label key={notice} className="flex items-center gap-3 rounded-lg bg-[#F8F9FA] p-3 text-sm text-[#0F1117]">
                      <input
                        type="checkbox"
                        checked={state.acceptedNotices.includes(notice)}
                        onChange={(event) => {
                          const acceptedNotices = event.target.checked
                            ? [...new Set([...state.acceptedNotices, notice])]
                            : state.acceptedNotices.filter((item) => item !== notice);
                          updateState({ ...state, acceptedNotices });
                        }}
                      />
                      {notice}
                    </label>
                  ))}
                </div>
              </FieldPanel>
            )}

            {step === "complete" && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-[#0F1117]">{complete ? "Tenant ready for beta" : "Onboarding needs attention"}</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    ["Organization", state.organizationName ?? state.invitationCode ?? "Not set"],
                    ["Sector", state.sector ?? "Not set"],
                    ["Role", state.role ?? "Not set"],
                    ["Department", state.departmentName ?? "Skipped (optional)"],
                    ["Workspace", state.workspaceName ?? "Skipped (optional)"],
                    ["Starting focus", onboardingGoals.find((item) => item.id === state.primaryGoal)?.title ?? "None selected -- empty dashboard"],
                    ["Notices", `${state.acceptedNotices.length}/${requiredOnboardingNotices.length} accepted`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-[#F8F9FA] p-3">
                      <div className="text-[10px] font-semibold uppercase text-[#5F6B73]">{label}</div>
                      <div className="mt-1 text-sm font-semibold text-[#0F1117]">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {message && (
              <div className={`mt-5 rounded-lg px-3 py-2 text-xs font-medium ${message.tone === "error" ? "bg-red-50 text-red-700" : message.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-[#F8F9FA] text-[#0F1117]"}`}>
                {message.text}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => void continueFlow()} disabled={busy} className="rounded-lg bg-[#8B1E2D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60">
                {busy ? "Provisioning..." : step === "complete" ? "Provision tenant" : "Continue"}
              </button>
              <Link href="/auth" className="rounded-lg border border-[rgba(0,0,0,0.12)] px-4 py-2 text-sm font-semibold text-[#0F1117]">
                Back to auth
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}

function FieldPanel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-[#0F1117]">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-[#5F6B73]">{description}</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#0F1117]">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E2D]" />
    </label>
  );
}

function SelectInput({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#0F1117]">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E2D]">
        <option value="">Select</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
