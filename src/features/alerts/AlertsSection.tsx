import { BellRing, Radio, ShieldCheck } from "lucide-react";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Card } from "../../components/ui/Card";
import { getDemoSocialAlerts, getSocialAlertProviderStatus } from "../../services/alerts/socialAlerts";

const providerLabels = {
  x: "X",
  facebook: "Facebook",
  rss: "RSS",
  manual: "Manual Intake",
  demo: "Investor Demo",
};

export const AlertsSection = () => {
  const alerts = getDemoSocialAlerts();
  const providers = getSocialAlertProviderStatus();

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Social Alerts"
        subtitle="Provider-gated signal ingestion for policy, funding, risk, and stakeholder intelligence"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {providers.map((provider) => (
          <Card key={provider.provider} className="p-4">
            <div className="flex items-center justify-between">
              <Radio size={14} className={provider.configured ? "text-emerald-600" : "text-[#5F6B73]"} />
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${provider.configured ? "bg-emerald-50 text-emerald-700" : "bg-[#F2F3F5] text-[#5F6B73]"}`}>
                {provider.mode}
              </span>
            </div>
            <div className="mt-3 text-sm font-semibold text-[#0F1117]">{providerLabels[provider.provider]}</div>
            <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">
              {provider.configured ? "Ready for governed ingestion." : "Awaiting provider credentials."}
            </p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#0F1117]">Institutional Signal Queue</h3>
            <p className="mt-1 text-xs text-[#5F6B73]">Demo signals are isolated from live customer tenants and can be converted into tasks, CRM notes, briefs, or risks.</p>
          </div>
          <span className="rounded-full bg-[#8B1E2D]/8 px-2.5 py-1 text-[11px] font-semibold text-[#8B1E2D]">4 active</span>
        </div>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <button key={alert.id} className="flex w-full items-start gap-3 rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] p-3 text-left transition-colors hover:bg-[#F2F3F5]">
              <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${alert.urgency === "high" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                <BellRing size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[#0F1117]">{alert.title}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase text-[#5F6B73]">{alert.topic}</span>
                </div>
                <p className="mt-1 text-xs text-[#5F6B73]">{alert.account} - {new Date(alert.receivedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {alert.actionTargets.map((target) => (
                    <span key={target} className="rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-2 py-0.5 text-[10px] font-medium text-[#0F1117]">
                      {target.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
              <ShieldCheck size={14} className="mt-1 text-emerald-600" />
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[
          ["Tenant Safe", "Alerts are attached to organization-scoped rules before downstream workflow actions."],
          ["Human Review", "External signals create recommendations first; no automated outreach is sent without approval."],
          ["Audit Ready", "Ingestion, triage, conversion, and dismissal events are logged for compliance review."],
        ].map(([title, copy]) => (
          <Card key={title} className="p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#0F1117]">{title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-[#5F6B73]">{copy}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AlertsSection;
