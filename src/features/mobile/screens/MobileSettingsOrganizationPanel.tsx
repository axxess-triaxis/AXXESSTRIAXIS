"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";
import { applicationServices } from "../../../providers/serviceProvider";
import { useMobileTenantScope } from "../useMobileTenantScope";

// MN-7 (2026-08-24): native port of desktop SettingsSection.tsx's OrganizationPanel, read-only
// stat tiles instead of a desktop Card grid. Deliberately does NOT reproduce desktop's demo-mode
// branch (which renders demoDatasetSummary) -- the roadmap's own Mobile Surface Contract requires
// "Tests prove Demo data is not exposed" (MOBILE_NATIVE_CAPACITOR_RESEARCH_AND_ROADMAP_2026_08_23.md
// line 183), and demo/demoDataset is on mobileIsolation.test.ts's forbidden-import list. This panel
// always renders the live-organization query path, same as every other native mobile screen.
export function MobileSettingsOrganizationPanel() {
  const { session } = useAuth();
  const scope = useMobileTenantScope();
  const user = session.user;
  const [liveOrg, setLiveOrg] = useState<{ name: string; projects: number; documents: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scope || !user?.organizationId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      applicationServices.organizationsRepository.getById(scope, user.organizationId),
      applicationServices.projectsRepository.list(scope, { pageSize: 100 }),
      applicationServices.documentsRepository.list(scope, { pageSize: 100 }),
    ])
      .then(([organization, projects, documents]) => {
        if (cancelled) return;
        setLiveOrg({ name: organization?.name ?? "", projects: projects.length, documents: documents.length });
      })
      .catch(() => {
        if (!cancelled) setLiveOrg(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, user?.organizationId]);

  const metrics = [
    { label: "Organization", value: loading ? "Loading…" : liveOrg?.name || "Not set up yet" },
    { label: "Mode", value: "Production" },
    { label: "Projects", value: loading ? "…" : (liveOrg?.projects ?? 0).toLocaleString() },
    { label: "Documents", value: loading ? "…" : (liveOrg?.documents ?? 0).toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <div className="flex items-center gap-2 px-1">
        <Building2 size={15} className="text-[#8B1E2D]" />
        <h2 className="text-sm font-semibold text-[#0F1117]">Organization</h2>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex min-h-[76px] flex-col items-start gap-1 rounded-xl border border-[rgba(15,17,23,0.08)] bg-white px-3.5 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#5F6B73]">{metric.label}</span>
            <span className="truncate text-sm font-semibold text-[#0F1117]">{metric.value}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[rgba(15,17,23,0.08)] bg-white px-3.5 py-3">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#5F6B73]">Organization ID</span>
        <span className="mt-1 block break-all font-mono text-xs text-[#0F1117]">{user?.organizationId}</span>
      </div>
    </div>
  );
}
