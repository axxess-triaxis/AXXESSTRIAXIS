"use client";

import { useState } from "react";
import type { Stakeholder } from "../../domain";

// A-102 (2026-08-09): "Escalate" previously recorded a fixed template string with no escalation
// target at all. Three real paths, per the founder's own spec: a mapped stakeholder, an external
// email, or an internal but unmapped person (email and/or employee code). Extends
// ConfirmDialog.tsx's exact overlay/card chrome, same as AgenticActionablesPrompt.tsx and
// MarkEditedModal.tsx, rather than inventing new modal styling.

export type EscalationResult =
  | { escalationType: "mapped_stakeholder"; escalationTarget: { stakeholderId: string; stakeholderName: string } }
  | { escalationType: "external_email"; escalationTarget: { email: string } }
  | { escalationType: "internal_unmapped"; escalationTarget: { email?: string; employeeCode?: string; name?: string } };

export type EscalateReviewModalProps = {
  open: boolean;
  stakeholders: Stakeholder[];
  onConfirm: (result: EscalationResult) => void;
  onCancel: () => void;
};

type Step = "choice" | "stakeholder" | "external_email" | "internal_unmapped";

export function EscalateReviewModal({ open, stakeholders, onConfirm, onCancel }: EscalateReviewModalProps) {
  const [step, setStep] = useState<Step>("choice");
  const [stakeholderId, setStakeholderId] = useState("");
  const [email, setEmail] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [name, setName] = useState("");

  function reset() {
    setStep("choice");
    setStakeholderId("");
    setEmail("");
    setEmployeeCode("");
    setName("");
  }

  function handleCancel() {
    reset();
    onCancel();
  }

  function confirmStakeholder() {
    const stakeholder = stakeholders.find((item) => item.id === stakeholderId);
    if (!stakeholder) return;
    onConfirm({ escalationType: "mapped_stakeholder", escalationTarget: { stakeholderId: stakeholder.id, stakeholderName: stakeholder.name } });
    reset();
  }

  function confirmExternalEmail() {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) return;
    onConfirm({ escalationType: "external_email", escalationTarget: { email: trimmed } });
    reset();
  }

  function confirmInternalUnmapped() {
    const trimmedEmail = email.trim();
    const trimmedCode = employeeCode.trim();
    if (!trimmedEmail && !trimmedCode) return;
    onConfirm({
      escalationType: "internal_unmapped",
      escalationTarget: { email: trimmedEmail || undefined, employeeCode: trimmedCode || undefined, name: name.trim() || undefined },
    });
    reset();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 px-4" role="dialog" aria-modal="true" aria-labelledby="escalate-review-title">
      <div className="w-full max-w-md rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-5 shadow-xl">
        {step === "choice" && (
          <>
            <h2 id="escalate-review-title" className="text-sm font-semibold text-[#0F1117]">Who should this go to?</h2>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setStep("stakeholder")}
                className="rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-left text-xs font-medium text-[#0F1117] hover:bg-[#F2F3F5]"
              >
                A mapped stakeholder
              </button>
              <button
                type="button"
                onClick={() => setStep("external_email")}
                className="rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-left text-xs font-medium text-[#0F1117] hover:bg-[#F2F3F5]"
              >
                An external email address
              </button>
              <button
                type="button"
                onClick={() => setStep("internal_unmapped")}
                className="rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-left text-xs font-medium text-[#0F1117] hover:bg-[#F2F3F5]"
              >
                An internal person not yet mapped as a stakeholder
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={handleCancel} className="rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-1.5 text-xs font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]">
                Cancel
              </button>
            </div>
          </>
        )}

        {step === "stakeholder" && (
          <>
            <h2 id="escalate-review-title" className="text-sm font-semibold text-[#0F1117]">Escalate to a mapped stakeholder</h2>
            <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">Creates a note visible in Stakeholders &amp; CRM against this stakeholder.</p>
            <select
              value={stakeholderId}
              onChange={(event) => setStakeholderId(event.target.value)}
              className="mt-3 w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none focus:border-[#8B1E2D]"
            >
              <option value="">Select a stakeholder...</option>
              {stakeholders.map((stakeholder) => (
                <option key={stakeholder.id} value={stakeholder.id}>{stakeholder.name}</option>
              ))}
            </select>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setStep("choice")} className="rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-1.5 text-xs font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]">
                Back
              </button>
              <button
                type="button"
                onClick={confirmStakeholder}
                disabled={!stakeholderId}
                className="rounded-lg bg-[#8B1E2D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Escalate
              </button>
            </div>
          </>
        )}

        {step === "external_email" && (
          <>
            <h2 id="escalate-review-title" className="text-sm font-semibold text-[#0F1117]">Escalate to an external email</h2>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="mt-3 w-full rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-xs outline-none focus:border-[#8B1E2D]"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setStep("choice")} className="rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-1.5 text-xs font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]">
                Back
              </button>
              <button
                type="button"
                onClick={confirmExternalEmail}
                disabled={!email.trim().includes("@")}
                className="rounded-lg bg-[#8B1E2D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Escalate
              </button>
            </div>
          </>
        )}

        {step === "internal_unmapped" && (
          <>
            <h2 id="escalate-review-title" className="text-sm font-semibold text-[#0F1117]">Escalate to an internal, unmapped person</h2>
            <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">Provide an email and/or employee code -- at least one is required.</p>
            <div className="mt-3 space-y-2">
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name (optional)"
                className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-xs outline-none focus:border-[#8B1E2D]"
              />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-xs outline-none focus:border-[#8B1E2D]"
              />
              <input
                type="text"
                value={employeeCode}
                onChange={(event) => setEmployeeCode(event.target.value)}
                placeholder="Employee code"
                className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-2 text-xs outline-none focus:border-[#8B1E2D]"
              />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setStep("choice")} className="rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-1.5 text-xs font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]">
                Back
              </button>
              <button
                type="button"
                onClick={confirmInternalUnmapped}
                disabled={!email.trim() && !employeeCode.trim()}
                className="rounded-lg bg-[#8B1E2D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Escalate
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
