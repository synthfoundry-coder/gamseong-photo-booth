import type { APIRoute } from 'astro';
import {
  checkLoginRateLimit,
  clearFailedLogins,
  createSessionToken,
  getAuthConfigStatus,
  getClientIp,
  recordFailedLogin,
  setSessionCookie,
  verifyAdminPassword,
} from '../../../lib/adminAuth';

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const config = getAuthConfigStatus();
  if (!config.configured) {
    return json(
      {
        error: `Admin login is not configured yet. Add ${config.missingVars.join(', ')} in Vercel Environment Variables.`,
      },
      503
    );
  }

  const clientIp = getClientIp(request);
  const limit = checkLoginRateLimit(clientIp);
  if (!limit.allowed) {
    return json(
      {
        error: `Too many failed attempts. Wait ${Math.ceil(limit.retryAfterSec / 60)} minute(s) before trying again.`,
      },
      429
    );
  }

  let password = '';
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return json({ error: 'Invalid JSON request body.' }, 400);
  }

  if (!verifyAdminPassword(password)) {
    recordFailedLogin(clientIp);
    return json({ error: 'Incorrect admin password. Check your password and try again.' }, 401);
  }

  const token = createSessionToken();
  if (!token) {
    return json({ error: 'Session secret is unavailable on the server.' }, 500);
  }

  clearFailedLogins(clientIp);
  setSessionCookie(cookies, token);
  return json({ ok: true });
};
