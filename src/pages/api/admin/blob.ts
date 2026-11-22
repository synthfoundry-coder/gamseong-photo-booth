import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../lib/adminAuth';
import { uploadAdminBlob } from '../../../lib/adminGithub';

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
  if (!isAuthenticated(cookies)) {
    return json({ error: 'Unauthorized. Sign in as admin first.' }, 401);
  }

  try {
    const body = (await request.json()) as { repoPath?: unknown; base64?: unknown };
    if (typeof body.repoPath !== 'string' || typeof body.base64 !== 'string') {
      return json({ error: 'Expected repoPath and base64 strings.' }, 400);
    }

    const blob = await uploadAdminBlob(body.repoPath, body.base64);
    return json(blob);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to upload image blob.';
    return json({ error: msg }, 400);
  }
};
