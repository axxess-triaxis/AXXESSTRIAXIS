"use client";

import { ExternalLink, Send, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useAnalytics } from "../../services/analytics";
import { applicationServices } from "../../providers/serviceProvider";
import { tenantScopeFromUser } from "../../repositories/supabaseEnterpriseRepositories";
import type { BetaFeedbackType } from "../../domain";
import type { UserContext } from "../../security/rbac";
import { InlineToast } from "../forms/InlineToast";
import { SelectField, TextAreaField } from "../forms/FormField";

type BetaFeedbackModalProps = {
  user: UserContext;
  moduleName: string;
  route: string;
  onClose: () => void;
};

const feedbackTypes: { value: BetaFeedbackType; label: string }[] = [
  { value: "Bug", label: "Bug" },
  { value: "Feature Request", label: "Feature Request" },
  { value: "Confusing Workflow", label: "Confusing Workflow" },
  { value: "General Feedback", label: "General Feedback" },
];

const modules = [
  "Dashboard",
  "Projects",
  "Tasks",
  "Meetings",
  "Notifications",
  "Administration",
  "Onboarding",
  "Other",
].map((value) => ({ value, label: value }));

const ratings = ["1", "2", "3", "4", "5"].map((value) => ({ value, label: value }));

export function BetaFeedbackModal({ user, moduleName, route, onClose }: BetaFeedbackModalProps) {
  const analytics = useAnalytics();
  const scope = useMemo(() => tenantScopeFromUser(user), [user]);
  const [feedbackType, setFeedbackType] = useState<BetaFeedbackType>("General Feedback");
  const [selectedModule, setSelectedModule] = useState(moduleName || "Dashboard");
  const [rating, setRating] = useState("4");
  const [message, setMessage] = useState("");
  const [permissionToContact, setPermissionToContact] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);
  const fallbackUrl = process.env.NEXT_PUBLIC_BETA_FEEDBACK_FORM_URL;

  async function submitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setToast(null);

    if (message.trim().length < 3) {
      analytics.trackEvent("form_validation_failed", { form_name: "beta_feedback", field: "message" }, {
        organization_id: user.organizationId,
        user_id: user.id,
        user_role: user.role,
        module_name: selectedModule,
        route,
      });
      setToast({ tone: "error", message: "Add a short note before submitting." });
      return;
    }

    setSubmitting(true);
    try {
      await applicationServices.betaFeedbackRepository.create(scope, {
        feedbackType,
        module: selectedModule,
        rating: Number(rating),
        message: message.trim(),
        permissionToContact,
        metadata: {
          route,
          release_version: analytics.releaseVersion,
          event_source: "client",
        },
      });

      analytics.trackEvent("feedback_submitted", {
        feedback_type: feedbackType,
        module: selectedModule,
        rating: Number(rating),
        permission_to_contact: permissionToContact,
      }, {
        organization_id: user.organizationId,
        user_id: user.id,
        user_role: user.role,
        module_name: selectedModule,
        route,
      });

      setMessage("");
      setToast({ tone: "success", message: "Feedback submitted. Thank you." });
    } catch {
      setToast({ tone: "error", message: "Feedback could not be saved right now." });
    } finally {
      setSubmitting(false);
    }
  }

  function trackFallbackClick() {
    analytics.trackEvent("beta_feedback_link_clicked", {
      module: selectedModule,
    }, {
      organization_id: user.organizationId,
      user_id: user.id,
      user_role: user.role,
      module_name: selectedModule,
      route,
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-[rgba(0,0,0,0.08)] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[rgba(0,0,0,0.06)] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-[#0F1117]">Send Feedback</h2>
            <p className="mt-1 text-xs text-[#5F6B73]">Beta feedback is reviewed by the AXXESS team.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#5F6B73] hover:bg-[#F2F3F5]" aria-label="Close feedback">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={submitFeedback} className="space-y-4 px-5 py-4">
          {toast && <InlineToast tone={toast.tone} message={toast.message} />}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SelectField label="Type" value={feedbackType} options={feedbackTypes} onChange={(event) => setFeedbackType(event.target.value as BetaFeedbackType)} />
            <SelectField label="Module" value={selectedModule} options={modules} onChange={(event) => setSelectedModule(event.target.value)} />
            <SelectField label="Rating" value={rating} options={ratings} onChange={(event) => setRating(event.target.value)} />
          </div>
          <TextAreaField
            label="Message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={4000}
            placeholder="Share what happened or what would help."
          />
          <label className="flex items-start gap-2 text-xs text-[#5F6B73]">
            <input
              type="checkbox"
              checked={permissionToContact}
              onChange={(event) => setPermissionToContact(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[rgba(0,0,0,0.2)] text-[#8B1E2D]"
            />
            <span>Permission to contact me about this feedback.</span>
          </label>

          <div className="flex flex-col gap-2 border-t border-[rgba(0,0,0,0.06)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            {fallbackUrl ? (
              <a
                href={fallbackUrl}
                target="_blank"
                rel="noreferrer"
                onClick={trackFallbackClick}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8B1E2D] hover:underline"
              >
                External feedback form <ExternalLink size={12} />
              </a>
            ) : <span className="text-xs text-[#5F6B73]">Release {analytics.releaseVersion}</span>}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8B1E2D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={13} /> {submitting ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
