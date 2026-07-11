import { SectionHeader } from "../../components/layout/SectionHeader";
import { Card } from "../../components/ui/Card";
import { applicationServices } from "../../providers/serviceProvider";
import { getIntegrationHealth, getProductivityPluginRegistry } from "../../services/integrations/pluginRegistry";

const integrations = applicationServices.institutionalRepository.getIntegrations();
const pluginRegistry = getProductivityPluginRegistry();
const pluginHealth = getIntegrationHealth();

export const IntegrationsSection = () => (
  <div className="space-y-5">
    <SectionHeader title="Integrations" subtitle={`${pluginHealth.total} plugin adapters - ${pluginHealth.webhookReady} webhook-ready - provider-gated for production credentials`} />

    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[
        ["Adapters", pluginHealth.total],
        ["Configured", pluginHealth.configured],
        ["Demo Ready", pluginHealth.demoConnected],
        ["Webhooks", pluginHealth.webhookReady],
      ].map(([label, value]) => (
        <Card key={label} className="p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6B73]">{label}</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-[#0F1117]">{value}</div>
        </Card>
      ))}
    </div>

    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {integrations.map((int) => (
        <Card key={int.name} className="p-4 transition-shadow hover:shadow-md">
          <div className="mb-3 flex items-start justify-between">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-white ${int.status === "connected" ? "bg-[#2C4A7C]" : int.status === "pending" ? "bg-[#C9A227]" : "bg-[#5F6B73]"}`}>
              {int.icon}
            </div>
            <span className={`mt-1 h-2 w-2 rounded-full ${int.status === "connected" ? "bg-emerald-500" : int.status === "pending" ? "bg-amber-500" : "bg-gray-300"}`} />
          </div>
          <div className="mb-0.5 text-sm font-semibold text-[#0F1117]">{int.name}</div>
          <div className="text-[11px] text-[#5F6B73]">{int.category}</div>
          <div className="mt-2 font-mono text-[10px] text-[#5F6B73]">
            {int.status === "connected" ? `Synced ${int.lastSync}` : int.status === "pending" ? "Setup required" : "Disconnected"}
          </div>
        </Card>
      ))}
    </div>

    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#0F1117]">Productivity Plugin Registry</h3>
          <p className="mt-1 text-xs text-[#5F6B73]">OAuth scopes, role gates, webhook readiness, and audit events for enterprise integrations.</p>
        </div>
        <span className="rounded-full bg-[#8B1E2D]/8 px-2.5 py-1 text-[11px] font-semibold text-[#8B1E2D]">Sprint 14</span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {pluginRegistry.map((plugin) => (
          <div key={plugin.id} className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#F8F9FA] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[#0F1117]">{plugin.name}</div>
                <div className="mt-0.5 font-mono text-[11px] uppercase text-[#5F6B73]">{plugin.category}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${plugin.configured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {plugin.configured ? "configured" : "gated"}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#5F6B73]">{plugin.useCases.join(" - ")}</p>
          </div>
        ))}
      </div>
    </Card>
  </div>
);

export default IntegrationsSection;
