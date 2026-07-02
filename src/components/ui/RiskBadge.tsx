type RiskBadgeProps = {
  level: string;
};

export function RiskBadge({ level }: RiskBadgeProps) {
  const styles: Record<string, string> = {
    high: "bg-red-50 text-red-700 border border-red-200",
    medium: "bg-amber-50 text-amber-700 border border-amber-200",
    low: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    urgent: "bg-red-100 text-red-800 border border-red-300",
  };

  return (
    <span className={"text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full font-mono " + (styles[level] || styles.medium)}>
      {level}
    </span>
  );
}
