import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-white border border-[rgba(0,0,0,0.07)] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_16px_rgba(0,0,0,0.03)] ${className}`}>
      {children}
    </div>
  );
}
