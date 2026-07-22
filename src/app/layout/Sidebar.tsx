import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import { Avatar } from "../../components/ui/Avatar";
import { isDemoModeEnabled } from "../../demo/demoMode";
import { getVisibleNavGroups } from "../../security/rbac";
import { navGroups, type NavSection } from "../navigation";

type SidebarProps = {
  active: NavSection;
  sidebarOpen: boolean;
  onSelectSection: (section: NavSection) => void;
  onToggleSidebar: () => void;
};

export function Sidebar({ active, sidebarOpen, onSelectSection, onToggleSidebar }: SidebarProps) {
  const { session } = useAuth();
  const user = session.user;
  const visibleNavGroups = user ? getVisibleNavGroups(navGroups, user) : [];
  const demoMode = isDemoModeEnabled();

  return (
    <aside
      aria-label="Primary navigation"
      className={`flex flex-col flex-shrink-0 transition-all duration-300 overflow-hidden ${sidebarOpen ? "w-[232px]" : "w-[56px]"}`}
      style={{ backgroundColor: "#0F1117", borderRight: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="flex items-center gap-3 px-3 py-4 border-b border-[rgba(255,255,255,0.06)]">
        <div className="w-8 h-8 bg-[#8B1E2D] rounded-lg flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="6" height="6" rx="1" fill="white" opacity="0.9" />
            <rect x="9" y="1" width="6" height="6" rx="1" fill="white" opacity="0.6" />
            <rect x="1" y="9" width="6" height="6" rx="1" fill="white" opacity="0.6" />
            <rect x="9" y="9" width="6" height="6" rx="1" fill="#C9A227" opacity="0.9" />
          </svg>
        </div>
        {sidebarOpen && (
          <div className="min-w-0">
            <div className="text-sm font-bold text-white tracking-wide leading-tight">AXXESS</div>
            <div className="text-[10px] text-[rgba(255,255,255,0.4)] tracking-widest uppercase">by Triaxis</div>
          </div>
        )}
        <button
          onClick={onToggleSidebar}
          className="ml-auto text-[rgba(255,255,255,0.3)] hover:text-white transition-colors flex-shrink-0"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 [&::-webkit-scrollbar]:hidden">
        {visibleNavGroups.map((group) => (
          <div key={group.label} className="mb-1">
            {sidebarOpen && (
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[rgba(255,255,255,0.28)]">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectSection(item.id)}
                  title={!sidebarOpen ? item.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 mx-0 relative transition-colors group ${isActive ? "bg-[rgba(139,30,45,0.18)] text-white" : "text-[rgba(255,255,255,0.55)] hover:text-[rgba(255,255,255,0.85)] hover:bg-[rgba(255,255,255,0.04)]"}`}
                >
                  {isActive && <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#8B1E2D] rounded-r-full" />}
                  <item.icon size={15} className={`flex-shrink-0 ${isActive ? "text-[#C9A227]" : ""}`} />
                  {sidebarOpen && (
                    <>
                      <span className="text-xs font-medium flex-1 text-left">{item.label}</span>
                      {"badge" in item && item.badge && (item.badgeKind !== "count" || demoMode) && (
                        <span className="bg-[#8B1E2D] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-[rgba(255,255,255,0.06)] px-3 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar initials={user?.avatarInitials ?? "AU"} size="sm" color="bg-[#8B1E2D]" />
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{user?.displayName ?? "AXXESS User"}</div>
              <div className="text-[10px] text-[rgba(255,255,255,0.4)] truncate">{user?.role ?? "Guest"}</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
