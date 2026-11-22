import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isLocalDevMode } from './adminAuth';
import { validateContentSnapshot, type ContentSnapshot } from './adminValidation';
import type { BackdropOption, MoodOption, PoseOption, PromptPack, PropOption } from './types';

export type StorageMode = 'github' | 'local' | 'unconfigured';

export interface StorageStatus {
  mode: StorageMode;
  owner: string;
  repo: string;
  branch: string;
  missingVars: string[];
}

export interface LoadedAdminData {
  snapshot: ContentSnapshot;
  existingAssets: string[];
  headSha: string;
  storage: StorageStatus;
}

export interface UploadedBlobRef {
  repoPath: string; // e.g. "public/assets/library/props/cat-ears.png"
  assetUrl: string; // e.g. "/assets/library/props/cat-ears.png"
  sha: string;
}

export interface PublishPayload {
  snapshot: ContentSnapshot;
  uploadedBlobs: UploadedBlobRef[];
  deletedAssetUrls: string[];
  commitMessage?: string;
}

const SAFE_ASSET_REPO_PATH_RE =
  /^public\/assets\/(?:packs|library)\/[a-z0-9][a-z0-9/_-]*\.(?:png|jpg|jpeg|webp)$/;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

// Holds local-dev staged binary uploads in memory until Publish is clicked.
const localBlobStage = new Map<string, Buffer>();

function getEnv(name: string): string | undefined {
  const fromProcess = typeof process !== 'undefined' ? process.env[name] : undefined;
  const fromMeta = (import.meta.env as Record<string, string | undefined>)[name];
  const val = fromProcess ?? fromMeta;
  return val && val.trim().length > 0 ? val.trim() : undefined;
}

export function getStorageStatus(): StorageStatus {
  const owner = getEnv('GITHUB_OWNER') ?? 'synthfoundry-coder';
  const repo = getEnv('GITHUB_REPO') ?? 'gamseong-photo-booth';
  const branch = getEnv('GITHUB_BRANCH') ?? 'main';
  const token = getEnv('GITHUB_TOKEN');

  if (token) {
    return { mode: 'github', owner, repo, branch, missingVars: [] };
  }
  if (isLocalDevMode()) {
    return { mode: 'local', owner, repo, branch, missingVars: [] };
  }
  return { mode: 'unconfigured', owner, repo, branch, missingVars: ['GITHUB_TOKEN'] };
}

export function assertSafeAssetRepoPath(repoPath: string): void {
  if (repoPath.includes('..') || !SAFE_ASSET_REPO_PATH_RE.test(repoPath)) {
    throw new Error(
      `Invalid asset path "${repoPath}". Must stay inside public/assets/packs/ or public/assets/library/ with lowercase names.`
    );
  }
}

export function assetUrlToRepoPath(assetUrl: string): string {
  const trimmed = assetUrl.startsWith('/') ? assetUrl.slice(1) : assetUrl;
  return `public/${trimmed}`;
}

export function repoPathToAssetUrl(repoPath: string): string {
  return repoPath.startsWith('public/') ? `/${repoPath.slice('public/'.length)}` : `/${repoPath}`;
}

async function ghRequest<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const token = getEnv('GITHUB_TOKEN');
  if (!token) throw new Error('GITHUB_TOKEN is not configured.');

  const res = await fetch(`https://api.github.com${endpoint}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status} on ${endpoint}: ${text.slice(0, 260)}`);
  }
  return (await res.json()) as T;
}

function listLocalAssetsRecursive(baseDir: string, prefix = '/assets'): string[] {
  if (!fs.existsSync(baseDir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
    const full = path.join(baseDir, entry.name);
    const nextUrl = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      results.push(...listLocalAssetsRecursive(full, nextUrl));
    } else if (entry.isFile()) {
      results.push(nextUrl);
    }
  }
  return results.sort();
}

function readLocalSnapshot(storage: StorageStatus): LoadedAdminData {
  const root = process.cwd();
  const libDir = path.join(root, 'content', 'library');
  const readJson = <T,>(filePath: string): T => JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;

  const props = readJson<PropOption[]>(path.join(libDir, 'props.json'));
  const backdrops = readJson<BackdropOption[]>(path.join(libDir, 'backdrops.json'));
  const poses = readJson<PoseOption[]>(path.join(libDir, 'poses.json'));
  const moods = readJson<MoodOption[]>(path.join(libDir, 'moods.json'));

  const packsDir = path.join(root, 'content', 'packs');
  const packs: PromptPack[] = [];
  if (fs.existsSync(packsDir)) {
    for (const entry of fs.readdirSync(packsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const packJson = path.join(packsDir, entry.name, 'pack.json');
      if (fs.existsSync(packJson)) {
        packs.push(readJson<PromptPack>(packJson));
      }
    }
  }
  packs.sort((a, b) => a.title.localeCompare(b.title));

  const existingAssets = listLocalAssetsRecursive(path.join(root, 'public', 'assets'));
  return {
    snapshot: { packs, props, backdrops, poses, moods },
    existingAssets,
    headSha: 'local-workspace',
    storage,
  };
}

interface GhRefResponse {
  object: { sha: string };
}

interface GhCommitResponse {
  sha: string;
  tree: { sha: string };
  html_url?: string;
}

interface GhTreeResponse {
  sha: string;
  tree: Array<{ path: string; type: string; sha: string }>;
}

interface GhBlobResponse {
  sha: string;
  content: string;
  encoding: string;
}

async function readGithubSnapshot(storage: StorageStatus): Promise<LoadedAdminData> {
  const { owner, repo, branch } = storage;
  const ref = await ghRequest<GhRefResponse>(
    `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`
  );
  const headSha = ref.object.sha;
  const commit = await ghRequest<GhCommitResponse>(
    `/repos/${owner}/${repo}/git/commits/${headSha}`
  );
  const treeRes = await ghRequest<GhTreeResponse>(
    `/repos/${owner}/${repo}/git/trees/${commit.tree.sha}?recursive=1`
  );

  const blobEntries = treeRes.tree.filter((item) => item.type === 'blob');
  const byPath = new Map(blobEntries.map((item) => [item.path, item.sha]));

  const fetchJsonBlob = async <T,>(repoPath: string): Promise<T> => {
    const sha = byPath.get(repoPath);
    if (!sha) throw new Error(`Missing required repository file: ${repoPath}`);
    const blob = await ghRequest<GhBlobResponse>(`/repos/${owner}/${repo}/git/blobs/${sha}`);
    const raw = Buffer.from(blob.content.replace(/\n/g, ''), 'base64').toString('utf8');
    return JSON.parse(raw) as T;
  };

  const packPaths = blobEntries
    .map((item) => item.path)
    .filter((p) => /^content\/packs\/[^/]+\/pack\.json$/.test(p))
    .sort();

  const [props, backdrops, poses, moods, ...packs] = await Promise.all([
    fetchJsonBlob<PropOption[]>('content/library/props.json'),
    fetchJsonBlob<BackdropOption[]>('content/library/backdrops.json'),
    fetchJsonBlob<PoseOption[]>('content/library/poses.json'),
    fetchJsonBlob<MoodOption[]>('content/library/moods.json'),
    ...packPaths.map((p) => fetchJsonBlob<PromptPack>(p)),
  ]);

  packs.sort((a, b) => a.title.localeCompare(b.title));

  const existingAssets = blobEntries
    .map((item) => item.path)
    .filter((p) => p.startsWith('public/assets/'))
    .map(repoPathToAssetUrl)
    .sort();

  return {
    snapshot: { packs, props, backdrops, poses, moods },
    existingAssets,
    headSha,
    storage,
  };
}

export async function readAdminSnapshot(): Promise<LoadedAdminData> {
  const storage = getStorageStatus();
  if (storage.mode === 'github') return readGithubSnapshot(storage);
  if (storage.mode === 'local') return readLocalSnapshot(storage);
  throw new Error('GITHUB_TOKEN is not configured in Vercel environment variables.');
}

export async function uploadAdminBlob(
  repoPath: string,
  base64Content: string
): Promise<UploadedBlobRef> {
  assertSafeAssetRepoPath(repoPath);
  const cleaned = base64Content.replace(/^data:[^;]+;base64,/, '').trim();
  const buffer = Buffer.from(cleaned, 'base64');
  if (buffer.byteLength === 0) {
    throw new Error('Uploaded image is empty.');
  }
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error('Uploaded image exceeds the 4 MB single-file limit.');
  }

  const storage = getStorageStatus();
  const assetUrl = repoPathToAssetUrl(repoPath);

  if (storage.mode === 'local') {
    const sha = `local-${crypto.createHash('sha1').update(buffer).digest('hex')}`;
    localBlobStage.set(sha, buffer);
    return { repoPath, assetUrl, sha };
  }

  if (storage.mode === 'github') {
    const created = await ghRequest<{ sha: string }>(
      `/repos/${storage.owner}/${storage.repo}/git/blobs`,
      {
        method: 'POST',
        body: JSON.stringify({ content: cleaned, encoding: 'base64' }),
      }
    );
    return { repoPath, assetUrl, sha: created.sha };
  }

  throw new Error('GITHUB_TOKEN is not configured.');
}

function formatJson(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

export async function publishAdminSnapshot(payload: PublishPayload): Promise<{
  mode: StorageMode;
  commitSha: string;
  commitUrl: string | null;
  warnings: string[];
}> {
  const storage = getStorageStatus();
  if (storage.mode === 'unconfigured') {
    throw new Error('GITHUB_TOKEN is not configured in Vercel environment variables.');
  }

  for (const blob of payload.uploadedBlobs) {
    assertSafeAssetRepoPath(blob.repoPath);
  }
  const deletedRepoPaths = payload.deletedAssetUrls.map((url) => {
    const rp = assetUrlToRepoPath(url);
    assertSafeAssetRepoPath(rp);
    return rp;
  });

  const current = await readAdminSnapshot();
  const existingAssetSet = new Set(current.existingAssets);
  for (const url of payload.deletedAssetUrls) existingAssetSet.delete(url);
  for (const blob of payload.uploadedBlobs) existingAssetSet.add(blob.assetUrl);

  const report = validateContentSnapshot(payload.snapshot, (url) => existingAssetSet.has(url));
  if (report.errors.length > 0) {
    throw new Error(`Validation failed: ${report.errors.join(' | ')}`);
  }

  const commitMessage =
    (payload.commitMessage ?? '').trim() || 'Update prompt packs and booth library via Admin Studio';

  if (storage.mode === 'local') {
    const root = process.cwd();
    const libDir = path.join(root, 'content', 'library');
    fs.mkdirSync(libDir, { recursive: true });
    fs.writeFileSync(path.join(libDir, 'props.json'), formatJson(payload.snapshot.props));
    fs.writeFileSync(path.join(libDir, 'backdrops.json'), formatJson(payload.snapshot.backdrops));
    fs.writeFileSync(path.join(libDir, 'poses.json'), formatJson(payload.snapshot.poses));
    fs.writeFileSync(path.join(libDir, 'moods.json'), formatJson(payload.snapshot.moods));

    const nextSlugs = new Set(payload.snapshot.packs.map((p) => p.slug));
    for (const oldPack of current.snapshot.packs) {
      if (!nextSlugs.has(oldPack.slug)) {
        const oldDir = path.join(root, 'content', 'packs', oldPack.slug);
        if (fs.existsSync(oldDir)) {
          fs.rmSync(oldDir, { recursive: true, force: true });
        }
      }
    }

    for (const pack of payload.snapshot.packs) {
      const packDir = path.join(root, 'content', 'packs', pack.slug);
      fs.mkdirSync(packDir, { recursive: true });
      fs.writeFileSync(path.join(packDir, 'pack.json'), formatJson(pack));
    }

    for (const rp of deletedRepoPaths) {
      const abs = path.join(root, rp);
      if (fs.existsSync(abs)) fs.rmSync(abs, { force: true });
    }

    for (const blob of payload.uploadedBlobs) {
      const buf = localBlobStage.get(blob.sha);
      if (!buf) {
        throw new Error(`Staged local image for ${blob.repoPath} expired. Re-select the image and publish again.`);
      }
      const abs = path.join(root, blob.repoPath);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, buf);
      localBlobStage.delete(blob.sha);
    }

    return {
      mode: 'local',
      commitSha: 'local-workspace',
      commitUrl: null,
      warnings: report.warnings,
    };
  }

  // GitHub mode: create one atomic multi-file commit via Git Trees API.
  const { owner, repo, branch } = storage;
  const ref = await ghRequest<GhRefResponse>(
    `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`
  );
  const latestHeadSha = ref.object.sha;
  const headCommit = await ghRequest<GhCommitResponse>(
    `/repos/${owner}/${repo}/git/commits/${latestHeadSha}`
  );

  type TreeEntry =
    | { path: string; mode: '100644'; type: 'blob'; content: string }
    | { path: string; mode: '100644'; type: 'blob'; sha: string | null };

  const treeEntries: TreeEntry[] = [
    { path: 'content/library/props.json', mode: '100644', type: 'blob', content: formatJson(payload.snapshot.props) },
    { path: 'content/library/backdrops.json', mode: '100644', type: 'blob', content: formatJson(payload.snapshot.backdrops) },
    { path: 'content/library/poses.json', mode: '100644', type: 'blob', content: formatJson(payload.snapshot.poses) },
    { path: 'content/library/moods.json', mode: '100644', type: 'blob', content: formatJson(payload.snapshot.moods) },
  ];

  const nextSlugs = new Set(payload.snapshot.packs.map((p) => p.slug));
  for (const oldPack of current.snapshot.packs) {
    if (!nextSlugs.has(oldPack.slug)) {
      treeEntries.push({
        path: `content/packs/${oldPack.slug}/pack.json`,
        mode: '100644',
        type: 'blob',
        sha: null,
      });
    }
  }

  for (const pack of payload.snapshot.packs) {
    treeEntries.push({
      path: `content/packs/${pack.slug}/pack.json`,
      mode: '100644',
      type: 'blob',
      content: formatJson(pack),
    });
  }

  const uploadedPathSet = new Set(payload.uploadedBlobs.map((b) => b.repoPath));
  for (const rp of deletedRepoPaths) {
    if (!uploadedPathSet.has(rp)) {
      treeEntries.push({ path: rp, mode: '100644', type: 'blob', sha: null });
    }
  }

  for (const blob of payload.uploadedBlobs) {
    treeEntries.push({
      path: blob.repoPath,
      mode: '100644',
      type: 'blob',
      sha: blob.sha,
    });
  }

  const newTree = await ghRequest<{ sha: string }>(`/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: headCommit.tree.sha,
      tree: treeEntries,
    }),
  });

  const createdCommit = await ghRequest<GhCommitResponse>(`/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({
      message: commitMessage,
      tree: newTree.sha,
      parents: [latestHeadSha],
    }),
  });

  await ghRequest(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: createdCommit.sha, force: false }),
  });

  return {
    mode: 'github',
    commitSha: createdCommit.sha,
    commitUrl: `https://github.com/${owner}/${repo}/commit/${createdCommit.sha}`,
    warnings: report.warnings,
  };
}
