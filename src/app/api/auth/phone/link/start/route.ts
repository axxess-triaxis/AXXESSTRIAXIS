import { NextResponse } from "next/server";
import { phoneAuthEnabled } from "../../../../../../auth/authApi";
import { getServerAuthSession, linkPhoneStartServerSide } from "../../../../../../auth/serverSession";
import { SupabaseAuthError } from "../../../../../../auth/supabaseAuthError";

// A-84 (2026-08-02): the authenticated "add a phone number to my existing account" flow --
// distinct from /api/auth/phone/start, which is the unauthenticated sign-in OTP request. This
// requires an existing session; that session's own access token is what makes Supabase attach the
// phone to the caller's EXISTING identity instead of creating a new one.
export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => null) as { phone?: string } | null;
  const phone = body?.phone?.trim();
  if (!phone) return NextResponse.json({ error: "A phone number is required." }, { status: 400 });

  if (!phoneAuthEnabled()) {
    return NextResponse.json({ error: "Phone sign-in is not enabled for this deployment." }, { status: 400 });
  }

  try {
    await linkPhoneStartServerSide(session.accessToken, phone);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SupabaseAuthError) {
      console.error(`[auth/phone/link/start] Supabase phone-change request failed (status=${error.status}, code=${error.code ?? "unknown"}): ${error.message}`);
      // Authenticated context (the caller is already signed in, linking their own account) -- safe
      // to surface Supabase's real message, unlike the unauthenticated sign-in routes, which
      // deliberately use a generic message to avoid account-enumeration leakage.
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("[auth/phone/link/start] Unexpected phone-change request failure:", error);
    return NextResponse.json({ error: "Unable to send a verification code to that number right now." }, { status: 502 });
  }
}
