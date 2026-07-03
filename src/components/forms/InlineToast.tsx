import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type InlineToastProps = {
  tone: "success" | "error" | "info";
  message: string;
};

export function InlineToast({ tone, message }: InlineToastProps) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? AlertCircle : Info;
  const style = tone === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${style}`} role={tone === "error" ? "alert" : "status"}>
      <Icon size={14} className="mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
