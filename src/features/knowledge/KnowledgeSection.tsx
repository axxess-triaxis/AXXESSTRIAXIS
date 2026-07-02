import { useState } from "react";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Card } from "../../components/ui/Card";
import {
  CalendarDays,
  FileText,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

export const KnowledgeSection = () => {
  const [query, setQuery] = useState("");

  return (
    <div>
      <SectionHeader title="Institutional Knowledge" subtitle="Semantic search across 12,847 documents, meetings, and decisions" />
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 flex items-center gap-3 bg-white border border-[rgba(0,0,0,0.1)] rounded-xl px-4 py-3 shadow-sm focus-within:border-[#8B1E2D]/40 transition-colors">
          <Search size={16} className="text-[#5F6B73]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all projects, people, decisions, and documents…"
            className="flex-1 bg-transparent text-sm text-[#0F1117] placeholder:text-[#5F6B73] outline-none"
          />
          <span className="text-xs font-mono text-[#5F6B73] bg-[#F2F3F5] px-2 py-1 rounded">⌘K</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-[#0F1117] mb-4">Knowledge Graph — Portfolio Connections</h3>
            <svg viewBox="0 0 500 260" className="w-full">
              <defs>
                <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#C9A227" opacity="0.5" />
                </marker>
              </defs>
              {/* Edges */}
              {[
                [130, 130, 250, 90], [130, 130, 250, 170], [250, 90, 370, 70],
                [250, 90, 370, 130], [250, 170, 370, 130], [250, 170, 370, 200],
                [130, 130, 100, 60], [130, 130, 80, 190],
              ].map(([x1, y1, x2, y2], i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C9A227" strokeWidth="1" strokeOpacity="0.3" markerEnd="url(#arrow)" />
              ))}
              {/* Nodes */}
              {[
                { x: 130, y: 130, r: 28, fill: "#8B1E2D", label: "Digital ID", sub: "Project" },
                { x: 250, y: 90, r: 20, fill: "#2C4A7C", label: "Minister\nOkonkwo", sub: "Person" },
                { x: 250, y: 170, r: 20, fill: "#5F6B73", label: "Ethics\nReview", sub: "Decision" },
                { x: 370, y: 70, r: 16, fill: "#1A6B4A", label: "Arch\nRecord", sub: "Document" },
                { x: 370, y: 130, r: 16, fill: "#1A6B4A", label: "Risk\nRegister", sub: "Document" },
                { x: 370, y: 200, r: 16, fill: "#2C4A7C", label: "R. Anand", sub: "Person" },
                { x: 100, y: 60, r: 14, fill: "#5F3080", label: "Nov 8\nMeeting", sub: "Meeting" },
                { x: 80, y: 190, r: 14, fill: "#C9A227", label: "Budget\nQ3", sub: "Finance" },
              ].map((node, i) => (
                <g key={i} className="cursor-pointer">
                  <circle cx={node.x} cy={node.y} r={node.r} fill={node.fill} opacity="0.85" />
                  <text x={node.x} y={node.y + 4} textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">
                    {node.label.split("\n").map((line, li) => (
                      <tspan key={li} x={node.x} dy={li === 0 ? (node.label.includes("\n") ? -4 : 0) : 10}>{line}</tspan>
                    ))}
                  </text>
                </g>
              ))}
            </svg>
          </Card>
          <Card className="p-4">
            <h3 className="text-xs font-semibold text-[#0F1117] uppercase tracking-wider mb-3">Suggested Queries</h3>
            <div className="flex flex-wrap gap-2">
              {[
                "What decisions were made in the last 30 days?",
                "Show all risks above threshold in Q4",
                "Who approved the Digital ID architecture change?",
                "Summarize Healthcare MOU status",
                "Find all documents related to Border Security ethics",
                "What is the current budget variance across programs?",
              ].map((q) => (
                <button key={q} onClick={() => setQuery(q)} className="text-xs text-[#5F6B73] border border-[rgba(0,0,0,0.1)] px-3 py-1.5 rounded-lg hover:border-[#8B1E2D] hover:text-[#8B1E2D] transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          {[
            { label: "Documents Indexed", value: "8,247", icon: FileText },
            { label: "Meeting Transcripts", value: "1,431", icon: CalendarDays },
            { label: "Decision Records", value: "643", icon: ShieldCheck },
            { label: "People & Orgs", value: "2,526", icon: Users },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-[#8B1E2D]/8 rounded-lg flex items-center justify-center">
                <stat.icon size={16} className="text-[#8B1E2D]" />
              </div>
              <div>
                <div className="text-xl font-bold text-[#0F1117] tracking-tight">{stat.value}</div>
                <div className="text-xs text-[#5F6B73]">{stat.label}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeSection;
