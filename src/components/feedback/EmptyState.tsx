import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: ReactNode;
  title?: string;
  message: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="text-center text-[#5F6B73]">
      {icon && <div className="mx-auto mb-3 flex justify-center opacity-40">{icon}</div>}
      {title && <h3 className="text-sm font-semibold text-[#0F1117] mb-1">{title}</h3>}
      <p className="text-sm">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
