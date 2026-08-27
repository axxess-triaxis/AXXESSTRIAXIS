"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Plug } from "lucide-react";
import { useEffect, useState } from "react";
import { InlineToast } from "../../../components/forms/InlineToast";
import { liteConnectorLabels, liteConnectorProviderIds } from "../liteIntegrationsConfig";

type ConnectionState = Record<string, boolean>;

// Lite Settings real-modules pass (2026-08-27): a genuinely new, standalone Lite component --
// deliberately does NOT import IntegrationsSection.tsx, AgentConnectionsPanel, or pluginRegistry.ts
// (src/features/lite/liteIsolation.test.ts statically forbids all three). Reuses the existing
// OAuth engine as-is (/api/connectors/oauth/start, /status) for a hardcoded 12-provider subset --
// see liteIntegrationsConfig.ts for exactly which ones and why. No disconnect control: there is no
// disconnect/revoke route for OAuth connectors anywhere in this codebase yet, not even on X0 --
// Lite ships with the same connect-only limitation, not a new gap.
export function LiteIntegrationsSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connected, setConnected] = useState<ConnectionState>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; message: string } | null>(null);

  useEffect(() => {
    const provider = searchParams.get("provider");
    const status = searchParams.get("status");
    if (!provider || !status) return;
    const label = liteConnectorLabels[provider] ?? provider;
    if (status === "connected") setToast({ tone: "success", message: `${label} connected.` });
    else if (status === "not_configured") setToast({ tone: "info", message: `${label} connected, but isn't fully set up on this deployment yet.` });
    else setToast({ tone: "error", message: `Couldn't connect ${label}. Please try again.` });
    router.replace("/lite/settings/integrations");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const query = new URLSearchParams();
    for (const id of liteConnectorProviderIds) query.append("provider", id);
    fetch(`/api/connectors/status?${query.toString()}`, { credentials: "include" })
      .then((response) => response.json())
      .then((payload: { connections?: { providerId: string }[] }) => {
        const next: ConnectionState = {};
        for (const connection of payload.connections ?? []) next[connection.providerId] = true;
        setConnected(next);
      })
      .catch(() => setConnected({}))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <Link href="/lite/settings" className="flex items-center gap-1 text-xs font-semibold text-[#5F6B73] hover:text-[#0F1117]">
        <ChevronLeft size={14} /> Settings
      </Link>
      <div>
        <h1 className="text-sm font-semibold text-[#0F1117]">Integrations</h1>
        <p className="mt-0.5 text-xs text-[#5F6B73]">Connect the tools you already use.</p>
      </div>

      {toast && <InlineToast tone={toast.tone} message={toast.message} />}

      <div className="overflow-hidden rounded-xl border border-[rgba(0,0,0,0.06)] bg-white">
        {liteConnectorProviderIds.map((providerId) => (
          <div key={providerId} className="flex items-center justify-between border-b border-[rgba(0,0,0,0.04)] px-4 py-3 last:border-b-0">
            <div className="flex items-center gap-2.5">
              <Plug size={15} className="text-[#8B1E2D]" />
              <span className="text-xs font-semibold text-[#0F1117]">{liteConnectorLabels[providerId]}</span>
            </div>
            {loading ? (
              <span className="text-[10px] text-[#5F6B73]">...</span>
            ) : connected[providerId] ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">Connected</span>
            ) : (
              <a
                href={`/api/connectors/oauth/start?provider=${providerId}`}
                className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#0F1117] hover:bg-[#F8F9FA]"
              >
                Connect
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
