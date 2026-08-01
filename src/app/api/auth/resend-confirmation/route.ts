import { NextResponse } from "next/server";
import { callSupabaseAuth, isSupabaseAuthApiConfigured } from "../../../../auth/authApi";
import { SupabaseAuthError } from "../../../../auth/supabaseAuthError";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  if (!isSupabaseAuthApiConfigured()) {
    return NextResponse.json({ error: "Resend requires Supabase Auth configuration." }, { status: 503 });
  }

  try {
    await callSupabaseAuth("resend", { type: "signup", email });
  } catch (error) {
    if (error instanceof SupabaseAuthError) {
      console.error(`[auth/resend-confirmation] Supabase resend failed (status=${error.status}, code=${error.code ?? "unknown"}): ${error.message}`);
    } else {
      console.error("[auth/resend-confirmation] Unexpected resend failure:", error);
    }
  }

  // Always return the same success response regardless of whether the account exists or
  // the resend actually succeeded server-side -- this avoids leaking account existence
  // (account enumeration) through response status/body differences.
  return NextResponse.json({ ok: true, message: "If an account exists for that email, a new confirmation link has been sent." });
}
