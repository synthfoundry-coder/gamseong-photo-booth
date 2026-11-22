import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  validateContentSnapshot,
  type ContentSnapshot,
} from '../../lib/adminValidation';
import { attachLightDismissFallback } from '../../lib/dialogFallback';
import { useFormValidationSync } from '../../lib/formValidationSync';
import {
  CheckIcon,
  CloseIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  FilmStripIcon,
  LockIcon,
  LogOutIcon,
  ResetIcon,
  UploadIcon,
} from '../Icons';
import ThemeSwitcher from '../ThemeSwitcher';
import LibraryManager from './LibraryManager';
import PackManager from './PackManager';
import type { AdminSessionInfo, StagedImageUpload } from './adminTypes';

type AdminSection = 'packs' | 'library';

export default function AdminApp() {
  const [session, setSession] = useState<AdminSessionInfo | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [section, setSection] = useState<AdminSection>('packs');
  const [baseSnapshot, setBaseSnapshot] = useState<ContentSnapshot | null>(null);
  const [draftSnapshot, setDraftSnapshot] = useState<ContentSnapshot | null>(null);
  const [existingAssets, setExistingAssets] = useState<string[]>([]);
  const [stagedUploads, setStagedUploads] = useState<Record<string, StagedImageUpload>>({});
  const [deletedAssets, setDeletedAssets] = useState<string[]>([]);

  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  const [commitMessage, setCommitMessage] = useState('Update prompt packs via Admin Studio');
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishStep, setPublishStep] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<{
    mode: string;
    commitSha: string;
    commitUrl: string | null;
  } | null>(null);

  const [announcement, setAnnouncement] = useState('');

  const loginFormRef = useRef<HTMLFormElement>(null);
  const publishDialogRef = useRef<HTMLDialogElement>(null);

  const announce = useCallback((msg: string) => {
    setAnnouncement('');
    requestAnimationFrame(() => setAnnouncement(msg));
  }, []);

  useFormValidationSync(loginFormRef, announce);

  useEffect(() => {
    const dialog = publishDialogRef.current;
    if (!dialog) return;
    return attachLightDismissFallback(dialog);
  }, []);

  const loadContent = useCallback(async () => {
    setContentLoading(true);
    setContentError(null);
    try {
      const res = await fetch('/api/admin/content', { cache: 'no-store' });
      const data = (await res.json()) as {
        snapshot?: ContentSnapshot;
        existingAssets?: string[];
        error?: string;
      };
      if (!res.ok || !data.snapshot) {
        throw new Error(data.error ?? `Failed to load content (${res.status}).`);
      }
      setBaseSnapshot(data.snapshot);
      setDraftSnapshot(structuredClone(data.snapshot));
      setExistingAssets(data.existingAssets ?? []);
      setStagedUploads({});
      setDeletedAssets([]);
    } catch (err) {
      setContentError(err instanceof Error ? err.message : 'Could not load admin content.');
    } finally {
      setContentLoading(false);
    }
  }, []);

  const checkSession = useCallback(async () => {
    setSessionLoading(true);
    setSessionError(null);
    try {
      const res = await fetch('/api/admin/session', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Session check failed (${res.status})`);
      const data = (await res.json()) as AdminSessionInfo;
      setSession(data);
      if (data.authenticated) {
        await loadContent();
      }
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Could not check admin session.');
    } finally {
      setSessionLoading(false);
    }
  }, [loadContent]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError(null);
    setLoginBusy(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? 'Sign-in failed.');
      }
      setPassword('');
      announce('Signed in to Admin Studio.');
      await checkSession();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed.';
      setLoginError(msg);
      announce(msg);
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setBaseSnapshot(null);
    setDraftSnapshot(null);
    setStagedUploads({});
    setDeletedAssets([]);
    setPublishSuccess(null);
    announce('Signed out of Admin Studio.');
    await checkSession();
  }

  const handleUpdateSnapshot = useCallback(
    (updater: (prev: ContentSnapshot) => ContentSnapshot) => {
      setDraftSnapshot((prev) => (prev ? updater(prev) : prev));
      setPublishSuccess(null);
    },
    []
  );

  const handleStageUpload = useCallback((upload: StagedImageUpload) => {
    setStagedUploads((prev) => ({ ...prev, [upload.assetUrl]: upload }));
    setDeletedAssets((prev) => prev.filter((url) => url !== upload.assetUrl));
    setPublishSuccess(null);
  }, []);

  const handleQueueAssetDelete = useCallback((assetUrl: string) => {
    setStagedUploads((prev) => {
      if (!(assetUrl in prev)) return prev;
      const copy = { ...prev };
      delete copy[assetUrl];
      return copy;
    });
    setDeletedAssets((prev) => (prev.includes(assetUrl) ? prev : [...prev, assetUrl]));
    setPublishSuccess(null);
  }, []);

  const hasJsonChanges = useMemo(() => {
    if (!baseSnapshot || !draftSnapshot) return false;
    return JSON.stringify(baseSnapshot) !== JSON.stringify(draftSnapshot);
  }, [baseSnapshot, draftSnapshot]);

  const stagedUploadList = useMemo(() => Object.values(stagedUploads), [stagedUploads]);
  const hasPendingChanges =
    hasJsonChanges || stagedUploadList.length > 0 || deletedAssets.length > 0;

  const validation = useMemo(() => {
    if (!draftSnapshot) return { errors: [], warnings: [] };
    const available = new Set(existingAssets);
    for (const del of deletedAssets) available.delete(del);
    for (const up of stagedUploadList) available.add(up.assetUrl);
    return validateContentSnapshot(draftSnapshot, (url) => available.has(url));
  }, [draftSnapshot, existingAssets, deletedAssets, stagedUploadList]);

  function handleDiscard() {
    if (!baseSnapshot) return;
    setDraftSnapshot(structuredClone(baseSnapshot));
    setStagedUploads({});
    setDeletedAssets([]);
    setPublishError(null);
    setPublishSuccess(null);
    announce('Discarded all staged changes.');
  }

  async function handlePublish() {
    if (!draftSnapshot || validation.errors.length > 0) return;
    setPublishBusy(true);
    setPublishError(null);
    setPublishStep(null);

    try {
      const uploadedBlobs: Array<{ repoPath: string; assetUrl: string; sha: string }> = [];

      // Upload each staged image individually to avoid Vercel's 4.5MB request payload cap.
      for (let i = 0; i < stagedUploadList.length; i++) {
        const item = stagedUploadList[i];
        setPublishStep(`Uploading image ${i + 1} of ${stagedUploadList.length} (${item.assetUrl})...`);
        const blobRes = await fetch('/api/admin/blob', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoPath: item.repoPath, base64: item.base64 }),
        });
        const blobData = (await blobRes.json()) as {
          repoPath?: string;
          assetUrl?: string;
          sha?: string;
          error?: string;
        };
        if (!blobRes.ok || !blobData.sha) {
          throw new Error(blobData.error ?? `Failed uploading ${item.assetUrl}`);
        }
        uploadedBlobs.push({
          repoPath: blobData.repoPath!,
          assetUrl: blobData.assetUrl!,
          sha: blobData.sha,
        });
      }

      setPublishStep(
        session?.storage.mode === 'github'
          ? 'Creating atomic GitHub commit...'
          : 'Saving changes to local workspace...'
      );

      const pubRes = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshot: draftSnapshot,
          uploadedBlobs,
          deletedAssetUrls: deletedAssets,
          commitMessage: commitMessage.trim() || 'Update prompt packs via Admin Studio',
        }),
      });
      const pubData = (await pubRes.json()) as {
        mode?: string;
        commitSha?: string;
        commitUrl?: string | null;
        error?: string;
      };
      if (!pubRes.ok || !pubData.commitSha) {
        throw new Error(pubData.error ?? 'Publish request failed.');
      }

      setPublishSuccess({
        mode: pubData.mode ?? 'github',
        commitSha: pubData.commitSha,
        commitUrl: pubData.commitUrl ?? null,
      });
      publishDialogRef.current?.close();
      announce('Changes published successfully.');
      await loadContent();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Publish failed.';
      setPublishError(msg);
      announce(`Publish failed: ${msg}`);
    } finally {
      setPublishBusy(false);
      setPublishStep(null);
    }
  }

  // 1. Initial Session Loading State
  if (sessionLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-[20px] border-2 border-[var(--ink)] bg-[var(--surface)] p-8">
          <p className="font-[var(--font-display)] text-lg font-extrabold">
            Checking admin session...
          </p>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Connecting to the studio endpoint.
          </p>
        </div>
      </div>
    );
  }

  // 2. Session Connection Error State
  if (sessionError || !session) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-[20px] border-2 border-[var(--error-text)] bg-[var(--surface)] p-6">
          <h1 className="text-xl font-extrabold text-[var(--error-text)]">
            Could not reach Admin API
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            {sessionError ?? 'Unexpected server response.'}
          </p>
          <button type="button" onClick={checkSession} className="btn-booth mt-5">
            Retry connection
          </button>
        </div>
      </div>
    );
  }

  // 3. Password Sign-In Screen (placed high in viewport so mobile keyboard never obstructs CTA)
  if (!session.authenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </div>

        <div className="rounded-[20px] border-2 border-[var(--ink)] bg-[var(--surface)] p-6 shadow-[4px_4px_0_var(--ink)] sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--accent)] text-[var(--on-accent)]">
                <LockIcon className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-extrabold leading-tight">Admin Studio</h1>
                <p className="text-xs font-semibold text-[var(--ink-muted)]">
                  GAMSEONG PHOTO · <span className="inline-block break-keep">관리자</span>
                </p>
              </div>
            </div>
            <ThemeSwitcher />
          </div>

          {!session.authConfig.configured ? (
            <div className="mt-6 rounded-xl border-2 border-[var(--error-text)] bg-[var(--error-bg)] p-4 text-sm text-[var(--error-text)]">
              <p className="font-extrabold">Environment setup required on Vercel</p>
              <p className="mt-1">
                Add these environment variables in your Vercel Project Settings, then redeploy:
              </p>
              <ul className="mt-2 list-disc pl-5 font-mono text-xs font-bold">
                {session.authConfig.missingVars.map((v) => (
                  <li key={v}>{v}</li>
                ))}
                {session.storage.missingVars.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </div>
          ) : (
            <form ref={loginFormRef} onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label htmlFor="admin-password" className="block text-sm font-bold text-[var(--ink)]">
                  Admin Password
                </label>
                <span id="password-hint" className="mb-1.5 block text-xs text-[var(--ink-muted)]">
                  {session.authConfig.usingDevFallbackPassword
                    ? 'Local dev mode active. Default password is dev-admin (or set ADMIN_PASSWORD in .env).'
                    : 'Enter the ADMIN_PASSWORD configured in your Vercel project.'}
                </span>

                <div className="flex items-stretch gap-2">
                  <input
                    id="admin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    enterKeyHint="done"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-describedby="password-hint"
                    data-error="admin-password-error"
                    className="admin-input flex-1"
                    placeholder="Enter admin password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border-2 border-[var(--border-control)] bg-[var(--bg)] text-[var(--ink)] hover:border-[var(--ink)]"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <span id="admin-password-error" className="field-error-msg">
                  Enter your admin password to sign in.
                </span>
              </div>

              {loginError && (
                <p
                  role="alert"
                  className="rounded-xl border-2 border-[var(--error-text)] bg-[var(--error-bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--error-text)]"
                >
                  {loginError}
                </p>
              )}

              <button type="submit" disabled={loginBusy} className="btn-booth w-full">
                {loginBusy ? 'Signing in...' : 'Sign in to Admin Studio'}
              </button>
            </form>
          )}

          <div className="mt-6 border-t-2 border-[var(--border-subtle)] pt-4 text-center">
            <a
              href="/"
              className="inline-flex min-h-[44px] items-center text-sm font-bold text-[var(--ink-muted)] underline-offset-4 hover:text-[var(--ink)] hover:underline"
            >
              Return to public prompt packs
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authenticated Admin Studio Shell
  const totalLibraryCount = draftSnapshot
    ? draftSnapshot.props.length +
      draftSnapshot.backdrops.length +
      draftSnapshot.poses.length +
      draftSnapshot.moods.length
    : 0;

  return (
    <div className="min-h-dvh pb-16">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Dedicated Admin Header Shell */}
      <header className="sticky top-0 z-30 border-b-2 border-[var(--ink)] bg-[var(--bg)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl pr-1 text-[var(--ink)] no-underline"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--accent)] text-[var(--on-accent)]">
                <FilmStripIcon className="h-5 w-5" />
              </span>
              <span className="leading-tight">
                <span className="block font-[var(--font-display)] text-base font-extrabold">
                  ADMIN STUDIO
                </span>
                <span className="block text-xs font-semibold text-[var(--ink-muted)]">
                  GAMSEONG PHOTO
                </span>
              </span>
            </a>

            <span className="hidden rounded-lg border border-[var(--border-control)] bg-[var(--surface)] px-2.5 py-1 font-mono text-xs font-bold text-[var(--ink-muted)] md:inline-block">
              {session.storage.mode === 'github'
                ? `GitHub: ${session.storage.repoLabel} (${session.storage.branch})`
                : session.storage.mode === 'local'
                  ? 'Local dev workspace'
                  : 'GITHUB_TOKEN missing'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="/"
              className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border-2 border-[var(--border-control)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--ink)] no-underline hover:border-[var(--ink)]"
            >
              <span>Public site</span>
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </a>

            <ThemeSwitcher />

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-bold text-[var(--ink)] hover:bg-[var(--surface-tint)]"
            >
              <LogOutIcon className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        {/* Top Workspace Title & Primary Section Switcher */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[clamp(1.65rem,3.4vw,2.35rem)] font-extrabold leading-tight">
              Manage Packs & Booth Assets
            </h1>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Stage edits across packs and shared library items, check validation, then publish one atomic update.
            </p>
          </div>

          <nav aria-label="Admin sections" className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSection('packs')}
              aria-pressed={section === 'packs'}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-extrabold transition-colors ${
                section === 'packs'
                  ? 'border-[var(--ink)] bg-[var(--accent)] text-[var(--on-accent)]'
                  : 'border-[var(--border-control)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--ink)]'
              }`}
            >
              <span>Prompt Packs</span>
              <span className="rounded-md bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs text-[var(--ink)] border border-[var(--ink)]">
                {draftSnapshot?.packs.length ?? 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSection('library')}
              aria-pressed={section === 'library'}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-extrabold transition-colors ${
                section === 'library'
                  ? 'border-[var(--ink)] bg-[var(--accent)] text-[var(--on-accent)]'
                  : 'border-[var(--border-control)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--ink)]'
              }`}
            >
              <span>Shared Library</span>
              <span className="rounded-md bg-[var(--surface)] px-1.5 py-0.5 font-mono text-xs text-[var(--ink)] border border-[var(--ink)]">
                {totalLibraryCount}
              </span>
            </button>
          </nav>
        </div>

        {/* Publish Success Banner */}
        {publishSuccess && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[var(--success-text)] bg-[var(--success-bg)] p-4 text-sm text-[var(--success-text)]">
            <div className="flex items-start gap-2.5">
              <CheckIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-extrabold">
                  {publishSuccess.mode === 'github'
                    ? 'Published atomic commit to GitHub. Vercel will rebuild in ~30 to 60 seconds.'
                    : 'Saved all changes directly to your local workspace files.'}
                </p>
                {publishSuccess.commitUrl && (
                  <a
                    href={publishSuccess.commitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs font-bold underline"
                  >
                    <span>View commit {publishSuccess.commitSha.slice(0, 7)}</span>
                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPublishSuccess(null)}
              aria-label="Dismiss publish notice"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--success-text)] bg-white text-[var(--success-text)]"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Pending Changes & Validation Staging Bar */}
        {draftSnapshot && (
          <div
            className={`mt-5 rounded-2xl border-2 p-4 ${
              validation.errors.length > 0
                ? 'border-[var(--error-text)] bg-[var(--error-bg)]'
                : hasPendingChanges
                  ? 'border-[var(--ink)] bg-[var(--surface-tint)]'
                  : 'border-[var(--border-subtle)] bg-[var(--surface)]'
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-extrabold text-[var(--ink)]">
                  {validation.errors.length > 0
                    ? `${validation.errors.length} validation issue(s) must be fixed before publishing`
                    : hasPendingChanges
                      ? 'Unpublished staged changes ready'
                      : 'All changes synced with repository'}
                </p>
                <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                  {hasPendingChanges
                    ? `${hasJsonChanges ? 'JSON updated · ' : ''}${stagedUploadList.length} image upload(s) · ${deletedAssets.length} file deletion(s)`
                    : 'Edit packs or shared library items below. Changes stay staged until you publish.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {hasPendingChanges && (
                  <button type="button" onClick={handleDiscard} className="btn-outline text-xs">
                    <ResetIcon className="h-4 w-4" />
                    <span>Discard</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={!hasPendingChanges || validation.errors.length > 0}
                  onClick={() => {
                    setPublishError(null);
                    publishDialogRef.current?.showModal();
                  }}
                  className="btn-booth text-xs"
                >
                  <UploadIcon className="h-4 w-4" />
                  <span>
                    {session.storage.mode === 'github' ? 'Review & Publish' : 'Review & Save locally'}
                  </span>
                </button>
              </div>
            </div>

            {validation.errors.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 border-t border-[var(--error-text)]/30 pt-3 pl-5 text-xs font-semibold text-[var(--error-text)]">
                {validation.errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Main Content Loading / Error / Workspace */}
        <div className="mt-6">
          {contentLoading ? (
            <div className="rounded-[20px] border-2 border-[var(--ink)] bg-[var(--surface)] p-10 text-center">
              <p className="font-[var(--font-display)] text-lg font-extrabold">
                Loading packs and shared library...
              </p>
            </div>
          ) : contentError ? (
            <div className="rounded-[20px] border-2 border-[var(--error-text)] bg-[var(--surface)] p-6">
              <h2 className="text-lg font-extrabold text-[var(--error-text)]">
                Could not load repository content
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">{contentError}</p>
              <button type="button" onClick={loadContent} className="btn-booth mt-4">
                Retry loading
              </button>
            </div>
          ) : draftSnapshot ? (
            section === 'packs' ? (
              <PackManager
                snapshot={draftSnapshot}
                stagedUploads={stagedUploads}
                onUpdateSnapshot={handleUpdateSnapshot}
                onStageUpload={handleStageUpload}
                onQueueAssetDelete={handleQueueAssetDelete}
                onAnnounce={announce}
              />
            ) : (
              <LibraryManager
                snapshot={draftSnapshot}
                stagedUploads={stagedUploads}
                onUpdateSnapshot={handleUpdateSnapshot}
                onStageUpload={handleStageUpload}
                onQueueAssetDelete={handleQueueAssetDelete}
                onAnnounce={announce}
              />
            )
          ) : null}
        </div>
      </main>

      {/* Atomic Publish Confirmation Modal Dialog */}
      <dialog
        ref={publishDialogRef}
        {...({ closedby: 'any' } as Record<string, string>)}
        aria-labelledby="publish-dialog-title"
        className="w-[min(94vw,540px)]"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 border-b-2 border-[var(--border-subtle)] pb-3">
            <h2 id="publish-dialog-title" className="text-lg font-extrabold">
              {session.storage.mode === 'github'
                ? 'Publish Atomic Commit to GitHub'
                : 'Save Staged Changes to Local Disk'}
            </h2>
            <button
              type="button"
              disabled={publishBusy}
              onClick={() => publishDialogRef.current?.close()}
              aria-label="Close publish confirmation"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)]"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg)] p-3.5 text-sm">
              <p className="font-bold text-[var(--ink)]">Summary of staged changes</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--ink-muted)]">
                <li>
                  {draftSnapshot?.packs.length ?? 0} prompt pack(s) and {totalLibraryCount} shared library item(s) validated with 0 errors.
                </li>
                <li>
                  {stagedUploadList.length} new or replaced image file(s) queued for upload
                  {stagedUploadList.length > 0 && (
                    <span>
                      {' '}
                      ({stagedUploadList.map((u) => `${u.assetUrl} (${Math.round(u.byteSize / 1024)} KB)`).join(', ')})
                    </span>
                  )}
                  .
                </li>
                {deletedAssets.length > 0 && (
                  <li>{deletedAssets.length} unused asset file(s) queued for removal.</li>
                )}
              </ul>
            </div>

            {validation.warnings.length > 0 && (
              <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--surface-tint)] p-3 text-xs text-[var(--ink)]">
                <p className="font-bold">Heads up (warnings only):</p>
                <ul className="mt-1 list-disc pl-4">
                  {validation.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {session.storage.mode === 'github' && (
              <div>
                <label htmlFor="commit-msg" className="block text-sm font-bold">
                  Commit Message
                </label>
                <input
                  id="commit-msg"
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="admin-input mt-1 text-sm"
                  placeholder="Add new 3-cut pack and update props"
                />
              </div>
            )}

            {publishStep && (
              <p className="rounded-xl border border-[var(--ink)] bg-[var(--surface-tint)] px-3.5 py-2.5 text-xs font-bold text-[var(--ink)]">
                {publishStep}
              </p>
            )}

            {publishError && (
              <p
                role="alert"
                className="rounded-xl border-2 border-[var(--error-text)] bg-[var(--error-bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--error-text)]"
              >
                {publishError}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t-2 border-[var(--border-subtle)] pt-4">
            <button
              type="button"
              disabled={publishBusy}
              onClick={() => publishDialogRef.current?.close()}
              className="btn-outline"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={publishBusy || validation.errors.length > 0}
              onClick={handlePublish}
              className="btn-booth"
            >
              <UploadIcon className="h-4 w-4" />
              <span>
                {publishBusy
                  ? 'Publishing...'
                  : session.storage.mode === 'github'
                    ? 'Publish to GitHub'
                    : 'Save to local files'}
              </span>
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
