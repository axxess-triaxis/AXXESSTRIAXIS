"use client";

import { Smartphone } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "phone" | "code";

// Always shown, same "visible, honest about readiness" pattern as OAuthProviderButtons --
// /api/auth/phone/start returns a clear "Phone sign-in is not enabled for this deployment."
// error when NEXT_PUBLIC_AUTH_PHONE_ENABLED isn't set, shown inline rather than hiding the
// option entirely.
export function PhoneOtpSignIn({ onError }: { onError: (message: string) => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function requestCode() {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      onError("Enter a phone number in international format, e.g. +911234567890.");
      return;
    }
    setBusy(true);
    onError("");
    setInfo(null);
    try {
      const response = await fetch("/api/auth/phone/start", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmedPhone }),
      });
      const body = await response.json().catch(() => ({} as { error?: string }));
      if (!response.ok) {
        onError(body.error ?? "Unable to send a verification code.");
        return;
      }
      setStep("code");
      setInfo(`Code sent to ${trimmedPhone}.`);
    } catch {
      onError("Unable to send a verification code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      onError("Enter the code you received.");
      return;
    }
    setBusy(true);
    onError("");
    try {
      const response = await fetch("/api/auth/phone/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), token: trimmedCode }),
      });
      const body = await response.json().catch(() => ({} as { user?: { needsOnboarding?: boolean }; error?: string }));
      if (!response.ok || !body.user) {
        onError(body.error ?? "That code is invalid or has expired.");
        return;
      }
      router.push(body.user.needsOnboarding ? "/onboarding" : "/dashboard");
    } catch {
      onError("Unable to verify that code right now.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "code") {
    return (
      <div className="space-y-2">
        {info && <p className="text-xs text-[#5F6B73]">{info}</p>}
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            placeholder="Enter code"
            className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E2D]"
          />
          <button
            type="button"
            onClick={() => void verifyCode()}
            disabled={busy}
            className="flex-none rounded-lg bg-[#8B1E2D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Verifying..." : "Verify"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => { setStep("phone"); setCode(""); setInfo(null); }}
          className="text-xs font-semibold text-[#8B1E2D] hover:underline"
        >
          Use a different number
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <input
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        type="tel"
        placeholder="+91 XXXXX XXXXX"
        className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E2D]"
      />
      <button
        type="button"
        onClick={() => void requestCode()}
        disabled={busy}
        className="flex-none inline-flex items-center gap-2 rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-4 py-2 text-sm font-semibold text-[#0F1117] hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Smartphone size={14} /> {busy ? "Sending..." : "Send code"}
      </button>
    </div>
  );
}
