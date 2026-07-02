import { SectionHeader } from "../../components/layout/SectionHeader";
import { Card } from "../../components/ui/Card";
import { applicationServices } from "../../providers/serviceProvider";
import { Filter, Plus, Sparkles } from "lucide-react";

const documents = applicationServices.institutionalRepository.getDocuments();

export const DocumentsSection = () => (
  <div>
    <SectionHeader
      title="Documents & File Intelligence"
      subtitle="AI-powered document analysis across all programs"
      action={
        <div className="flex items-center gap-2">
          <button className="text-xs border border-[rgba(0,0,0,0.1)] text-[#5F6B73] px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-[#F2F3F5]">
            <Filter size={12} /> Filter
          </button>
          <button className="text-xs bg-[#8B1E2D] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-[#7a1a27]">
            <Plus size={12} /> Upload
          </button>
        </div>
      }
    />
    <div className="space-y-3">
      {documents.map((doc) => (
        <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${doc.type === "PDF" ? "bg-red-50 text-red-700" : doc.type === "XLSX" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
              {doc.type}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="text-sm font-semibold text-[#0F1117] leading-snug">{doc.name}</h4>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {doc.tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-medium text-[#5F6B73] bg-[#F2F3F5] px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono text-[#8B1E2D] bg-[#8B1E2D]/8 px-1.5 py-0.5 rounded">{doc.project}</span>
                <span className="text-[11px] text-[#5F6B73]">{doc.size}</span>
                <span className="text-[11px] text-[#5F6B73]">·</span>
                <span className="text-[11px] text-[#5F6B73]">Modified {doc.modified}</span>
              </div>
              <div className="flex items-start gap-1.5 bg-[#F8F9FA] rounded-lg px-3 py-2">
                <Sparkles size={11} className="text-[#8B1E2D] mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-[#5F6B73] leading-relaxed">{doc.aiSummary}</p>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  </div>
);

export default DocumentsSection;
