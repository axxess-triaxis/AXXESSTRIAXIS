"""Email dispatch — Resend integration for TriAxis Ventures.

When RESEND_API_KEY is empty (dev), sending is a no-op that logs the outgoing
message so the app keeps working locally without a real key.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Optional

import resend

logger = logging.getLogger(__name__)

_SENDER = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")


def _configure_client() -> bool:
    key = os.environ.get("RESEND_API_KEY", "").strip()
    if not key:
        return False
    resend.api_key = key
    return True


async def send_email(
    to: str,
    subject: str,
    html: str,
    text: Optional[str] = None,
    reply_to: Optional[str] = None,
) -> dict:
    """Send an email. Returns {"sent": bool, "id": str|None, "reason": str|None}."""
    configured = _configure_client()
    if not configured:
        logger.info(
            "[email:skipped-no-key] to=%s subject=%r reason=RESEND_API_KEY empty",
            to,
            subject,
        )
        return {"sent": False, "id": None, "reason": "no_api_key"}

    params: dict = {
        "from": _SENDER,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if text:
        params["text"] = text
    if reply_to:
        params["reply_to"] = reply_to

    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        email_id = result.get("id") if isinstance(result, dict) else None
        logger.info("[email:sent] to=%s id=%s", to, email_id)
        return {"sent": True, "id": email_id, "reason": None}
    except Exception as exc:  # pragma: no cover — third-party surface
        logger.exception("[email:failed] to=%s subject=%r", to, subject)
        return {"sent": False, "id": None, "reason": f"error:{exc}"}


def render_waitlist_confirmation(email: str, platform: str) -> tuple[str, str, str]:
    """Return (subject, html, text) for the waitlist confirmation email."""
    label = {"ios": "iOS", "android": "Android", "both": "iOS & Android"}.get(
        platform.lower(), "iOS & Android"
    )
    subject = "You're on the AXXESS early-access list."
    text = (
        "You're on the list.\n\n"
        f"We'll email you at {email} when AXXESS launches for {label} in July 2026.\n\n"
        "— Triaxis Ventures\n"
        "https://www.triaxisventures.com"
    )
    html = f"""
    <!doctype html>
    <html><body style="margin:0;padding:0;background:#FAFAF7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0A0A0A;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7;padding:48px 16px;">
        <tr><td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #E5E5DF;border-radius:6px;">
            <tr><td style="padding:36px 40px 8px 40px;">
              <div style="font-family:'Fraunces',Georgia,serif;font-size:14px;letter-spacing:0.14em;text-transform:uppercase;color:#73736F;">Triaxis Ventures</div>
              <h1 style="margin:14px 0 6px 0;font-family:'Fraunces',Georgia,serif;font-weight:400;font-size:34px;line-height:1.12;letter-spacing:-0.02em;">You&rsquo;re on the list.</h1>
              <p style="margin:16px 0 0 0;font-size:15.5px;line-height:1.55;color:#3f3f3d;">
                We&rsquo;ll email <strong>{email}</strong> when <strong>AXXESS</strong> launches for
                <strong>{label}</strong> in <strong>July 2026</strong>.
              </p>
            </td></tr>
            <tr><td style="padding:24px 40px 8px 40px;">
              <div style="font-family:ui-monospace,SFMono-Regular,monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#73736F;">What&rsquo;s next</div>
              <ul style="margin:10px 0 0 0;padding-left:18px;font-size:14.5px;line-height:1.65;color:#3f3f3d;">
                <li>Web enterprise beta is live at <a href="https://axxesstriaxis.vercel.app" style="color:#3B82F6;text-decoration:none;">axxesstriaxis.vercel.app</a>.</li>
                <li>You&rsquo;ll receive a private invite before public app launch.</li>
                <li>Nothing else. No newsletter. No spam.</li>
              </ul>
            </td></tr>
            <tr><td style="padding:28px 40px 36px 40px;">
              <a href="https://axxesstriaxis.vercel.app" style="display:inline-block;background:#0A0A0A;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:3px;font-size:14px;">Open the enterprise beta &rarr;</a>
            </td></tr>
            <tr><td style="padding:20px 40px 32px 40px;border-top:1px solid #E5E5DF;">
              <div style="font-size:12px;color:#73736F;line-height:1.6;">
                Sent by Triaxis Ventures &middot; Guwahati, Assam &middot; India<br/>
                You received this because you signed up for the AXXESS mobile early-access list. If this wasn&rsquo;t you, ignore this email &mdash; we won&rsquo;t contact you again.
              </div>
            </td></tr>
          </table>
          <div style="margin-top:16px;font-family:ui-monospace,SFMono-Regular,monospace;font-size:11px;color:#73736F;letter-spacing:0.14em;text-transform:uppercase;">Triaxis Ventures &middot; FY 2026&ndash;29</div>
        </td></tr>
      </table>
    </body></html>
    """
    return subject, html.strip(), text
