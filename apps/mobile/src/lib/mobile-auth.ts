import * as SecureStore from "expo-secure-store";

const accessTokenKey = "axxess.mobile.access_token";
const refreshTokenKey = "axxess.mobile.refresh_token";

function supabaseConfig() {
  return {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""),
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export async function signInMobile(email: string, password: string) {
  const { url, anonKey } = supabaseConfig();
  if (!url || !anonKey) throw new Error("Supabase mobile auth is not configured.");

  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) throw new Error("Unable to sign in.");
  const payload = await response.json() as { access_token: string; refresh_token?: string };
  await SecureStore.setItemAsync(accessTokenKey, payload.access_token);
  if (payload.refresh_token) await SecureStore.setItemAsync(refreshTokenKey, payload.refresh_token);
  return payload;
}

export async function signOutMobile() {
  await SecureStore.deleteItemAsync(accessTokenKey);
  await SecureStore.deleteItemAsync(refreshTokenKey);
}
