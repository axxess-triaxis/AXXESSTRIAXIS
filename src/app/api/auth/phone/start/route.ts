import { NextResponse } from "next/server";
import { callSupabaseAuth, phoneAuthEnabled } from "../../../../../auth/authApi";
import { SupabaseAuthError } from "../../../../../auth/supabaseAuthError";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { phone?: string } | null;
  const phone = body?.phone?.trim();

  if (!phone) {
    return NextResponse.json({ error: "A phone number is required." }, { status: 400 });
  }

  if (!phoneAuthEnabled()) {
    return NextResponse.json({ error: "Phone sign-in is not enabled for this deployment." }, { status: 400 });
  }

  try {
    await callSupabaseAuth("otp", { phone });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SupabaseAuthError) {
      console.error(`[auth/phone/start] Supabase OTP request failed (status=${error.status}, code=${error.code ?? "unknown"}): ${error.message}`);
    } else {
      console.error("[auth/phone/start] Unexpected OTP request failure:", error);
    }
    return NextResponse.json({ error: "Unable to send a verification code to that number right now." }, { status: 502 });
  }
}
