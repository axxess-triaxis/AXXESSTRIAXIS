import { AlertTriangle, Bell, ChevronDown, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Avatar } from "../../components/ui/Avatar";

type TopBarProps = {
  activeLabel: string;
  notifOpen: boolean;
  onToggleNotifications: () => void;
};

const notificationItems = [
  { icon: AlertTriangle, msg: "Ethics Review escalation requires your attention", time: "5m", color: "text-red-500" },
  { icon: ShieldCheck, msg: "Approval: Border Security procurement is overdue", time: "1h", color: "text-amber-500" },
  { icon: Sparkles, msg: "AI completed risk analysis for Q3 portfolio review", time: "2h", color: "text-[#8B1E2D]" },
  { icon: Bell, msg: "Deputy Minister Thornton requested budget briefing", time: "3h", color: "text-blue-500" },
];

export function TopBar({ activeLabel, notifOpen, onToggleNotifications }: TopBarProps) {
  return (
    <header className="flex items-center gap-4 px-5 py-3 border-b border-[rgba(0,0,0,0.07)] bg-white flex-shrink-0">
      <div className="flex items-center gap-2 text-[#5F6B73] text-xs">
        <span className="font-medium text-[#0F1117]">{activeLabel}</span>
      </div>

      <div className="flex-1 max-w-md ml-4">
        <div className="flex items-center gap-2 bg-[#F2F3F5] rounded-lg px-3 py-1.5 border border-transparent focus-within:border-[#8B1E2D]/30 focus-within:bg-white transition-all">
          <Search size={13} className="text-[#5F6B73]" />
          <input placeholder="Search portfolio…" className="flex-1 bg-transparent text-xs text-[#0F1117] placeholder:text-[#5F6B73] outline-none" />
          <span className="text-[10px] font-mono text-[#5F6B73] bg-white border border-[rgba(0,0,0,0.1)] px-1.5 py-0.5 rounded">⌘K</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          AI Ready
        </div>

        <div className="relative">
          <button
            onClick={onToggleNotifications}
            className="relative w-8 h-8 flex items-center justify-center text-[#5F6B73] hover:text-[#0F1117] hover:bg-[#F2F3F5] rounded-lg transition-colors"
            aria-label="Open notifications"
          >
            <Bell size={16} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#8B1E2D] rounded-full border-2 border-white" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[rgba(0,0,0,0.08)] rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
                <span className="text-sm font-semibold text-[#0F1117]">Notifications</span>
                <span className="text-[11px] text-[#8B1E2D] font-medium">8 unread</span>
              </div>
              {notificationItems.map((n, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-[#F8F9FA] cursor-pointer border-b border-[rgba(0,0,0,0.04)] last:border-0">
                  <n.icon size={14} className={`${n.color} mt-0.5 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#0F1117] leading-snug">{n.msg}</p>
                    <span className="text-[10px] font-mono text-[#5F6B73]">{n.time} ago</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 cursor-pointer hover:bg-[#F2F3F5] rounded-lg px-2 py-1 transition-colors">
          <Avatar initials="RA" color="bg-[#8B1E2D]" />
          <ChevronDown size={12} className="text-[#5F6B73]" />
        </div>
      </div>
    </header>
  );
}
