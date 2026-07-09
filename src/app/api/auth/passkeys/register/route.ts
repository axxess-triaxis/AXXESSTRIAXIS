import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: false,
    blocker: "Passkey registration is passkey-ready but requires stable Supabase WebAuthn/passkey configuration before production enablement.",
  }, { status: 501 });
}
