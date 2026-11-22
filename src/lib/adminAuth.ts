import crypto from 'node:crypto';
import type { AstroCookies } from 'astro';

const COOKIE_NAME = 'gamseong_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

interface RateEntry {
  count: number;
  resetAt: number;
}

const attemptStore = new Map<string, RateEntry>();

export function isLocalDevMode(): boolean {
  return Boolean(import.meta.env.DEV);
}

function getEnv(name: string): string | undefined {
  const fromProcess = typeof process !== 'undefined' ? process.env[name] : undefined;
  const fromMeta = (import.meta.env as Record<string, string | undefined>)[name];
  const val = fromProcess ?? fromMeta;
  return val && val.trim().length > 0 ? val.trim() : undefined;
}

export function getAuthConfigStatus(): {
  configured: boolean;
  usingDevFallbackPassword: boolean;
  missingVars: string[];
} {
  const password = getEnv('ADMIN_PASSWORD');
  const secret = getEnv('ADMIN_SESSION_SECRET');
  const dev = isLocalDevMode();

  if (password && secret) {
    return { configured: true, usingDevFallbackPassword: false, missingVars: [] };
  }
  if (dev) {
    return { configured: true, usingDevFallbackPassword: !password, missingVars: [] };
  }

  const missingVars: string[] = [];
  if (!password) missingVars.push('ADMIN_PASSWORD');
  if (!secret) missingVars.push('ADMIN_SESSION_SECRET');
  return { configured: false, usingDevFallbackPassword: false, missingVars };
}

function getEffectivePassword(): string | null {
  const envPass = getEnv('ADMIN_PASSWORD');
  if (envPass) return envPass;
  if (isLocalDevMode()) return 'dev-admin';
  return null;
}

function getSessionSecret(): string | null {
  const envSecret = getEnv('ADMIN_SESSION_SECRET');
  if (envSecret) return envSecret;
  if (isLocalDevMode()) return 'local-dev-ephemeral-session-secret-gamseong';
  return null;
}

function sha256(value: string): Buffer {
  return crypto.createHash('sha256').update(value, 'utf8').digest();
}

export function verifyAdminPassword(candidate: string): boolean {
  const expected = getEffectivePassword();
  if (!expected || !candidate) return false;
  return crypto.timingSafeEqual(sha256(candidate), sha256(expected));
}

export function checkLoginRateLimit(clientKey: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = attemptStore.get(clientKey);
  if (!entry || now > entry.resetAt) {
    return { allowed: true, retryAfterSec: 0 };
  }
  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function recordFailedLogin(clientKey: string): void {
  const now = Date.now();
  const entry = attemptStore.get(clientKey);
  if (!entry || now > entry.resetAt) {
    attemptStore.set(clientKey, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export function clearFailedLogins(clientKey: string): void {
  attemptStore.delete(clientKey);
}

function signPayload(payloadB64: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

export function createSessionToken(): string | null {
  const secret = getSessionSecret();
  if (!secret) return null;
  const payload = {
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = signPayload(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const secret = getSessionSecret();
  if (!secret) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, providedSig] = parts;
  const expectedSig = signPayload(payloadB64, secret);

  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      role?: string;
      exp?: number;
    };
    if (parsed.role !== 'admin') return false;
    if (typeof parsed.exp !== 'number' || parsed.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

export function isAuthenticated(cookies: AstroCookies): boolean {
  const token = cookies.get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export function setSessionCookie(cookies: AstroCookies, token: string): void {
  cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !isLocalDevMode(),
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(cookies: AstroCookies): void {
  cookies.delete(COOKIE_NAME, { path: '/' });
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'local';
}
