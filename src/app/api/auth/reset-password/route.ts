import { NextResponse } from "next/server";
import { updateSupabasePassword, isSupabaseAuthApiConfigured } from "../../../../auth/authApi";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { accessToken?: string; password?: string } | null;
  const accessToken = body?.accessToken?.trim();
  const password = body?.password;

  if (!accessToken || !password || password.length < 8) {
    return NextResponse.json({ error: "A recovery token and password of at least 8 characters are required." }, { status: 400 });
  }

  if (!isSupabaseAuthApiConfigured()) {
    return NextResponse.json({ error: "Password reset requires Supabase Auth configuration." }, { status: 503 });
  }

  try {
    await updateSupabasePassword(accessToken, password);
    return NextResponse.json({ ok: true, message: "Password updated. You can sign in with the new password." });
  } catch {
    return NextResponse.json({ error: "Unable to update password. Open the latest recovery link and try again." }, { status: 400 });
  }
}
