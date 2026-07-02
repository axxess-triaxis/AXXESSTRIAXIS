import { useState } from "react";
import { EmptyState } from "../../components/feedback/EmptyState";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Card } from "../../components/ui/Card";
import { Check, CheckCircle2, Settings, X, XCircle } from "lucide-react";

export const SettingsSection = () => {
  const [tab, setTab] = useState("security");
  const tabs = ["Profile", "Organization", "Security", "Permissions", "AI Configuration"];

  return (
    <div>
      <SectionHeader title="Settings" subtitle="Organization configuration and security" />
      <div className="flex gap-1 mb-6 border-b border-[rgba(0,0,0,0.08)]">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t.toLowerCase())}
            className={`text-sm px-4 py-2 font-medium border-b-2 transition-colors -mb-px ${tab === t.toLowerCase() ? "border-[#8B1E2D] text-[#8B1E2D]" : "border-transparent text-[#5F6B73] hover:text-[#0F1117]"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "security" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#0F1117] mb-4">Security Status</h3>
            <div className="space-y-3">
              {[
                { label: "Multi-Factor Authentication", status: true, detail: "TOTP + Hardware Key" },
                { label: "Single Sign-On (SAML 2.0)", status: true, detail: "Azure AD configured" },
                { label: "Audit Logging", status: true, detail: "All actions · 7-year retention" },
                { label: "End-to-End Encryption", status: true, detail: "AES-256 at rest + TLS 1.3 in transit" },
                { label: "IP Allowlisting", status: false, detail: "Not configured" },
                { label: "Session Timeout", status: true, detail: "8 hours inactivity" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-[rgba(0,0,0,0.04)] last:border-0">
                  {item.status ? <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" /> : <XCircle size={15} className="text-red-400 flex-shrink-0" />}
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-[#0F1117]">{item.label}</div>
                    <div className="text-[11px] text-[#5F6B73]">{item.detail}</div>
                  </div>
                  <button className="text-[11px] text-[#8B1E2D] hover:underline">Configure</button>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#0F1117] mb-4">Role-Based Permissions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[rgba(0,0,0,0.06)]">
                    <th className="text-left text-[11px] font-semibold text-[#5F6B73] pb-2">Role</th>
                    {["View", "Edit", "Approve", "Admin"].map((h) => <th key={h} className="text-center text-[11px] font-semibold text-[#5F6B73] pb-2">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { role: "Executive", perms: [true, false, true, false] },
                    { role: "Program Manager", perms: [true, true, true, false] },
                    { role: "Analyst", perms: [true, true, false, false] },
                    { role: "Stakeholder (External)", perms: [true, false, false, false] },
                    { role: "System Administrator", perms: [true, true, true, true] },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-[rgba(0,0,0,0.04)] last:border-0">
                      <td className="py-2.5 font-medium text-[#0F1117]">{row.role}</td>
                      {row.perms.map((p, j) => (
                        <td key={j} className="py-2.5 text-center">
                          {p ? <Check size={13} className="text-emerald-500 mx-auto" /> : <X size={13} className="text-gray-300 mx-auto" />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "ai configuration" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#0F1117] mb-4">AI Engine Configuration</h3>
            <div className="space-y-4">
              {[
                { label: "Human-in-the-Loop for all write actions", enabled: true },
                { label: "Multilingual response support", enabled: true },
                { label: "Document auto-summarization on upload", enabled: true },
                { label: "Proactive risk alerting", enabled: true },
                { label: "Predictive milestone forecasting (Beta)", enabled: false },
              ].map((setting, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-[#0F1117]">{setting.label}</span>
                  <button className={`relative w-10 h-5.5 rounded-full transition-colors ${setting.enabled ? "bg-[#8B1E2D]" : "bg-[#D1D5DB]"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${setting.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#0F1117] mb-4">AI Usage Statistics</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Queries This Month", value: "2,847" },
                { label: "Documents Analyzed", value: "1,231" },
                { label: "Summaries Generated", value: "643" },
                { label: "Actions Approved", value: "187" },
              ].map((s, i) => (
                <div key={i} className="bg-[#F8F9FA] rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-[#8B1E2D] font-mono">{s.value}</div>
                  <div className="text-[11px] text-[#5F6B73] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {(tab === "profile" || tab === "organization" || tab === "permissions") && (
        <Card className="p-8 flex items-center justify-center">
          <EmptyState
            icon={<Settings size={32} />}
            message="Select Security or AI Configuration to view settings"
          />
        </Card>
      )}
    </div>
  );
};

export default SettingsSection;
