import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../lib/adminAuth';
import { publishAdminSnapshot, type PublishPayload } from '../../../lib/adminGithub';

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
    const payload = (await request.json()) as PublishPayload;
    if (!payload || !payload.snapshot || !Array.isArray(payload.uploadedBlobs)) {
      return json({ error: 'Invalid publish payload.' }, 400);
    }

    const result = await publishAdminSnapshot({
      snapshot: payload.snapshot,
      uploadedBlobs: payload.uploadedBlobs,
      deletedAssetUrls: Array.isArray(payload.deletedAssetUrls) ? payload.deletedAssetUrls : [],
      commitMessage: typeof payload.commitMessage === 'string' ? payload.commitMessage : undefined,
    });

    return json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to publish changes.';
    return json({ error: msg }, 400);
  }
};
