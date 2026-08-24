"use client";

import { useState } from "react";

type AvatarProps = {
  initials: string;
  // MN-8 (2026-08-24): resolved public URL (see buildPublicAvatarUrl in
  // src/services/storage/profileMediaStorage.ts), not a raw storage path. Optional and additive --
  // every existing call site that doesn't pass this keeps rendering the initials div unchanged.
  imageUrl?: string;
  size?: "sm" | "md" | "lg";
  color?: string;
};

export function Avatar({ initials, imageUrl, size = "sm", color }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const colors = ["bg-[#8B1E2D]", "bg-[#2C4A7C]", "bg-[#1A6B4A]", "bg-[#5F3080]", "bg-[#5F6B73]"];
  const colorClass = color || colors[initials.charCodeAt(0) % colors.length];
  const sizeClass = size === "lg" ? "w-10 h-10 text-sm" : size === "md" ? "w-8 h-8 text-xs" : "w-7 h-7 text-[11px]";

  if (imageUrl && !failed) {
    return (
      // avatarPath resolves to a Supabase Storage public URL (external host), not a local/
      // optimizable asset next/image expects.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={initials}
        onError={() => setFailed(true)}
        className={sizeClass + " rounded-full object-cover flex-shrink-0"}
      />
    );
  }

  return (
    <div className={sizeClass + " " + colorClass + " rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"}>
      {initials}
    </div>
  );
}
