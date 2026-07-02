type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<string, string> = {
    "In Progress": "bg-blue-50 text-blue-700",
    "At Risk": "bg-red-50 text-red-700",
    Review: "bg-purple-50 text-purple-700",
    Planning: "bg-gray-100 text-gray-600",
    Complete: "bg-emerald-50 text-emerald-700",
    Completed: "bg-emerald-50 text-emerald-700",
    Upcoming: "bg-blue-50 text-blue-700",
    Pending: "bg-amber-50 text-amber-700",
    "Under Review": "bg-purple-50 text-purple-700",
  };

  return (
    <span className={"text-[11px] font-semibold px-2 py-0.5 rounded-full " + (styles[status] || "bg-gray-100 text-gray-600")}>
      {status}
    </span>
  );
}
