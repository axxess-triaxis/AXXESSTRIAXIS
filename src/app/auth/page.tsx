"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "../../auth/AuthProvider";
import { Card } from "../../components/ui/Card";

function LoginPanel() {
  const router = useRouter();
  const { login, session, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isAuthenticated && session.user) {
    return (
      <Card className="w-full max-w-md p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8B1E2D]">AXXESS</p>
          <h1 className="mt-2 text-xl font-bold text-[#0F1117]">Signed in</h1>
          <p className="mt-1 text-sm text-[#5F6B73]">{session.user.displayName ?? session.user.email} is authenticated.</p>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full rounded-lg bg-[#8B1E2D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7a1a27]"
        >
          Continue to workspace
        </button>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md p-6">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8B1E2D]">AXXESS</p>
        <h1 className="mt-2 text-xl font-bold text-[#0F1117]">Sign in</h1>
        <p className="mt-1 text-sm text-[#5F6B73]">Use your organization email and password.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#0F1117]">Email</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E2D]"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#0F1117]">Password</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E2D]"
          />
        </label>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-[#8B1E2D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7a1a27] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </Card>
  );
}

export default function AuthPage() {
  return (
    <AuthProvider>
      <main className="flex min-h-screen items-center justify-center bg-[#F2F3F5] px-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <LoginPanel />
      </main>
    </AuthProvider>
  );
}
