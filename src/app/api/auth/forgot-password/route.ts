import { NextResponse } from "next/server";
import { callSupabaseAuth, isSupabaseAuthApiConfigured } from "../../../../auth/authApi";

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
  } catch {
    return NextResponse.json({ error: "Unable to start password recovery." }, { status: 400 });
  }
}
