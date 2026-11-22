import type { APIRoute } from 'astro';
import { getAuthConfigStatus, isAuthenticated } from '../../../lib/adminAuth';
import { getStorageStatus } from '../../../lib/adminGithub';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const authenticated = isAuthenticated(cookies);
  const authConfig = getAuthConfigStatus();
  const storage = getStorageStatus();

  return new Response(
    JSON.stringify({
      authenticated,
      authConfig,
      storage: {
        mode: storage.mode,
        repoLabel: `${storage.owner}/${storage.repo}`,
        branch: storage.branch,
        missingVars: storage.missingVars,
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  );
};
