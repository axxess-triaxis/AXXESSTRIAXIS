import type { ButtonHTMLAttributes, ReactNode } from "react";

type MobileActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary";
};

// MN-1 (2026-08-23): the roadmap checklist's "large tap targets" requirement, made concrete --
// 44px is Apple's Human Interface Guidelines minimum (Android's Material spec uses 48dp, so 44px
// satisfies both). min-h/min-w rather than a fixed height so a button with longer label text can
// still grow past the floor instead of clipping.
export function MobileActionButton({ children, variant = "primary", className, ...rest }: MobileActionButtonProps) {
  const base = "inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors";
  const variantClass = variant === "primary"
    ? "bg-[#8B1E2D] text-white hover:bg-[#7a1a27]"
    : "border border-[rgba(15,17,23,0.12)] bg-white text-[#0F1117] hover:bg-[#F2F3F5]";

  return (
    <button className={`${base} ${variantClass} ${className ?? ""}`} {...rest}>
      {children}
    </button>
  );
}
