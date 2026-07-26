import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "scc_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSigningSecret(): string {
  const secret = process.env.ACCESS_CODE;
  if (!secret) {
    throw new Error("ACCESS_CODE is not configured on the server.");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSigningSecret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/** A session token is an expiry timestamp plus an HMAC signature over it. */
export function createSessionToken(): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload)}`;
}

export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex <= 0) return false;

  const payload = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);

  let expectedSignature: string;
  try {
    expectedSignature = sign(payload);
  } catch {
    return false;
  }
  if (!safeEqual(signature, expectedSignature)) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

/**
 * Verifies a submitted access code against the configured one. Never reveals
 * whether a code is configured at all — an unconfigured code just never matches.
 */
export function verifyAccessCode(submittedCode: string): boolean {
  const configuredCode = process.env.ACCESS_CODE;
  if (!configuredCode) return false;
  return safeEqual(submittedCode, configuredCode);
}

export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;
