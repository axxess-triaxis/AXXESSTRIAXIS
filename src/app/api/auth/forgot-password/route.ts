import { NextResponse } from "next/server";
import { callSupabaseAuth, isSupabaseAuthApiConfigured } from "../../../../auth/authApi";
import { SupabaseAuthError } from "../../../../auth/supabaseAuthError";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

  if (!isSupabaseAuthApiConfigured()) {
    return NextResponse.json({ error: "Password recovery requires Supabase Auth configuration." }, { status: 503 });
  }

  try {
    await callSupabaseAuth("recover", {
      email,
      redirect_to: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/reset-password`,
    });
    return NextResponse.json({ ok: true, message: "If the account exists, a reset link has been sent." });
  } catch (error) {
    // The real cause (e.g. an SMTP relay rejecting Supabase's send attempt) used to be silently
    // discarded here, leaving no way to diagnose a real delivery failure from anywhere but guessing.
    // Logging it server-side (visible in Vercel's function logs) without changing the client-facing
    // message keeps the same safe-generic-error convention as /api/auth/login's SupabaseAuthError
    // handling, while making the actual failure diagnosable.
    if (error instanceof SupabaseAuthError) {
      console.error(`[auth/forgot-password] Supabase password recovery failed (status=${error.status}, code=${error.code ?? "unknown"}): ${error.message}`);
    } else {
      console.error("[auth/forgot-password] Unexpected password recovery failure:", error);
    }
    return NextResponse.json({ error: "Unable to start password recovery." }, { status: 400 });
  }
}
