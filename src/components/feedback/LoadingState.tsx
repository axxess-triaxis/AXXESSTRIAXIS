type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Loading workspace" }: LoadingStateProps) {
  return (
    <div className="flex min-h-[240px] items-center justify-center">
      <div className="flex items-center gap-3 rounded-xl border border-[rgba(0,0,0,0.07)] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#8B1E2D]" />
        <span className="text-xs font-medium text-[#5F6B73]">{label}</span>
      </div>
    </div>
  );
}
