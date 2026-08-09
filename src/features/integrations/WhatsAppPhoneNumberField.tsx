import { useState } from "react";
import { InlineToast } from "../../components/forms/InlineToast";

// MC-3 (2026-08-02): the tenant-side half of WhatsApp webhook attribution -- Meta's webhook
// subscription is app-level, not per-tenant, so the webhook receiver resolves which organization an
// inbound event belongs to by matching this registered phone_number_id. See
// src/repositories/whatsappEventsRepository.ts's findWhatsAppConnectionByPhoneNumberId.
// A-109 (2026-08-09): moved here verbatim from src/features/settings/SettingsSection.tsx's now-removed
// Integrations tab -- this is the one piece of that tab's functionality genuinely not duplicated on
// this page before the tab was removed.
export function WhatsAppPhoneNumberField() {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!value.trim()) return;
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/whatsapp/settings/phone-number", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wabaPhoneNumberId: value.trim() }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        setStatus({ tone: "error", message: payload.error ?? "Unable to save phone number." });
        return;
      }
      setStatus({ tone: "success", message: "Phone number registered -- live WhatsApp events for this number will now attribute to your organization." });
    } catch {
      setStatus({ tone: "error", message: "Unable to reach the server. Try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-3 rounded-lg border border-[rgba(0,0,0,0.08)] p-2.5">
      <label htmlFor="whatsapp-phone-number-id" className="text-[11px] font-semibold text-[#0F1117]">WhatsApp phone number ID (Meta phone_number_id)</label>
      <p className="mt-0.5 text-[10px] leading-relaxed text-[#5F6B73]">Required for live message/status pop-ups -- find this in Meta Business Suite under your WABA&apos;s phone number settings.</p>
      <div className="mt-2 flex gap-2">
        <input
          id="whatsapp-phone-number-id"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="e.g. 109876543210987"
          className="flex-1 rounded-lg border border-[rgba(0,0,0,0.12)] px-2.5 py-1.5 text-xs"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !value.trim()}
          className="rounded-lg bg-[#8B1E2D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      {status && <div className="mt-2"><InlineToast tone={status.tone} message={status.message} /></div>}
    </div>
  );
}
