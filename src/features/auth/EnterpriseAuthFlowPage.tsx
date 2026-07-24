"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Card } from "../../components/ui/Card";
import { trackEvent } from "../../services/analytics";
import { OAuthProviderButtons } from "./OAuthProviderButtons";

type AuthFlowKind = "sign-up" | "login" | "forgot-password" | "reset-password" | "mfa-enroll" | "mfa-challenge" | "security" | "account-delete" | "privacy";

const flowCopy: Record<AuthFlowKind, { title: string; subtitle: string; action: string; endpoint?: string }> = {
  "sign-up": {
    title: "Create your AXXESS account",
    subtitle: "Use your organization email. A clean tenant is created during onboarding, never through Demo Mode.",
    action: "Create account",
    endpoint: "/api/auth/sign-up",
  },
  login: {
    title: "Sign in",
    subtitle: "Email/password login remains available while MFA and OAuth are configured per tenant.",
    action: "Open login",
  },
  "forgot-password": {
    title: "Forgot password",
    subtitle: "Send a Supabase recovery link to the verified account email.",
    action: "Send reset link",
    endpoint: "/api/auth/forgot-password",
  },
  "reset-password": {
    title: "Reset password",
    subtitle: "Final password reset requires a verified Supabase recovery session.",
    action: "Check reset status",
    endpoint: "/api/auth/reset-password",
  },
  "mfa-enroll": {
    title: "Enroll MFA",
    subtitle: "Enroll a time-based factor after Supabase MFA is enabled for the project.",
    action: "Start MFA enrollment",
    endpoint: "/api/auth/mfa/enroll",
  },
  "mfa-challenge": {
    title: "MFA challenge",
    subtitle: "Challenge an enrolled factor during login or sensitive admin actions.",
    action: "Verify factor",
    endpoint: "/api/auth/mfa/challenge",
  },
  security: {
    title: "Security center",
    subtitle: "Manage MFA, OAuth, passkeys, session posture, and privacy requests.",
    action: "Open security settings",
  },
  "account-delete": {
    title: "Account deletion",
    subtitle: "Initiate deletion for beta admin processing with audit retention and legal-hold review.",
    action: "Request deletion",
    endpoint: "/api/account/deletion-request",
  },
  privacy: {
    title: "Privacy controls",
    subtitle: "Request an export and review beta privacy controls for account data.",
    action: "Request privacy export",
    endpoint: "/api/privacy/export-request",
  },
};

export function EnterpriseAuthFlowPage({ kind }: { kind: AuthFlowKind }) {
  const copy = flowCopy[kind];
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryToken, setRecoveryToken] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [signUpSucceeded, setSignUpSucceeded] = useState(false);

  useEffect(() => {
    if (kind !== "reset-password" || typeof window === "undefined") return;
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = hashParams.get("access_token") ?? hashParams.get("token") ?? "";
    if (token) setRecoveryToken(token);
  }, [kind]);

  // /api/auth/oauth/start redirects the browser to Supabase's own authorize endpoint, which -- once
  // the user completes Google/Microsoft sign-in on the provider's own page -- redirects back here
  // (/auth/login) with access/refresh tokens in the URL fragment. Supabase never calls our server
  // directly, so this is the only place that can pick those tokens up and turn them into a real,
  // httpOnly-cookie-backed session via /api/auth/oauth/callback.
  useEffect(() => {
    if (kind !== "login" || typeof window === "undefined") return;
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hashParams.get("access_token");
    if (!accessToken) return;
    const refreshToken = hashParams.get("refresh_token") ?? undefined;

    setBusy(true);
    setMessage(null);
    fetch("/api/auth/oauth/callback", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, refreshToken }),
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({} as { user?: { needsOnboarding?: boolean }; error?: string }));
        if (!response.ok || !body.user) {
          setMessage({ tone: "error", text: body.error ?? "Unable to complete sign-in with the selected provider." });
          setBusy(false);
          return;
        }
        trackEvent("user_login", { auth_method: "oauth" }, { module_name: "auth", route: "/auth/login" });
        router.push(body.user.needsOnboarding ? "/onboarding" : "/dashboard");
      })
      .catch(() => {
        setMessage({ tone: "error", text: "Unable to complete sign-in with the selected provider." });
        setBusy(false);
      });
  }, [kind, router]);

  async function submit() {
    if (kind === "login") {
      window.location.assign("/auth");
      return;
    }

    if (kind === "security") {
      window.location.assign("/settings/security");
      return;
    }

    if (!copy.endpoint) return;

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(copy.endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName, accessToken: recoveryToken }),
      });
      const body = await response.json().catch(() => ({} as { message?: string; error?: string; blocker?: string }));
      const text = body.message ?? body.blocker ?? body.error ?? (response.ok ? "Request accepted." : "Request could not be completed.");
      setMessage({ tone: response.ok ? "success" : "error", text });
      if (kind === "sign-up" && response.ok) {
        setSignUpSucceeded(true);
        trackEvent("sign_up_completed", { flow: "email_password" }, { module_name: "auth", route: "/auth/sign-up" });
      }
      if (kind === "account-delete" && response.ok) trackEvent("account_deletion_started", { flow: "beta_admin_processing" }, { module_name: "settings", route: "/settings/account/delete" });
    } finally {
      setBusy(false);
    }
  }

  if (kind === "sign-up" && signUpSucceeded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F2F3F5] px-4 py-10" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <Card className="w-full max-w-lg p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8B1E2D]">AXXESS</p>
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-emerald-50 px-4 py-3">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">&#10003;</span>
            <div>
              <h1 className="text-lg font-bold text-emerald-800">Account created</h1>
              <p className="text-sm text-emerald-700">Check {email || "your inbox"} for a confirmation link.</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[#5F6B73]">
            Open the confirmation email and click the link to verify {email || "your account"}. Once verified, sign in below to continue -- onboarding starts automatically for a new account.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={"/auth" as Route} className="rounded-lg bg-[#8B1E2D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7a1a27]">
              Go to sign in
            </Link>
            <Link href={"/onboarding" as Route} className="rounded-lg border border-[rgba(0,0,0,0.12)] px-4 py-2 text-sm font-semibold text-[#0F1117]">
              Onboarding
            </Link>
          </div>
          <p className="mt-4 text-xs text-[#5F6B73]">No email after a few minutes? Check spam, or sign in once you&apos;ve verified to trigger a fresh link if needed.</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F2F3F5] px-4 py-10" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Card className="w-full max-w-lg p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8B1E2D]">AXXESS</p>
        <h1 className="mt-2 text-xl font-bold text-[#0F1117]">{copy.title}</h1>
        <p className="mt-1 text-sm leading-relaxed text-[#5F6B73]">{copy.subtitle}</p>

        {["sign-up", "forgot-password"].includes(kind) && (
          <label className="mt-5 block">
            <span className="mb-1.5 block text-xs font-semibold text-[#0F1117]">Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E2D]" />
          </label>
        )}

        {kind === "sign-up" && (
          <>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs font-semibold text-[#0F1117]">Display name</span>
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E2D]" />
            </label>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs font-semibold text-[#0F1117]">Password</span>
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E2D]" />
            </label>
          </>
        )}

        {kind === "reset-password" && (
          <>
            <label className="mt-5 block">
              <span className="mb-1.5 block text-xs font-semibold text-[#0F1117]">Recovery token</span>
              <input value={recoveryToken} onChange={(event) => setRecoveryToken(event.target.value)} className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E2D]" />
            </label>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs font-semibold text-[#0F1117]">New password</span>
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E2D]" />
            </label>
          </>
        )}

        {kind === "sign-up" && (
          <>
            <div className="mt-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wide text-[#5F6B73]">
              <span className="h-px flex-1 bg-[rgba(0,0,0,0.08)]" />
              or
              <span className="h-px flex-1 bg-[rgba(0,0,0,0.08)]" />
            </div>
            <div className="mt-4">
              <OAuthProviderButtons onError={(text) => setMessage(text ? { tone: "error", text } : null)} />
            </div>
          </>
        )}

        {message && (
          <p className={`mt-4 rounded-lg px-3 py-2 text-xs font-medium ${message.tone === "error" ? "bg-red-50 text-red-700" : message.tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-[#F8F9FA] text-[#0F1117]"}`}>
            {message.text}
          </p>
        )}

        {kind === "login" && busy ? (
          <p className="mt-5 text-sm text-[#5F6B73]">Completing sign-in...</p>
        ) : (
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => void submit()} disabled={busy} className="rounded-lg bg-[#8B1E2D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7a1a27] disabled:opacity-60">
              {busy ? "Working..." : copy.action}
            </button>
            <Link href={"/onboarding" as Route} className="rounded-lg border border-[rgba(0,0,0,0.12)] px-4 py-2 text-sm font-semibold text-[#0F1117]">
              Onboarding
            </Link>
          </div>
        )}

        {kind === "sign-up" && (
          <p className="mt-4 text-center text-sm text-[#5F6B73]">
            Already have an account?{" "}
            <Link href={"/auth" as Route} className="font-semibold text-[#8B1E2D] hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </Card>
    </main>
  );
}
