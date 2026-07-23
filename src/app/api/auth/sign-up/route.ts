import { NextResponse } from "next/server";
import { callSupabaseAuth, isSupabaseAuthApiConfigured } from "../../../../auth/authApi";
import { SupabaseAuthError } from "../../../../auth/supabaseAuthError";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string; displayName?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (!isSupabaseAuthApiConfigured()) {
    return NextResponse.json({ error: "Sign-up requires Supabase Auth configuration." }, { status: 503 });
  }

  try {
    await callSupabaseAuth("signup", {
      email,
      password,
      data: { display_name: body?.displayName },
    });
    return NextResponse.json({ ok: true, message: "Check your email to verify the account before onboarding." });
  } catch (error) {
    if (error instanceof SupabaseAuthError) {
      console.error(`[auth/sign-up] Supabase sign-up failed (status=${error.status}, code=${error.code ?? "unknown"}): ${error.message}`);
      if (error.code === "user_already_exists") {
        return NextResponse.json({
          error: "An account already exists for this email. Sign in instead.",
          code: "user_already_exists",
        }, { status: 409 });
      }
    } else {
      console.error("[auth/sign-up] Unexpected sign-up failure:", error);
    }
    return NextResponse.json({ error: "Unable to create account. Check Supabase Auth settings and email confirmation configuration." }, { status: 400 });
  }
}
