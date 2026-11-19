import { NextResponse } from "next/server";
import { signInServerSide } from "../../../../auth/serverSession";
import { auditLogsRepository } from "../../../../repositories/supabaseEnterpriseRepositories";
import { SupabaseAuthError } from "../../../../auth/supabaseAuthError";
import { AccountSuspendedError } from "../../../../auth/supabaseUser";
import { getPostHogClient } from "../../../../lib/posthog-server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  const email = body?.email?.trim();
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  // Phase timings (staging 2026-11-19: ~1 in 20 sign-ins stalled ~21 s after Vercel logged 200, and
  // the request log has no duration). Logged as one line and returned as Server-Timing; never
  // includes the email or password.
  const startedAt = performance.now();
  const elapsed = (from: number) => Math.round(performance.now() - from);

  try {
    const session = await signInServerSide(email, password);
    const signinMs = elapsed(startedAt);
    const auditStartedAt = performance.now();
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
    const auditMs = elapsed(auditStartedAt);

    const analyticsStartedAt = performance.now();
    const posthog = getPostHogClient();
    if (posthog) {
      posthog.identify({
        distinctId: session.user.id,
        properties: {
          email: session.user.email ?? email,
          user_role: session.user.role,
          organization_id: session.user.organizationId,
        },
      });
      posthog.capture({
        distinctId: session.user.id,
        event: "user_login",
        properties: {
          auth_method: "password",
          user_role: session.user.role,
          organization_id: session.user.organizationId,
        },
      });
      await posthog.flush();
    }
    const analyticsMs = elapsed(analyticsStartedAt);
    const totalMs = elapsed(startedAt);

    console.info(`[auth/login] timing signin=${signinMs}ms audit=${auditMs}ms analytics=${analyticsMs}ms total=${totalMs}ms`);
    return NextResponse.json({ user: session.user }, {
      headers: {
        "Server-Timing": `signin;dur=${signinMs}, audit;dur=${auditMs}, analytics;dur=${analyticsMs}, total;dur=${totalMs}`,
      },
    });
  } catch (error) {
    if (error instanceof AccountSuspendedError) {
      return NextResponse.json({ error: "This account is suspended. Contact your organization admin.", code: "account_suspended" }, { status: 403 });
    }
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
