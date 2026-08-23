import { Avatar } from "../../components/ui/Avatar";
import { MobileSafeArea } from "./MobileSafeArea";

type MobileHeaderProps = {
  title: string;
  avatarInitials?: string;
  onAvatarPress: () => void;
};

// MN-1 (2026-08-23): deliberately not a port of TopBar.tsx -- no portfolio search, no notification
// bell/dropdown, no "Ctrl K" hint (a keyboard shortcut is meaningless on a touchscreen). Roadmap
// checklist: "no marketing hero layout," "restrained enterprise UI." Just the current section's
// name and a single real, working touch target (profile/settings) -- everything else in the
// desktop TopBar is either not applicable on mobile or explicitly out of MN-1 scope.
export function MobileHeader({ title, avatarInitials, onAvatarPress }: MobileHeaderProps) {
  return (
    <MobileSafeArea edge="top" className="flex-shrink-0 border-b border-[rgba(0,0,0,0.06)] bg-white">
      <div className="flex h-14 items-center justify-between px-4">
        <span className="text-base font-semibold text-[#0F1117]">{title}</span>
        <button
          onClick={onAvatarPress}
          aria-label="Open profile and settings"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center"
        >
          <Avatar initials={avatarInitials ?? "AU"} size="sm" color="bg-[#8B1E2D]" />
        </button>
      </div>
    </MobileSafeArea>
  );
}
