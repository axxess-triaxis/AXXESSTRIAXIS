import { createHmac, timingSafeEqual } from "node:crypto";

function secretBytes(secret: string) {
  if (!secret.startsWith("whsec_")) return Buffer.from(secret);
  return Buffer.from(secret.replace(/^whsec_/, ""), "base64");
}

function signatureCandidates(signatureHeader: string) {
  return signatureHeader
    .split(" ")
    .flatMap((chunk) => chunk.split(","))
    .map((chunk) => chunk.trim().replace(/^v1,/, "").replace(/^v1=/, ""))
    .filter(Boolean);
}

function isRecentSvixTimestamp(timestamp: string, now = Date.now()) {
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds)) return false;
  return Math.abs(now - seconds * 1000) <= 1000 * 60 * 5;
}

export function verifyResendWebhookSignature(rawBody: string, headers: Headers, secret = process.env.RESEND_WEBHOOK_SECRET) {
  if (!secret) return false;
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) return false;
  if (!isRecentSvixTimestamp(svixTimestamp)) return false;

  const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes(secret)).update(signedPayload).digest("base64");
  const expectedBuffer = Buffer.from(expected);
  return signatureCandidates(svixSignature).some((candidate) => {
    const candidateBuffer = Buffer.from(candidate);
    return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
  });
}
