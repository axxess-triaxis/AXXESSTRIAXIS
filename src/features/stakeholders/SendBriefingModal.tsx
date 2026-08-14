"use client";

import { useState } from "react";

// Same overlay/card chrome as ExportReportModal.tsx / the Documents Upload modal. This does NOT
// claim a real email send -- no confirmed, live-tested outbound email integration is wired to this
// flow (see StakeholdersSection.tsx's handleSendBriefing). "Save" records the briefing as a real
// stakeholder note so the content isn't lost, without fabricating a delivery confirmation.
export type SendBriefingModalProps = {
  open: boolean;
  stakeholderName: string;
  defaultBody: string;
  onSave: (fields: { to: string; cc: string; bcc: string; subject: string; body: string }) => void;
  onCancel: () => void;
};

export function SendBriefingModal({ open, stakeholderName, defaultBody, onSave, onCancel }: SendBriefingModalProps) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(`Briefing: ${stakeholderName}`);
  const [body, setBody] = useState(defaultBody);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/30 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="send-briefing-title">
      <div className="w-full max-w-lg rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-5 shadow-xl">
        <h2 id="send-briefing-title" className="text-sm font-semibold text-[#0F1117]">Send briefing</h2>
        <p className="mt-1 text-xs leading-relaxed text-[#5F6B73]">
          AXXESS does not have a confirmed email-delivery integration wired to this flow yet -- this
          briefing is saved as a stakeholder note you can copy into your own email client.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#5F6B73]">To</span>
            <input value={to} onChange={(event) => setTo(event.target.value)} placeholder="name@example.com" className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none focus:border-[#8B1E2D]" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#5F6B73]">CC</span>
            <input value={cc} onChange={(event) => setCc(event.target.value)} className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none focus:border-[#8B1E2D]" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#5F6B73]">BCC</span>
            <input value={bcc} onChange={(event) => setBcc(event.target.value)} className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none focus:border-[#8B1E2D]" />
          </label>
        </div>
        <label className="mt-3 block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#5F6B73]">Subject</span>
          <input value={subject} onChange={(event) => setSubject(event.target.value)} className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none focus:border-[#8B1E2D]" />
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#5F6B73]">Body</span>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={6} className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-xs outline-none focus:border-[#8B1E2D]" />
        </label>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-1.5 text-xs font-semibold text-[#5F6B73] hover:bg-[#F2F3F5]">Cancel</button>
          <button type="button" onClick={() => onSave({ to, cc, bcc, subject, body })} className="rounded-lg bg-[#8B1E2D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#7a1a27]">Save briefing</button>
        </div>
      </div>
    </div>
  );
}
