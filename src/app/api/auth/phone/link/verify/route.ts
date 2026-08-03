import { NextResponse } from "next/server";
import { phoneAuthEnabled } from "../../../../../../auth/authApi";
import { getServerAuthSession, linkPhoneVerifyServerSide } from "../../../../../../auth/serverSession";
import { SupabaseAuthError } from "../../../../../../auth/supabaseAuthError";
import { auditLogsRepository } from "../../../../../../repositories/supabaseEnterpriseRepositories";

// A-84 (2026-08-02): confirms linking a phone number to the caller's own, already-authenticated
// account. Unlike /api/auth/phone/verify (unauthenticated sign-in), this never creates a new
// identity or a new tenant -- it attaches the phone to the existing auth.users row via Supabase's
// type:"phone_change" verify, so a later phone-only sign-in for this number resolves to this same
// existing user/tenant with no further code changes needed (see serverSession.ts).
export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await request.json().catch(() => null) as { phone?: string; token?: string } | null;
  const phone = body?.phone?.trim();
  const token = body?.token?.trim();
  if (!phone || !token) return NextResponse.json({ error: "A phone number and verification code are required." }, { status: 400 });

  if (!phoneAuthEnabled()) {
    return NextResponse.json({ error: "Phone sign-in is not enabled for this deployment." }, { status: 400 });
  }

  try {
    const user = await linkPhoneVerifyServerSide(session.accessToken, phone, token);
    await auditLogsRepository.record({
      organizationId: user.organizationId,
      userId: user.id,
      role: user.role,
      accessToken: session.accessToken,
    }, {
      action: "auth.phone_linked",
      resourceType: "user",
      resourceId: user.id,
      category: "authentication",
      metadata: {},
    }).catch(() => undefined);

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof SupabaseAuthError) {
      console.error(`[auth/phone/link/verify] Supabase phone-change verify failed (status=${error.status}, code=${error.code ?? "unknown"}): ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("[auth/phone/link/verify] Unexpected phone-change verify failure:", error);
    return NextResponse.json({ error: "That code is invalid or has expired." }, { status: 401 });
  }
}
