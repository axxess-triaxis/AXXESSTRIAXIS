"use client";

import { useEffect, useState } from "react";
import { Save, Settings, Smartphone } from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";
import { InlineToast } from "../../../components/forms/InlineToast";
import { Avatar } from "../../../components/ui/Avatar";
import { useAnalytics } from "../../../services/analytics";
import { isAgenticGateEnabled, setAgenticGateEnabled } from "../../../services/agentic/agenticGateToggle";

const departmentOptions = [
  "Mission Secretariat",
  "Clinical Operations",
  "District Coordination",
  "Finance & Grants",
  "Procurement",
  "Monitoring & Evaluation",
  "Knowledge & Analytics",
  "Administration",
];

type Toast = { tone: "success" | "error" | "info"; message: string };

// MN-7 (2026-08-24): native port of desktop SettingsSection.tsx's ProfilePanel + LinkedPhoneSection
// + AgenticGateTogglePanel, combined into one drill-down panel (matches how they're all rendered
// together under `tab === "profile"` on desktop). Same updateProfile(form) call, same field shape,
// same /api/auth/phone/link/{start,verify} routes, same localStorage-backed agentic gate toggle --
// presentation-layer rebuild only, no backend logic changed. LinkedPhoneSection's OTP flow is
// ported near-verbatim (spacing/tap-targets restyled only, not redesigned) per the MN-7 plan.
export function MobileSettingsProfilePanel() {
  const { session, updateProfile } = useAuth();
  const analytics = useAnalytics();
  const user = session.user;
  const [toast, setToast] = useState<Toast | null>(null);
  const [form, setForm] = useState({
    displayName: user?.displayName ?? "",
    email: user?.email ?? "",
    avatarInitials: user?.avatarInitials ?? "",
    department: user?.department ?? "Mission Secretariat",
    title: user?.title ?? "",
    timezone: user?.timezone ?? "Asia/Kolkata",
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      displayName: user.displayName ?? "",
      email: user.email ?? "",
      avatarInitials: user.avatarInitials ?? "",
      department: user.department ?? "Mission Secretariat",
      title: user.title ?? "",
      timezone: user.timezone ?? "Asia/Kolkata",
    });
  }, [user]);

  if (!user) {
    return <div className="px-4 py-8 text-center text-sm text-[#5F6B73]">Sign in to manage your profile.</div>;
  }

  const saveProfile = async () => {
    try {
      await updateProfile(form);
      setToast({ tone: "success", message: "Profile updated." });
      analytics.trackEvent("profile_updated", { department: form.department }, {
        organization_id: user.organizationId,
        user_id: user.id,
        user_role: user.role,
        module_name: "settings",
        route: "/settings",
      });
    } catch {
      setToast({ tone: "error", message: "Profile could not be updated." });
    }
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {toast && <InlineToast tone={toast.tone} message={toast.message} />}

      <div className="flex items-center gap-3 rounded-xl border border-[rgba(15,17,23,0.08)] bg-white px-3.5 py-3">
        <Avatar initials={user.avatarInitials ?? "AR"} size="md" color="bg-[#8B1E2D]" />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-[#0F1117]">{user.displayName}</h2>
          <p className="truncate text-[11px] text-[#5F6B73]">{user.email}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 rounded-xl border border-[rgba(15,17,23,0.08)] bg-white px-3.5 py-3.5">
        <div className="mb-1 flex items-center gap-2">
          <Settings size={15} className="text-[#8B1E2D]" />
          <h3 className="text-sm font-semibold text-[#0F1117]">User Profile</h3>
        </div>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-[#5F6B73]">Display Name</span>
          <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="min-h-[44px] rounded-lg border border-[rgba(15,17,23,0.12)] px-3 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-[#5F6B73]">Email</span>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="min-h-[44px] rounded-lg border border-[rgba(15,17,23,0.12)] px-3 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-[#5F6B73]">Title</span>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="min-h-[44px] rounded-lg border border-[rgba(15,17,23,0.12)] px-3 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-[#5F6B73]">Avatar Initials</span>
          <input value={form.avatarInitials} onChange={(e) => setForm({ ...form, avatarInitials: e.target.value })} className="min-h-[44px] rounded-lg border border-[rgba(15,17,23,0.12)] px-3 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-[#5F6B73]">Department</span>
          <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="min-h-[44px] rounded-lg border border-[rgba(15,17,23,0.12)] px-3 text-sm">
            {departmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-[#5F6B73]">Timezone</span>
          <select value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="min-h-[44px] rounded-lg border border-[rgba(15,17,23,0.12)] px-3 text-sm">
            <option value="Asia/Kolkata">Asia/Kolkata</option>
            <option value="UTC">UTC</option>
          </select>
        </label>
        <button onClick={() => void saveProfile()} className="mt-1 flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#8B1E2D] px-3 text-xs font-semibold text-white hover:bg-[#7a1a27]">
          <Save size={13} /> Save Profile
        </button>
      </div>

      {session.source !== "mock-rbac" && <MobileLinkedPhoneSection currentPhone={user.phone} />}

      <MobileAgenticGateToggle />

      <div className="flex flex-col gap-2 rounded-xl border border-[rgba(15,17,23,0.08)] bg-white px-3.5 py-3 text-xs">
        <div className="flex items-center justify-between"><span className="text-[#5F6B73]">Role</span><span className="font-semibold text-[#0F1117]">{user.role}</span></div>
        <div className="flex items-center justify-between"><span className="text-[#5F6B73]">Department</span><span className="font-semibold text-[#0F1117]">{user.department ?? form.department}</span></div>
        <div className="flex items-center justify-between"><span className="text-[#5F6B73]">Session</span><span className="font-semibold text-[#0F1117]">{session.source === "mock-rbac" ? "Investor Preview" : "Supabase Auth"}</span></div>
      </div>
    </div>
  );
}

// A-84 phone-link flow, ported near-verbatim from SettingsSection.tsx's LinkedPhoneSection --
// restyled for mobile tap-targets/spacing only, not redesigned (no auto-advancing code boxes etc).
function MobileLinkedPhoneSection({ currentPhone }: { currentPhone?: string }) {
  const [step, setStep] = useState<"idle" | "code">("idle");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  async function sendCode() {
    const trimmed = phone.trim();
    if (!trimmed) {
      setToast({ tone: "error", message: "Enter a phone number in international format, e.g. +911234567890." });
      return;
    }
    setBusy(true);
    setToast(null);
    try {
      const response = await fetch("/api/auth/phone/link/start", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmed }),
      });
      const body = await response.json().catch(() => ({} as { error?: string }));
      if (!response.ok) {
        setToast({ tone: "error", message: body.error ?? "Unable to send a verification code." });
        return;
      }
      setStep("code");
      setToast({ tone: "info", message: `Code sent to ${trimmed}.` });
    } catch {
      setToast({ tone: "error", message: "Unable to reach the server. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setToast({ tone: "error", message: "Enter the code you received." });
      return;
    }
    setBusy(true);
    setToast(null);
    try {
      const response = await fetch("/api/auth/phone/link/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), token: trimmedCode }),
      });
      const body = await response.json().catch(() => ({} as { error?: string }));
      if (!response.ok) {
        setToast({ tone: "error", message: body.error ?? "That code is invalid or has expired." });
        return;
      }
      setToast({ tone: "success", message: "Phone number linked -- you can now sign in with it directly." });
      setStep("idle");
      setPhone("");
      setCode("");
    } catch {
      setToast({ tone: "error", message: "Unable to reach the server. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-[rgba(15,17,23,0.08)] bg-white px-3.5 py-3.5">
      <div className="flex items-center gap-2">
        <Smartphone size={15} className="text-[#8B1E2D]" />
        <h3 className="text-sm font-semibold text-[#0F1117]">Linked sign-in methods</h3>
      </div>
      {currentPhone ? (
        <p className="text-xs text-[#5F6B73]">Phone sign-in is linked to <span className="font-semibold text-[#0F1117]">{currentPhone}</span>.</p>
      ) : (
        <p className="text-xs leading-relaxed text-[#5F6B73]">
          Link a phone number to sign in with it directly next time, instead of it being treated as a new account.
        </p>
      )}
      {step === "code" ? (
        <div className="flex flex-col gap-2">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            placeholder="Enter code"
            className="min-h-[44px] rounded-lg border border-[rgba(15,17,23,0.12)] px-3 text-sm"
          />
          <button
            type="button"
            onClick={() => void verifyCode()}
            disabled={busy}
            className="flex min-h-[44px] items-center justify-center rounded-lg bg-[#8B1E2D] px-3 text-xs font-semibold text-white hover:bg-[#7a1a27] disabled:opacity-60"
          >
            {busy ? "Verifying..." : "Verify"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            type="tel"
            placeholder="+91 XXXXX XXXXX"
            className="min-h-[44px] rounded-lg border border-[rgba(15,17,23,0.12)] px-3 text-sm"
          />
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={busy}
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-[rgba(15,17,23,0.12)] bg-white px-3 text-xs font-semibold text-[#0F1117] hover:bg-[#F8F9FA] disabled:opacity-60"
          >
            {busy ? "Sending..." : currentPhone ? "Link a different number" : "Send code"}
          </button>
        </div>
      )}
      {toast && <InlineToast tone={toast.tone} message={toast.message} />}
    </div>
  );
}

// A-79 agentic gate toggle, ported from SettingsSection.tsx's AgenticGateTogglePanel -- a
// localStorage preference with no RBAC gate, unchanged read/write functions.
function MobileAgenticGateToggle() {
  const [enabled, setEnabled] = useState(() => isAgenticGateEnabled());

  const toggle = (nextEnabled: boolean) => {
    setAgenticGateEnabled(nextEnabled);
    setEnabled(nextEnabled);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(15,17,23,0.08)] bg-white px-3.5 py-3.5">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-[#0F1117]">Agentic action prompts</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-[#5F6B73]">
          Ask what to do with an answer after it looks actionable. The manual &quot;Create actionable&quot; button still works either way.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => toggle(!enabled)}
        className={`relative h-7 w-14 flex-shrink-0 rounded-full transition-colors ${enabled ? "bg-[#8B1E2D]" : "bg-[#D1D5DB]"}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`} />
      </button>
    </div>
  );
}
