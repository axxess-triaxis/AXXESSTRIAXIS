import { mobileMoreTabIcon as MoreIcon, mobilePrimaryTabs, type MobileFeatureId } from "./mobileFeatureRegistry";
import { MobileSafeArea } from "./MobileSafeArea";

type MobileTabBarProps = {
  active: MobileFeatureId | "more";
  onSelect: (id: MobileFeatureId | "more") => void;
};

// MN-1 (2026-08-23): the actual fix for the tester-reported bug -- this bottom bar, not a
// persistent side rail, is X0 Mobile's only primary navigation surface. mobilePrimaryTabs is
// exactly 4 entries (Home, Tasks, Approvals, Ask AI) plus this component's own "More" slot = 5,
// matching the bottom-tab-bar pattern the roadmap's research cites.
export function MobileTabBar({ active, onSelect }: MobileTabBarProps) {
  return (
    <MobileSafeArea edge="bottom" className="flex-shrink-0 border-t border-[rgba(0,0,0,0.06)] bg-white">
      <nav aria-label="Primary navigation" className="flex items-stretch justify-around">
        {mobilePrimaryTabs.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-[52px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium ${isActive ? "text-[#8B1E2D]" : "text-[#5F6B73]"}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => onSelect("more")}
          aria-current={active === "more" ? "page" : undefined}
          className={`flex min-h-[52px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium ${active === "more" ? "text-[#8B1E2D]" : "text-[#5F6B73]"}`}
        >
          <MoreIcon size={20} />
          <span>More</span>
        </button>
      </nav>
    </MobileSafeArea>
  );
}
