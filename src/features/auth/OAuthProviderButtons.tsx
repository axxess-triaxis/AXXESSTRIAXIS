"use client";

import { useState } from "react";

type OAuthProvider = "google" | "microsoft";

const providerLabel: Record<OAuthProvider, string> = {
  google: "Continue with Google",
  microsoft: "Continue with Microsoft",
};

// Always shown, regardless of whether NEXT_PUBLIC_AUTH_GOOGLE_ENABLED/NEXT_PUBLIC_AUTH_MICROSOFT_ENABLED
// are set -- a real tenant evaluating AXXESS needs to see that these identity options exist, matching
// the "provider-gated" pattern used elsewhere in this app (visible, honest about readiness) rather than
// hiding the feature entirely until an administrator configures it. /api/auth/oauth/start already
// returns a clear, safe error ("<provider> OAuth is not enabled for this deployment.") when a provider
// isn't configured -- that message is shown inline, not masked, exactly as returned.
export function OAuthProviderButtons({ onError }: { onError: (message: string) => void }) {
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null);

  async function startOAuth(provider: OAuthProvider) {
    setPendingProvider(provider);
    onError("");
    try {
      const response = await fetch(`/api/auth/oauth/start?provider=${provider}`, { credentials: "include" });
      const body = await response.json().catch(() => ({} as { authorizeUrl?: string; error?: string }));
      if (response.ok && body.authorizeUrl) {
        window.location.assign(body.authorizeUrl);
        return;
      }
      onError(body.error ?? `Unable to start ${providerLabel[provider]}.`);
    } catch {
      onError(`Unable to start ${providerLabel[provider]}.`);
    } finally {
      setPendingProvider(null);
    }
  }

  return (
    <div className="space-y-2">
      {(["google", "microsoft"] as const).map((provider) => (
        <button
          key={provider}
          type="button"
          onClick={() => void startOAuth(provider)}
          disabled={pendingProvider !== null}
          className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-4 py-2 text-sm font-semibold text-[#0F1117] hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendingProvider === provider ? "Redirecting..." : providerLabel[provider]}
        </button>
      ))}
    </div>
  );
}
