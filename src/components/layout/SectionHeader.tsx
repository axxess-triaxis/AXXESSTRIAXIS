import type { ReactNode } from "react";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-[#0F1117] tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-[#5F6B73] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
