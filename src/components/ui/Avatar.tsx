type AvatarProps = {
  initials: string;
  size?: "sm" | "md" | "lg";
  color?: string;
};

export function Avatar({ initials, size = "sm", color }: AvatarProps) {
  const colors = ["bg-[#8B1E2D]", "bg-[#2C4A7C]", "bg-[#1A6B4A]", "bg-[#5F3080]", "bg-[#5F6B73]"];
  const colorClass = color || colors[initials.charCodeAt(0) % colors.length];
  const sizeClass = size === "lg" ? "w-10 h-10 text-sm" : size === "md" ? "w-8 h-8 text-xs" : "w-7 h-7 text-[11px]";

  return (
    <div className={sizeClass + " " + colorClass + " rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"}>
      {initials}
    </div>
  );
}
