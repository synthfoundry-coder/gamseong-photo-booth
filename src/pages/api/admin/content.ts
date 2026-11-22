import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../lib/adminAuth';
import { readAdminSnapshot } from '../../../lib/adminGithub';

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

export const GET: APIRoute = async ({ cookies }) => {
  if (!isAuthenticated(cookies)) {
    return json({ error: 'Unauthorized. Sign in as admin first.' }, 401);
  }

  try {
    const data = await readAdminSnapshot();
    return json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load content snapshot.';
    return json({ error: msg }, 500);
  }
};
