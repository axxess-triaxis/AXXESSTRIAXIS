import { SectionHeader } from "../../components/layout/SectionHeader";
import { Card } from "../../components/ui/Card";
import { applicationServices } from "../../providers/serviceProvider";

const integrations = applicationServices.institutionalRepository.getIntegrations();

export const IntegrationsSection = () => (
  <div>
    <SectionHeader title="Integrations" subtitle="12 connected systems · 2 disconnected" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {integrations.map((int) => (
        <Card key={int.name} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white ${int.status === "connected" ? "bg-[#2C4A7C]" : int.status === "pending" ? "bg-[#C9A227]" : "bg-[#5F6B73]"}`}>
              {int.icon}
            </div>
            <span className={`w-2 h-2 rounded-full mt-1 ${int.status === "connected" ? "bg-emerald-500" : int.status === "pending" ? "bg-amber-500" : "bg-gray-300"}`} />
          </div>
          <div className="font-semibold text-sm text-[#0F1117] mb-0.5">{int.name}</div>
          <div className="text-[11px] text-[#5F6B73]">{int.category}</div>
          <div className="text-[10px] font-mono text-[#5F6B73] mt-2">
            {int.status === "connected" ? `Synced ${int.lastSync}` : int.status === "pending" ? "Setup required" : "Disconnected"}
          </div>
        </Card>
      ))}
    </div>
  </div>
);

export default IntegrationsSection;
