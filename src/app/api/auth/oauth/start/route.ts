import { NextResponse } from "next/server";
import { authProviderEnabled } from "../../../../../../auth/authApi";

type Provider = "google" | "microsoft" | "apple";

function isProvider(value: string): value is Provider {
  return value === "google" || value === "microsoft" || value === "apple";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = (url.searchParams.get("provider") ?? "").trim().toLowerCase();

  if (!isProvider(provider)) {
    return NextResponse.json({ error: "provider must be one of google, microsoft, apple." }, { status: 400 });
  }

  if (!authProviderEnabled(provider)) {
    return NextResponse.json({ error: `${provider} OAuth is not enabled for this deployment.` }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
  if (!supabaseUrl) {
    return NextResponse.json({ error: "Supabase Auth configuration is required for OAuth." }, { status: 503 });
  }

  const redirectTo = `${appUrl}/auth/login`;
  const authorizeUrl = `${supabaseUrl}/auth/v1/authorize?provider=${encodeURIComponent(provider)}&redirect_to=${encodeURIComponent(redirectTo)}`;
  return NextResponse.json({ ok: true, provider, authorizeUrl });
}
