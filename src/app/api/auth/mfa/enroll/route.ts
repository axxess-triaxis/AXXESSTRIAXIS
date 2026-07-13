import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../auth/serverSession";

function supabaseAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, anonKey };
}

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) {
    return NextResponse.json({ error: "MFA enrollment requires an authenticated session." }, { status: 401 });
  }

  const { url, anonKey } = supabaseAuthConfig();
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Supabase Auth configuration is required for MFA enrollment." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({})) as { friendlyName?: string };
  const friendlyName = body.friendlyName?.trim() || "AXXESS Authenticator";

  const response = await fetch(`${url}/auth/v1/factors`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      factor_type: "totp",
      friendly_name: friendlyName,
      issuer: "AXXESS",
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(
      { error: (payload as { msg?: string; error_description?: string }).msg ?? (payload as { error_description?: string }).error_description ?? "Unable to enroll MFA factor." },
      { status: response.status },
    );
  }

  return NextResponse.json({
    ok: true,
    factor: payload,
    message: "MFA factor enrollment started. Scan the QR code in your authenticator app and verify with a challenge code.",
  });
}
