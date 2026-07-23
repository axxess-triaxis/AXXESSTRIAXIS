import { NextResponse } from "next/server";
import { signInServerSide } from "../../../../auth/serverSession";
import { auditLogsRepository } from "../../../../repositories/supabaseEnterpriseRepositories";
import { SupabaseAuthError } from "../../../../auth/supabaseAuthError";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  const email = body?.email?.trim();
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    const session = await signInServerSide(email, password);
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
      metadata: { email },
    }).catch(() => undefined);

    return NextResponse.json({ user: session.user });
  } catch (error) {
    if (error instanceof SupabaseAuthError) {
      console.error(`[auth/login] Supabase sign-in failed (status=${error.status}, code=${error.code ?? "unknown"}): ${error.message}`);
      if (error.code === "email_not_confirmed") {
        return NextResponse.json({
          error: "Confirm your email before signing in. Check your inbox, or request a new confirmation email.",
          code: "email_not_confirmed",
        }, { status: 401 });
      }
    } else {
      console.error("[auth/login] Unexpected sign-in failure:", error);
    }
    return NextResponse.json({ error: "Unable to sign in with the supplied email and password." }, { status: 401 });
  }
}
