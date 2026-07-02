import { useState } from "react";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { applicationServices } from "../../providers/serviceProvider";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  CheckSquare,
  FileText,
  FolderKanban,
  Paperclip,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
} from "lucide-react";

const aiMessages = applicationServices.institutionalRepository.getAiMessages();

export const AIWorkspaceSection = () => {
  const [input, setInput] = useState("");
  const [approved, setApproved] = useState(false);

  return (
    <div className="h-full flex flex-col">
      <SectionHeader
        title="AI Workspace"
        subtitle="Contextual institutional intelligence · Human-in-the-Loop execution"
      />
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Conversation panel */}
        <div className="lg:col-span-2 flex flex-col">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(0,0,0,0.06)]">
              <div className="w-8 h-8 bg-[#8B1E2D] rounded-lg flex items-center justify-center">
                <Sparkles size={14} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#0F1117]">AXXESS Intelligence Engine</div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#5F6B73]">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Active · Analyzing 1,247 documents · Contextual memory enabled
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {["Document Reasoning", "Multilingual", "Workflow Gen"].map((cap) => (
                  <span key={cap} className="text-[10px] font-medium bg-[#8B1E2D]/8 text-[#8B1E2D] px-2 py-0.5 rounded-full border border-[#8B1E2D]/15">
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:hidden">
              {aiMessages.map((msg, i) => (
                <div key={i}>
                  {msg.role === "user" ? (
                    <div className="flex items-start gap-3 justify-end">
                      <div className="bg-[#0F1117] text-white text-sm rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] leading-relaxed">
                        {msg.content}
                      </div>
                      <Avatar initials="RA" size="sm" color="bg-[#2C4A7C]" />
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 bg-[#8B1E2D] rounded-full flex items-center justify-center flex-shrink-0">
                        <Sparkles size={12} className="text-white" />
                      </div>
                      <div className="flex-1 max-w-[85%]">
                        {msg.toolUsed && (
                          <div className="flex items-center gap-1.5 text-[10px] text-[#5F6B73] mb-2 font-mono">
                            <Terminal size={10} />
                            {msg.toolUsed}
                          </div>
                        )}
                        <div className="bg-[#F8F9FA] border border-[rgba(0,0,0,0.06)] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-[#0F1117] leading-relaxed whitespace-pre-line">
                          {msg.content}
                        </div>
                        {msg.requiresApproval && !approved && (
                          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield size={13} className="text-amber-600" />
                              <span className="text-xs font-semibold text-amber-700">Human-in-the-Loop Review Required</span>
                            </div>
                            <div className="bg-white border border-amber-100 rounded-lg p-2.5 mb-3 text-[11px] text-[#5F6B73] font-mono leading-relaxed">
                              {msg.draftPreview}
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setApproved(true)} className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5">
                                <Check size={11} /> Approve & Send
                              </button>
                              <button className="text-xs bg-white border border-[rgba(0,0,0,0.1)] text-[#0F1117] px-3 py-1.5 rounded-lg hover:bg-[#F2F3F5] transition-colors">
                                Edit Draft
                              </button>
                              <button className="text-xs text-red-600 hover:text-red-700 px-2 py-1.5">
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                        {msg.requiresApproval && approved && (
                          <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span className="text-xs text-emerald-700 font-medium">Briefing note sent to Minister Okonkwo&apos;s office · Audit logged</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {["Generate project update", "Summarize weekly approvals", "Draft stakeholder briefing", "Identify schedule risks"].map((s) => (
                  <button key={s} className="text-[11px] text-[#5F6B73] border border-[rgba(0,0,0,0.1)] px-2.5 py-1 rounded-full hover:border-[#8B1E2D] hover:text-[#8B1E2D] transition-colors">
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 bg-[#F2F3F5] rounded-xl px-3 py-2.5 border border-transparent focus-within:border-[#8B1E2D]/30 focus-within:bg-white transition-all">
                <Paperclip size={14} className="text-[#5F6B73]" />
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask AXXESS anything about your portfolio, programs, or decisions…"
                  className="flex-1 bg-transparent text-sm text-[#0F1117] placeholder:text-[#5F6B73] outline-none"
                />
                <button className="w-7 h-7 bg-[#8B1E2D] rounded-lg flex items-center justify-center hover:bg-[#7a1a27] transition-colors">
                  <Send size={12} className="text-white" />
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Context panel */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-xs font-semibold text-[#0F1117] uppercase tracking-wider mb-3">Context Window</h3>
            <div className="space-y-2">
              {[
                { type: "Project", name: "Border Security AI Platform", icon: FolderKanban },
                { type: "Document", name: "Ethics Review Board Submission", icon: FileText },
                { type: "Meeting", name: "Ethics Board Q&A — Nov 11", icon: CalendarDays },
                { type: "Stakeholder", name: "Dr. Sarah Osei, Ethics Board", icon: Users },
              ].map((ctx, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-[#F8F9FA] hover:bg-[#F2F3F5] cursor-pointer transition-colors">
                  <ctx.icon size={13} className="text-[#8B1E2D]" />
                  <div>
                    <div className="text-[10px] font-mono text-[#5F6B73]">{ctx.type}</div>
                    <div className="text-xs font-medium text-[#0F1117] leading-tight">{ctx.name}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-3 w-full text-xs text-[#5F6B73] border border-dashed border-[rgba(0,0,0,0.12)] rounded-lg py-2 hover:border-[#8B1E2D] hover:text-[#8B1E2D] transition-colors">
              + Add context
            </button>
          </Card>

          <Card className="p-4">
            <h3 className="text-xs font-semibold text-[#0F1117] uppercase tracking-wider mb-3">Session Actions</h3>
            <div className="space-y-1.5">
              {[
                { label: "Generate Task List", icon: CheckSquare, status: "ready" },
                { label: "Schedule Meeting", icon: CalendarDays, status: "ready" },
                { label: "Create Approval Request", icon: ShieldCheck, status: "pending-review" },
                { label: "Update Risk Register", icon: AlertTriangle, status: "ready" },
              ].map((action, i) => (
                <button key={i} className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#F2F3F5] transition-colors group">
                  <div className="flex items-center gap-2">
                    <action.icon size={13} className="text-[#5F6B73] group-hover:text-[#8B1E2D] transition-colors" />
                    <span className="text-xs text-[#0F1117]">{action.label}</span>
                  </div>
                  {action.status === "pending-review" && <span className="text-[10px] text-amber-600 font-medium">Review req.</span>}
                  {action.status === "ready" && <ArrowUpRight size={11} className="text-[#5F6B73] opacity-0 group-hover:opacity-100 transition-opacity" />}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-xs font-semibold text-[#0F1117] uppercase tracking-wider mb-2">AI Audit Trail</h3>
            <div className="space-y-2">
              {[
                { time: "08:43", action: "Document analysis: 3 files", user: "Auto" },
                { time: "08:41", action: "Risk register queried", user: "R. Anand" },
                { time: "07:55", action: "Meeting summary generated", user: "Auto" },
              ].map((log, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-[#5F6B73]">
                  <span className="font-mono">{log.time}</span>
                  <span className="flex-1 truncate">{log.action}</span>
                  <span className="font-medium text-[#0F1117]">{log.user}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIWorkspaceSection;
