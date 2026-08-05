import { useEffect, useState } from "react";

// Client-side-only status check against the Facebook JS SDK loaded in layout.tsx (gated on
// NEXT_PUBLIC_META_APP_ID). This is purely informational -- it tells the WhatsApp Business/Meta
// Business tiles whether this browser already has an authorized Facebook session, before the user
// clicks "Connect". It does NOT feed into the actual connector auth: that stays the existing
// server-side authorization-code flow (/api/connectors/oauth/start -> Meta -> oauth/callback ->
// sealTokenBundle()), which is the only place a real access token is issued and stored. Using the
// JS SDK's own short-lived client-side token for that would be a real security downgrade -- it's
// exposed to the browser and bypasses the token vault every other connector in this codebase uses.
export type FacebookLoginStatus = "connected" | "not_authorized" | "unknown" | "unavailable";

type FbStatusResponse = {
  status: FacebookLoginStatus;
  authResponse?: { userID?: string } | null;
};

declare global {
  interface Window {
    FB?: {
      getLoginStatus: (callback: (response: FbStatusResponse) => void) => void;
      Event: {
        subscribe: (event: string, callback: (response: FbStatusResponse) => void) => void;
        unsubscribe: (event: string, callback: (response: FbStatusResponse) => void) => void;
      };
    };
  }
}

export function useFacebookLoginStatus() {
  const [status, setStatus] = useState<FacebookLoginStatus>("unavailable");

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    const handleStatusChange = (response: FbStatusResponse) => {
      if (!cancelled) setStatus(response.status);
    };

    // The SDK script (layout.tsx) loads asynchronously and may not be attached to window yet on
    // first render -- poll briefly rather than assuming a single check is enough.
    let attempts = 0;
    const poll = window.setInterval(() => {
      attempts += 1;
      if (window.FB) {
        window.clearInterval(poll);
        window.FB.getLoginStatus(handleStatusChange);
        window.FB.Event.subscribe("auth.statusChange", handleStatusChange);
      } else if (attempts >= 20) {
        // ~10s: SDK never loaded (NEXT_PUBLIC_META_APP_ID unset, or the connect.facebook.net
        // request failed) -- stop polling and leave status as "unavailable" rather than spin forever.
        window.clearInterval(poll);
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      if (window.FB) window.FB.Event.unsubscribe("auth.statusChange", handleStatusChange);
    };
  }, []);

  return status;
}
