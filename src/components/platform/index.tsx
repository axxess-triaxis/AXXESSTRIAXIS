import type { ReactNode } from "react";
import { CommandSearchPlaceholder, DataStateBadge, SectionCard, TenantScopeBadge } from "../enterprise";

export function PlatformStatePanel({ children }: { children?: ReactNode }) {
  return (
    <SectionCard title="Platform state" description="Runtime labels keep live, demo, provider-gated, and empty states visible without exposing backend details.">
      <div className="flex flex-wrap gap-2">
        <TenantScopeBadge />
        <DataStateBadge state="Demo" />
        <DataStateBadge state="Live" />
        <DataStateBadge state="Provider-gated" />
      </div>
      {children && <div className="mt-3">{children}</div>}
    </SectionCard>
  );
}

export function PlatformCommandSearch() {
  return <CommandSearchPlaceholder />;
}
