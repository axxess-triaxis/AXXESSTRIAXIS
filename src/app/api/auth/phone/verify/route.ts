import { NextResponse } from "next/server";
import { phoneAuthEnabled } from "../../../../../auth/authApi";
import { verifyPhoneOtpServerSide } from "../../../../../auth/serverSession";
import { SupabaseAuthError } from "../../../../../auth/supabaseAuthError";
import { auditLogsRepository } from "../../../../../repositories/supabaseEnterpriseRepositories";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { phone?: string; token?: string } | null;
  const phone = body?.phone?.trim();
  const token = body?.token?.trim();

  if (!phone || !token) {
    return NextResponse.json({ error: "A phone number and verification code are required." }, { status: 400 });
  }

  if (!phoneAuthEnabled()) {
    return NextResponse.json({ error: "Phone sign-in is not enabled for this deployment." }, { status: 400 });
  }

  try {
    const session = await verifyPhoneOtpServerSide(phone, token);
    await auditLogsRepository.record({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      role: session.user.role,
      accessToken: session.accessToken,
    }, {
      action: "auth.login",
      resourceType: "user",
      resourceId: session.user.id,
      category: "authentication",
      metadata: { method: "phone_otp" },
    }).catch(() => undefined);

    return NextResponse.json({ user: session.user });
  } catch (error) {
    if (error instanceof SupabaseAuthError) {
      console.error(`[auth/phone/verify] Supabase OTP verify failed (status=${error.status}, code=${error.code ?? "unknown"}): ${error.message}`);
    } else {
      console.error("[auth/phone/verify] Unexpected OTP verify failure:", error);
    }
    return NextResponse.json({ error: "That code is invalid or has expired." }, { status: 401 });
  }
}
