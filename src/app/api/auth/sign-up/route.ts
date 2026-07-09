import { NextResponse } from "next/server";
import { callSupabaseAuth, isSupabaseAuthApiConfigured } from "../../../../auth/authApi";

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
  } catch {
    return NextResponse.json({ error: "Unable to create account. Check Supabase Auth settings and email confirmation configuration." }, { status: 400 });
  }
}
