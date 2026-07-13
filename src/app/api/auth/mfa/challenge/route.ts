import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../../auth/serverSession";

function supabaseAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, anonKey };
}

type ChallengeBody = {
  factorId?: string;
  challengeId?: string;
  code?: string;
};

export async function POST(request: Request) {
  const session = await getServerAuthSession(true);
  if (!session) {
    return NextResponse.json({ error: "MFA challenge requires an authenticated session." }, { status: 401 });
  }

  const { url, anonKey } = supabaseAuthConfig();
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Supabase Auth configuration is required for MFA challenge." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({})) as ChallengeBody;
  const factorId = body.factorId?.trim();
  if (!factorId) {
    return NextResponse.json({ error: "factorId is required." }, { status: 400 });
  }

  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${session.accessToken}`,
    "Content-Type": "application/json",
  };

  if (body.challengeId && body.code) {
    const verifyResponse = await fetch(`${url}/auth/v1/factors/${encodeURIComponent(factorId)}/verify`, {
      method: "POST",
      headers,
      body: JSON.stringify({ challenge_id: body.challengeId, code: body.code }),
      cache: "no-store",
    });
    const verifyPayload = await verifyResponse.json().catch(() => ({}));
    if (!verifyResponse.ok) {
      return NextResponse.json(
        { error: (verifyPayload as { msg?: string; error_description?: string }).msg ?? (verifyPayload as { error_description?: string }).error_description ?? "Unable to verify MFA challenge." },
        { status: verifyResponse.status },
      );
    }
    return NextResponse.json({ ok: true, message: "MFA verification successful.", verification: verifyPayload });
  }

  const challengeResponse = await fetch(`${url}/auth/v1/factors/${encodeURIComponent(factorId)}/challenge`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
    cache: "no-store",
  });
  const challengePayload = await challengeResponse.json().catch(() => ({}));
  if (!challengeResponse.ok) {
    return NextResponse.json(
      { error: (challengePayload as { msg?: string; error_description?: string }).msg ?? (challengePayload as { error_description?: string }).error_description ?? "Unable to create MFA challenge." },
      { status: challengeResponse.status },
    );
  }

  return NextResponse.json({ ok: true, message: "MFA challenge created.", challenge: challengePayload });
}
