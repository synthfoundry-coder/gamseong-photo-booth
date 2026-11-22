import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  findUnresolvedPlaceholders,
  snapshotToLibraryData,
  type ContentSnapshot,
} from '../../lib/adminValidation';
import { attachLightDismissFallback } from '../../lib/dialogFallback';
import { optimizeImageFile, slugifyFilename } from '../../lib/imageOptimize';
import { compilePackPrompt } from '../../lib/template';
import type { CustomizerSelection, PackFormat, PromptPack, RequiredFile } from '../../lib/types';
import { CloseIcon, PlusIcon, TrashIcon, UploadIcon } from '../Icons';
import type { StagedImageUpload } from './adminTypes';

interface PackManagerProps {
  snapshot: ContentSnapshot;
  stagedUploads: Record<string, StagedImageUpload>;
  onUpdateSnapshot: (updater: (prev: ContentSnapshot) => ContentSnapshot) => void;
  onStageUpload: (upload: StagedImageUpload) => void;
  onQueueAssetDelete: (assetUrl: string) => void;
  onAnnounce: (msg: string) => void;
}

const FORMAT_PRESETS: Record<
  PackFormat,
  { formatLabel: string; formatLabelKo: string; cuts: number; aspectClass: PromptPack['aspectClass'] }
> = {
  '4-cut': { formatLabel: '4-Cut Strip', formatLabelKo: '네컷', cuts: 4, aspectClass: 'strip-tall' },
  '3-cut': { formatLabel: '3-Cut Strip', formatLabelKo: '세컷', cuts: 3, aspectClass: 'strip-tall' },
  '6-cut': { formatLabel: '6-Cut Grid', formatLabelKo: '여섯컷', cuts: 6, aspectClass: 'grid-2x2' },
  polaroid: { formatLabel: 'Single Polaroid', formatLabelKo: '폴라로이드', cuts: 1, aspectClass: 'polaroid' },
  'haru-2x2': { formatLabel: 'Haru Film 2x2', formatLabelKo: '하루필름', cuts: 4, aspectClass: 'grid-2x2' },
};

const DEFAULT_TEMPLATE = `Create a realistic Korean photo booth strip.

Reference files attached:
{attachments.list}

Identity & framing:
- Keep the exact face, hair, and likeness of the person in Image 1 (my selfie).
- Follow the layout proportions from {file.strip-template}.

Styling & props:
- {props.sentence}

Backdrop & poses:
- Background behind the subject: {backdrop.full}.
- Poses: {pose.text}.

Lighting & finish:
- {mood.text}.`;

export default function PackManager({
  snapshot,
  stagedUploads,
  onUpdateSnapshot,
  onStageUpload,
  onQueueAssetDelete,
  onAnnounce,
}: PackManagerProps) {
  const [selectedSlug, setSelectedSlug] = useState<string>(snapshot.packs[0]?.slug ?? '');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [newPackTitle, setNewPackTitle] = useState('');
  const [newPackSlug, setNewPackSlug] = useState('');
  const [newPackFormat, setNewPackFormat] = useState<PackFormat>('4-cut');
  const [newPackError, setNewPackError] = useState<string | null>(null);

  const [testSelection, setTestSelection] = useState<CustomizerSelection | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const newPackDialogRef = useRef<HTMLDialogElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    if (newPackDialogRef.current) cleanups.push(attachLightDismissFallback(newPackDialogRef.current));
    if (deleteDialogRef.current) cleanups.push(attachLightDismissFallback(deleteDialogRef.current));
    return () => cleanups.forEach((fn) => fn());
  }, []);

  useEffect(() => {
    if (!snapshot.packs.some((p) => p.slug === selectedSlug)) {
      setSelectedSlug(snapshot.packs[0]?.slug ?? '');
    }
  }, [snapshot.packs, selectedSlug]);

  const activePack = snapshot.packs.find((p) => p.slug === selectedSlug) ?? null;
  const library = useMemo(() => snapshotToLibraryData(snapshot), [snapshot]);

  useEffect(() => {
    if (activePack) {
      setTestSelection(activePack.defaults);
    } else {
      setTestSelection(null);
    }
  }, [activePack?.slug]);

  function resolvePreviewSrc(assetUrl: string): string {
    return stagedUploads[assetUrl]?.dataUrl ?? assetUrl;
  }

  function updateActivePack(updater: (pack: PromptPack) => PromptPack) {
    if (!activePack) return;
    onUpdateSnapshot((prev) => ({
      ...prev,
      packs: prev.packs.map((p) => (p.slug === activePack.slug ? updater(p) : p)),
    }));
  }

  function handleCreatePack(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNewPackError(null);
    const title = newPackTitle.trim();
    const slug = slugifyFilename(newPackSlug || title);
    if (!title || !slug) {
      setNewPackError('Enter a pack title and valid lowercase slug.');
      return;
    }
    if (snapshot.packs.some((p) => p.slug === slug)) {
      setNewPackError(`A pack with slug "${slug}" already exists.`);
      return;
    }

    const preset = FORMAT_PRESETS[newPackFormat];
    const firstBackdrop = snapshot.backdrops[0]?.id ?? '';
    const firstPose = snapshot.poses[0]?.id ?? '';
    const firstMood = snapshot.moods[0]?.id ?? '';
    const headwearIds = snapshot.props.filter((p) => p.slot === 'headwear').map((p) => p.id);
    const eyewearIds = snapshot.props.filter((p) => p.slot === 'eyewear').map((p) => p.id);
    const accessoryIds = snapshot.props.filter((p) => p.slot === 'accessory').map((p) => p.id);

    const existingSampleTemplate = snapshot.packs[0]?.requiredFiles[0]?.path ?? '';
    const existingSamplePreview = snapshot.packs[0]?.previewImage ?? '';

    const newPack: PromptPack = {
      slug,
      title,
      titleKo: '',
      subtitle: 'Custom Korean photo booth prompt pack.',
      format: newPackFormat,
      formatLabel: preset.formatLabel,
      formatLabelKo: preset.formatLabelKo,
      cuts: preset.cuts,
      tags: ['Cute'],
      isNew: true,
      isSample: false,
      premium: false,
      previewImage: existingSamplePreview,
      previewWidth: 800,
      previewHeight: 1200,
      aspectClass: preset.aspectClass,
      requiredFiles: existingSampleTemplate
        ? [
            {
              id: 'strip-template',
              label: `${preset.formatLabel} Guide`,
              roleDescription: `${preset.formatLabel.toLowerCase()} layout frame guide`,
              path: existingSampleTemplate,
              filename: `strip-template-${slug}.png`,
            },
          ]
        : [],
      allowed: {
        headwear: headwearIds.slice(0, 3),
        eyewear: eyewearIds.slice(0, 3),
        accessory: accessoryIds.slice(0, 2),
        backdrops: snapshot.backdrops.slice(0, 4).map((b) => b.id),
        poses: snapshot.poses.slice(0, 3).map((p) => p.id),
        moods: snapshot.moods.map((m) => m.id),
      },
      defaults: {
        headwear: headwearIds[0] ?? null,
        eyewear: null,
        accessory: null,
        backdrop: firstBackdrop,
        pose: firstPose,
        mood: firstMood,
      },
      template: DEFAULT_TEMPLATE,
    };

    onUpdateSnapshot((prev) => ({
      ...prev,
      packs: [newPack, ...prev.packs],
    }));
    setSelectedSlug(slug);
    setNewPackTitle('');
    setNewPackSlug('');
    newPackDialogRef.current?.close();
    onAnnounce(`Created new pack "${title}". Upload its preview and strip template before publishing.`);
  }

  function handleDeleteActivePack() {
    if (!activePack) return;
    const slugToRemove = activePack.slug;
    const prefix = `/assets/packs/${slugToRemove}/`;
    if (activePack.previewImage.startsWith(prefix)) {
      onQueueAssetDelete(activePack.previewImage);
    }
    for (const file of activePack.requiredFiles) {
      if (file.path.startsWith(prefix)) {
        onQueueAssetDelete(file.path);
      }
    }

    onUpdateSnapshot((prev) => ({
      ...prev,
      packs: prev.packs.filter((p) => p.slug !== slugToRemove),
    }));
    deleteDialogRef.current?.close();
    onAnnounce(`Removed pack "${activePack.title}" from staged changes.`);
  }

  async function handlePreviewUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !activePack) return;
    setUploadError(null);
    setUploadStatus('Optimizing preview image...');
    try {
      const opt = await optimizeImageFile(file, 'preview');
      const assetUrl = `/assets/packs/${activePack.slug}/preview.${opt.extension}`;
      onStageUpload({
        assetUrl,
        repoPath: `public${assetUrl}`,
        base64: opt.base64,
        dataUrl: opt.dataUrl,
        width: opt.width,
        height: opt.height,
        byteSize: opt.byteSize,
      });
      updateActivePack((p) => ({
        ...p,
        previewImage: assetUrl,
        previewWidth: opt.width,
        previewHeight: opt.height,
      }));
      setUploadStatus(`Staged preview (${opt.width}x${opt.height}px, ${Math.round(opt.byteSize / 1024)} KB).`);
      onAnnounce('Preview image staged.');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Preview upload failed.');
      setUploadStatus(null);
    } finally {
      event.target.value = '';
    }
  }

  async function handleRequiredFileUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    replaceFileId?: string
  ) {
    const file = event.target.files?.[0];
    if (!file || !activePack) return;
    setUploadError(null);
    setUploadStatus('Optimizing strip template image...');
    try {
      const opt = await optimizeImageFile(file, 'template');
      const rawId = replaceFileId ?? slugifyFilename(file.name);
      let fileId = rawId;
      if (!replaceFileId) {
        let counter = 2;
        while (activePack.requiredFiles.some((f) => f.id === fileId)) {
          fileId = `${rawId}-${counter++}`;
        }
      }
      const filename = `${fileId}.${opt.extension}`;
      const assetUrl = `/assets/packs/${activePack.slug}/files/${filename}`;

      onStageUpload({
        assetUrl,
        repoPath: `public${assetUrl}`,
        base64: opt.base64,
        dataUrl: opt.dataUrl,
        width: opt.width,
        height: opt.height,
        byteSize: opt.byteSize,
      });

      updateActivePack((p) => {
        if (replaceFileId) {
          return {
            ...p,
            requiredFiles: p.requiredFiles.map((rf) =>
              rf.id === replaceFileId ? { ...rf, path: assetUrl, filename } : rf
            ),
          };
        }
        const added: RequiredFile = {
          id: fileId,
          label: file.name.replace(/\.[^.]+$/, ''),
          roleDescription: 'reference template or frame overlay',
          path: assetUrl,
          filename,
        };
        return { ...p, requiredFiles: [...p.requiredFiles, added] };
      });

      setUploadStatus(`Staged template "${filename}" (${opt.width}x${opt.height}px).`);
      onAnnounce(`Staged strip template ${filename}.`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Template upload failed.');
      setUploadStatus(null);
    } finally {
      event.target.value = '';
    }
  }

  function insertPlaceholder(token: string) {
    if (!activePack) return;
    const el = textareaRef.current;
    if (!el) {
      updateActivePack((p) => ({ ...p, template: `${p.template} ${token}` }));
      return;
    }
    const start = el.selectionStart ?? activePack.template.length;
    const end = el.selectionEnd ?? start;
    const nextText =
      activePack.template.slice(0, start) + token + activePack.template.slice(end);
    updateActivePack((p) => ({ ...p, template: nextText }));
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + token.length;
      el.setSelectionRange(caret, caret);
    });
  }

  function toggleAllowed(
    field: 'headwear' | 'eyewear' | 'accessory' | 'backdrops' | 'poses' | 'moods',
    id: string
  ) {
    if (!activePack) return;
    updateActivePack((p) => {
      const list = p.allowed[field];
      const exists = list.includes(id);
      const nextList = exists ? list.filter((x) => x !== id) : [...list, id];
      const nextDefaults = { ...p.defaults };

      // Keep defaults synchronized if an allowed option is unchecked.
      if (exists) {
        if (field === 'headwear' && nextDefaults.headwear === id) nextDefaults.headwear = null;
        if (field === 'eyewear' && nextDefaults.eyewear === id) nextDefaults.eyewear = null;
        if (field === 'accessory' && nextDefaults.accessory === id) nextDefaults.accessory = null;
        if (field === 'backdrops' && nextDefaults.backdrop === id) {
          nextDefaults.backdrop = nextList[0] ?? '';
        }
        if (field === 'poses' && nextDefaults.pose === id) {
          nextDefaults.pose = nextList[0] ?? '';
        }
        if (field === 'moods' && nextDefaults.mood === id) {
          nextDefaults.mood = nextList[0] ?? '';
        }
      } else {
        if (field === 'backdrops' && !nextDefaults.backdrop) nextDefaults.backdrop = id;
        if (field === 'poses' && !nextDefaults.pose) nextDefaults.pose = id;
        if (field === 'moods' && !nextDefaults.mood) nextDefaults.mood = id;
      }

      return {
        ...p,
        allowed: { ...p.allowed, [field]: nextList },
        defaults: nextDefaults,
      };
    });
  }

  const effectiveTestSelection: CustomizerSelection | null = useMemo(() => {
    if (!activePack) return null;
    const base = testSelection ?? activePack.defaults;
    return {
      headwear:
        base.headwear && activePack.allowed.headwear.includes(base.headwear)
          ? base.headwear
          : activePack.defaults.headwear,
      eyewear:
        base.eyewear && activePack.allowed.eyewear.includes(base.eyewear)
          ? base.eyewear
          : activePack.defaults.eyewear,
      accessory:
        base.accessory && activePack.allowed.accessory.includes(base.accessory)
          ? base.accessory
          : activePack.defaults.accessory,
      backdrop: activePack.allowed.backdrops.includes(base.backdrop)
        ? base.backdrop
        : activePack.defaults.backdrop,
      pose: activePack.allowed.poses.includes(base.pose) ? base.pose : activePack.defaults.pose,
      mood: activePack.allowed.moods.includes(base.mood) ? base.mood : activePack.defaults.mood,
    };
  }, [activePack, testSelection]);

  const liveCompiled = useMemo(() => {
    if (!activePack || !effectiveTestSelection) return null;
    return compilePackPrompt(activePack, library, effectiveTestSelection);
  }, [activePack, library, effectiveTestSelection]);

  const unresolvedTokens = useMemo(
    () => (liveCompiled ? findUnresolvedPlaceholders(liveCompiled.prompt) : []),
    [liveCompiled]
  );

  const placeholderChips = useMemo(() => {
    const base = [
      { token: '{attachments.list}', hint: 'Numbered Image 1..N list' },
      { token: '{props.sentence}', hint: 'Selected props sentence' },
      { token: '{backdrop.full}', hint: 'Selected backdrop + Image ref' },
      { token: '{pose.text}', hint: 'Selected pose instructions' },
      { token: '{mood.text}', hint: 'Selected lighting & film mood' },
    ];
    if (!activePack) return base;
    for (const file of activePack.requiredFiles) {
      base.push({
        token: `{file.${file.id}}`,
        hint: `Image ref for ${file.label}`,
      });
    }
    return base;
  }, [activePack]);

  const headwearProps = snapshot.props.filter((p) => p.slot === 'headwear');
  const eyewearProps = snapshot.props.filter((p) => p.slot === 'eyewear');
  const accessoryProps = snapshot.props.filter((p) => p.slot === 'accessory');

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      {/* Left Rail: Pack Selector List */}
      <aside className="rounded-[20px] border-2 border-[var(--ink)] bg-[var(--surface)] p-4 lg:sticky lg:top-24 lg:col-span-4">
        <div className="flex items-center justify-between gap-2 border-b-2 border-[var(--border-subtle)] pb-3">
          <h2 className="text-lg font-extrabold">
            Prompt Packs ({snapshot.packs.length})
          </h2>
          <button
            type="button"
            onClick={() => {
              setNewPackError(null);
              newPackDialogRef.current?.showModal();
            }}
            className="btn-booth px-3 py-1.5 text-xs"
          >
            <PlusIcon className="h-4 w-4" />
            <span>New pack</span>
          </button>
        </div>

        {snapshot.packs.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--ink-muted)]">
            No packs yet. Create one to start editing.
          </p>
        ) : (
          <ul className="mt-3 space-y-2" aria-label="Select a prompt pack to edit">
            {snapshot.packs.map((pack) => {
              const active = pack.slug === selectedSlug;
              return (
                <li key={pack.slug}>
                  <button
                    type="button"
                    onClick={() => setSelectedSlug(pack.slug)}
                    aria-current={active ? 'true' : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 p-2.5 text-left transition-colors ${
                      active
                        ? 'border-[var(--ink)] bg-[var(--surface-tint)]'
                        : 'border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--ink)]'
                    }`}
                  >
                    <img
                      src={resolvePreviewSrc(pack.previewImage)}
                      alt=""
                      width={48}
                      height={64}
                      className="h-16 w-12 shrink-0 rounded-lg border border-[var(--ink)] bg-[var(--bg)] object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-[var(--ink)]">
                        {pack.title}
                      </p>
                      <p className="truncate text-xs font-semibold text-[var(--ink-muted)]">
                        {pack.formatLabel} · <span className="font-mono">{pack.slug}</span>
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {pack.isSample && (
                          <span className="rounded bg-[var(--bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--ink-muted)]">
                            SAMPLE
                          </span>
                        )}
                        {pack.isNew && (
                          <span className="rounded bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-extrabold text-[var(--on-accent)]">
                            NEW
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Right Main Area: Selected Pack Editor */}
      <div className="space-y-6 lg:col-span-8">
        {!activePack ? (
          <div className="rounded-[20px] border-2 border-dashed border-[var(--border-control)] bg-[var(--surface)] p-10 text-center">
            <p className="font-[var(--font-display)] text-lg font-extrabold">
              Select a pack on the left or create a new pack
            </p>
          </div>
        ) : (
          <>
            {/* Section 1: Pack Details & Media */}
            <section className="rounded-[20px] border-2 border-[var(--ink)] bg-[var(--surface)] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[var(--border-subtle)] pb-4">
                <div>
                  <h2 className="text-xl font-extrabold">{activePack.title}</h2>
                  <p className="font-mono text-xs text-[var(--ink-muted)]">
                    /pack/{activePack.slug}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteDialogRef.current?.showModal()}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border-2 border-[var(--error-text)] bg-[var(--surface)] px-3.5 py-2 text-xs font-bold text-[var(--error-text)] hover:bg-[var(--error-bg)]"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>Delete pack</span>
                </button>
              </div>

              {uploadError && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border-2 border-[var(--error-text)] bg-[var(--error-bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--error-text)]"
                >
                  {uploadError}
                </p>
              )}
              {uploadStatus && !uploadError && (
                <p className="mt-4 rounded-xl border-2 border-[var(--success-text)] bg-[var(--success-bg)] px-3.5 py-2 text-xs font-bold text-[var(--success-text)]">
                  {uploadStatus}
                </p>
              )}

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="pack-title" className="block text-sm font-bold">
                    Pack Title
                  </label>
                  <input
                    id="pack-title"
                    type="text"
                    required
                    value={activePack.title}
                    onChange={(e) =>
                      updateActivePack((p) => ({ ...p, title: e.target.value }))
                    }
                    className="admin-input mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="pack-title-ko" className="block text-sm font-bold">
                    Korean Title Accent
                  </label>
                  <input
                    id="pack-title-ko"
                    type="text"
                    value={activePack.titleKo}
                    onChange={(e) =>
                      updateActivePack((p) => ({ ...p, titleKo: e.target.value }))
                    }
                    className="admin-input mt-1"
                    placeholder="토끼 감성 네컷"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="pack-subtitle" className="block text-sm font-bold">
                  Short Description
                </label>
                <input
                  id="pack-subtitle"
                  type="text"
                  value={activePack.subtitle}
                  onChange={(e) =>
                    updateActivePack((p) => ({ ...p, subtitle: e.target.value }))
                  }
                  className="admin-input mt-1"
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="pack-format" className="block text-sm font-bold">
                    Strip Format
                  </label>
                  <select
                    id="pack-format"
                    value={activePack.format}
                    onChange={(e) => {
                      const fmt = e.target.value as PackFormat;
                      const preset = FORMAT_PRESETS[fmt];
                      updateActivePack((p) => ({
                        ...p,
                        format: fmt,
                        formatLabel: preset.formatLabel,
                        formatLabelKo: preset.formatLabelKo,
                        cuts: preset.cuts,
                        aspectClass: preset.aspectClass,
                      }));
                    }}
                    className="admin-input mt-1"
                  >
                    <option value="4-cut">4-Cut Strip (네컷)</option>
                    <option value="3-cut">3-Cut Strip (세컷)</option>
                    <option value="6-cut">6-Cut Grid (여섯컷)</option>
                    <option value="polaroid">Single Polaroid (폴라로이드)</option>
                    <option value="haru-2x2">Haru Film 2x2 (하루필름)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="pack-cuts" className="block text-sm font-bold">
                    Number of Cuts
                  </label>
                  <input
                    id="pack-cuts"
                    type="number"
                    min={1}
                    max={8}
                    value={activePack.cuts}
                    onChange={(e) =>
                      updateActivePack((p) => ({
                        ...p,
                        cuts: Math.max(1, Number(e.target.value) || 1),
                      }))
                    }
                    className="admin-input mt-1"
                  />
                </div>

                <div>
                  <label htmlFor="pack-tags" className="block text-sm font-bold">
                    Tags (comma separated)
                  </label>
                  <input
                    id="pack-tags"
                    type="text"
                    value={activePack.tags.join(', ')}
                    onChange={(e) => {
                      const tags = e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean);
                      updateActivePack((p) => ({ ...p, tags }));
                    }}
                    className="admin-input mt-1"
                    placeholder="Cute, Classic, Pastel"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-5">
                <label className="admin-check-label inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(activePack.isNew)}
                    onChange={(e) =>
                      updateActivePack((p) => ({ ...p, isNew: e.target.checked }))
                    }
                    className="h-5 w-5"
                  />
                  <span>Show NEW badge</span>
                </label>

                <label className="admin-check-label inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(activePack.isSample)}
                    onChange={(e) =>
                      updateActivePack((p) => ({ ...p, isSample: e.target.checked }))
                    }
                    className="h-5 w-5"
                  />
                  <span>Mark as SAMPLE placeholder</span>
                </label>

                <label className="admin-check-label inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(activePack.premium)}
                    onChange={(e) =>
                      updateActivePack((p) => ({ ...p, premium: e.target.checked }))
                    }
                    className="h-5 w-5"
                  />
                  <span>Premium flag (future)</span>
                </label>
              </div>

              {/* Preview Image + Strip Templates Side-by-Side */}
              <div className="mt-6 grid grid-cols-1 gap-4 border-t-2 border-[var(--border-subtle)] pt-5 md:grid-cols-2">
                <div className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg)] p-4">
                  <h3 className="text-sm font-extrabold">Pack Preview Image</h3>
                  <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                    Shown on homepage cards, social share previews, and pack page. Auto-resized to 1600px max.
                  </p>
                  <div className="mt-3 flex items-start gap-3.5">
                    <img
                      src={resolvePreviewSrc(activePack.previewImage)}
                      alt={`${activePack.title} preview`}
                      width={96}
                      height={128}
                      className="h-32 w-24 shrink-0 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] object-contain"
                    />
                    <div className="space-y-2">
                      <p className="font-mono text-xs text-[var(--ink-muted)]">
                        {activePack.previewWidth} x {activePack.previewHeight} px
                      </p>
                      <label htmlFor="pack-preview-upload" className="btn-outline inline-flex text-xs">
                        <UploadIcon className="h-4 w-4" />
                        <span>Replace preview</span>
                      </label>
                      <input
                        id="pack-preview-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handlePreviewUpload}
                        className="sr-only"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg)] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold">
                        Strip Templates / Required Files ({activePack.requiredFiles.length})
                      </h3>
                      <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                        Always bundled right after Image 1 (selfie).
                      </p>
                    </div>
                    <label
                      htmlFor="pack-add-template"
                      className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold hover:bg-[var(--surface-tint)]"
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>Add file</span>
                    </label>
                    <input
                      id="pack-add-template"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => handleRequiredFileUpload(e)}
                      className="sr-only"
                    />
                  </div>

                  <ul className="mt-3 space-y-2.5">
                    {activePack.requiredFiles.map((file) => (
                      <li
                        key={file.id}
                        className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={resolvePreviewSrc(file.path)}
                            alt=""
                            width={44}
                            height={56}
                            className="h-14 w-11 shrink-0 rounded-lg border border-[var(--ink)] bg-[var(--bg)] object-contain"
                          />
                          <div className="min-w-0 flex-1">
                            <input
                              type="text"
                              aria-label={`Label for ${file.id}`}
                              value={file.label}
                              onChange={(e) =>
                                updateActivePack((p) => ({
                                  ...p,
                                  requiredFiles: p.requiredFiles.map((rf) =>
                                    rf.id === file.id ? { ...rf, label: e.target.value } : rf
                                  ),
                                }))
                              }
                              className="w-full rounded border border-[var(--border-subtle)] px-2 py-1 text-xs font-bold"
                            />
                            <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--ink-muted)]">
                              Token: {`{file.${file.id}}`}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <label
                              htmlFor={`replace-file-${file.id}`}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border-control)] bg-[var(--bg)] text-[var(--ink)] hover:border-[var(--ink)]"
                              title={`Replace ${file.label} image`}
                            >
                              <UploadIcon className="h-4 w-4" />
                              <span className="sr-only">Replace {file.label}</span>
                            </label>
                            <input
                              id={`replace-file-${file.id}`}
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={(e) => handleRequiredFileUpload(e, file.id)}
                              className="sr-only"
                            />
                            <button
                              type="button"
                              aria-label={`Remove required file ${file.label}`}
                              onClick={() => {
                                if (file.path.startsWith(`/assets/packs/${activePack.slug}/`)) {
                                  onQueueAssetDelete(file.path);
                                }
                                updateActivePack((p) => ({
                                  ...p,
                                  requiredFiles: p.requiredFiles.filter((rf) => rf.id !== file.id),
                                }));
                              }}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--error-text)] bg-[var(--surface)] text-[var(--error-text)] hover:bg-[var(--error-bg)]"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 2: Allowed Library Options & Defaults */}
            <section className="rounded-[20px] border-2 border-[var(--ink)] bg-[var(--surface)] p-5 sm:p-6">
              <h3 className="text-lg font-extrabold">
                Allowed Options & Preview Defaults
              </h3>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Check which shared library items users can pick in this pack. Set the defaults that match your pack preview image.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Optional Prop Slots */}
                {(
                  [
                    { field: 'headwear', label: 'Headwear Props', items: headwearProps },
                    { field: 'eyewear', label: 'Eyewear Props', items: eyewearProps },
                    { field: 'accessory', label: 'Hands & Extras', items: accessoryProps },
                  ] as const
                ).map((group) => (
                  <fieldset
                    key={group.field}
                    className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg)] p-3.5"
                  >
                    <legend className="px-1 text-xs font-extrabold uppercase tracking-wider text-[var(--ink)]">
                      {group.label}
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.items.map((item) => {
                        const checked = activePack.allowed[group.field].includes(item.id);
                        return (
                          <label
                            key={item.id}
                            className={`admin-check-label inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 px-3 py-1.5 text-xs font-bold ${
                              checked
                                ? 'border-[var(--ink)] bg-[var(--surface-tint)]'
                                : 'border-[var(--border-subtle)] bg-[var(--surface)]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleAllowed(group.field, item.id)}
                              className="h-4 w-4"
                            />
                            <span>{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="mt-3">
                      <label
                        htmlFor={`def-${group.field}`}
                        className="block text-xs font-bold text-[var(--ink-muted)]"
                      >
                        Default {group.field}
                      </label>
                      <select
                        id={`def-${group.field}`}
                        value={activePack.defaults[group.field] ?? ''}
                        onChange={(e) =>
                          updateActivePack((p) => ({
                            ...p,
                            defaults: {
                              ...p.defaults,
                              [group.field]: e.target.value || null,
                            },
                          }))
                        }
                        className="admin-input mt-1 text-xs"
                      >
                        <option value="">None</option>
                        {activePack.allowed[group.field].map((id) => (
                          <option key={id} value={id}>
                            {library.props[id]?.label ?? id}
                          </option>
                        ))}
                      </select>
                    </div>
                  </fieldset>
                ))}

                {/* Required Categories */}
                {(
                  [
                    {
                      field: 'backdrops',
                      defaultKey: 'backdrop',
                      label: 'Backdrops',
                      items: snapshot.backdrops,
                    },
                    {
                      field: 'poses',
                      defaultKey: 'pose',
                      label: 'Poses',
                      items: snapshot.poses,
                    },
                    {
                      field: 'moods',
                      defaultKey: 'mood',
                      label: 'Film Moods',
                      items: snapshot.moods,
                    },
                  ] as const
                ).map((group) => (
                  <fieldset
                    key={group.field}
                    className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg)] p-3.5"
                  >
                    <legend className="px-1 text-xs font-extrabold uppercase tracking-wider text-[var(--ink)]">
                      {group.label}
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.items.map((item) => {
                        const checked = activePack.allowed[group.field].includes(item.id);
                        return (
                          <label
                            key={item.id}
                            className={`admin-check-label inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 px-3 py-1.5 text-xs font-bold ${
                              checked
                                ? 'border-[var(--ink)] bg-[var(--surface-tint)]'
                                : 'border-[var(--border-subtle)] bg-[var(--surface)]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleAllowed(group.field, item.id)}
                              className="h-4 w-4"
                            />
                            <span>{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="mt-3">
                      <label
                        htmlFor={`def-${group.defaultKey}`}
                        className="block text-xs font-bold text-[var(--ink-muted)]"
                      >
                        Default {group.defaultKey}
                      </label>
                      <select
                        id={`def-${group.defaultKey}`}
                        value={activePack.defaults[group.defaultKey]}
                        onChange={(e) =>
                          updateActivePack((p) => ({
                            ...p,
                            defaults: {
                              ...p.defaults,
                              [group.defaultKey]: e.target.value,
                            },
                          }))
                        }
                        className="admin-input mt-1 text-xs"
                      >
                        {activePack.allowed[group.field].map((id) => {
                          const found = group.items.find((x) => x.id === id);
                          return (
                            <option key={id} value={id}>
                              {found?.label ?? id}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </fieldset>
                ))}
              </div>
            </section>

            {/* Section 3: Guided Prompt Template Editor + Live Compiled Preview */}
            <section className="rounded-[20px] border-2 border-[var(--ink)] bg-[var(--surface)] p-5 sm:p-6">
              <h3 className="text-lg font-extrabold">
                Premade Prompt Template{' '}
                <span className="font-semibold text-[var(--ink-muted)]">프롬프트 템플릿</span>
              </h3>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                Click any placeholder chip to insert it at your cursor. Unknown placeholders are flagged automatically.
              </p>

              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Insert template placeholder">
                {placeholderChips.map((chip) => (
                  <button
                    key={chip.token}
                    type="button"
                    title={chip.hint}
                    onClick={() => insertPlaceholder(chip.token)}
                    className="inline-flex min-h-[44px] items-center rounded-lg border-2 border-[var(--border-control)] bg-[var(--bg)] px-3 py-1.5 font-mono text-xs font-bold text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--surface-tint)]"
                  >
                    + {chip.token}
                  </button>
                ))}
              </div>

              <div className="mt-3">
                <label htmlFor="pack-template" className="sr-only">
                  Prompt template text
                </label>
                <textarea
                  ref={textareaRef}
                  id="pack-template"
                  rows={12}
                  value={activePack.template}
                  onChange={(e) =>
                    updateActivePack((p) => ({ ...p, template: e.target.value }))
                  }
                  className="admin-input font-mono text-xs leading-relaxed sm:text-[13px]"
                />
              </div>

              {unresolvedTokens.length > 0 && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl border-2 border-[var(--error-text)] bg-[var(--error-bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--error-text)]"
                >
                  Unrecognized placeholder(s): {unresolvedTokens.join(', ')}. Fix or replace with one of the chips above before publishing.
                </p>
              )}

              {/* Live Compiled Output Preview */}
              {liveCompiled && effectiveTestSelection && (
                <div className="mt-5 rounded-2xl border-2 border-[var(--ink)] bg-[var(--bg)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-extrabold text-[var(--ink)]">
                      Live Compiled Output Preview ({liveCompiled.attachments.length} Gemini images)
                    </h4>
                    <span className="text-xs font-semibold text-[var(--ink-muted)]">
                      Test option combos before publishing
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <div>
                      <label htmlFor="test-hw" className="block text-[11px] font-bold text-[var(--ink-muted)]">
                        Test headwear
                      </label>
                      <select
                        id="test-hw"
                        value={effectiveTestSelection.headwear ?? ''}
                        onChange={(e) =>
                          setTestSelection({
                            ...effectiveTestSelection,
                            headwear: e.target.value || null,
                          })
                        }
                        className="admin-input mt-1 min-h-[44px] text-xs"
                      >
                        <option value="">None</option>
                        {activePack.allowed.headwear.map((id) => (
                          <option key={id} value={id}>
                            {library.props[id]?.label ?? id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="test-bg" className="block text-[11px] font-bold text-[var(--ink-muted)]">
                        Test backdrop
                      </label>
                      <select
                        id="test-bg"
                        value={effectiveTestSelection.backdrop}
                        onChange={(e) =>
                          setTestSelection({
                            ...effectiveTestSelection,
                            backdrop: e.target.value,
                          })
                        }
                        className="admin-input mt-1 min-h-[44px] text-xs"
                      >
                        {activePack.allowed.backdrops.map((id) => (
                          <option key={id} value={id}>
                            {library.backdrops[id]?.label ?? id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="test-pose" className="block text-[11px] font-bold text-[var(--ink-muted)]">
                        Test pose
                      </label>
                      <select
                        id="test-pose"
                        value={effectiveTestSelection.pose}
                        onChange={(e) =>
                          setTestSelection({
                            ...effectiveTestSelection,
                            pose: e.target.value,
                          })
                        }
                        className="admin-input mt-1 min-h-[44px] text-xs"
                      >
                        {activePack.allowed.poses.map((id) => (
                          <option key={id} value={id}>
                            {library.poses[id]?.label ?? id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="test-mood" className="block text-[11px] font-bold text-[var(--ink-muted)]">
                        Test mood
                      </label>
                      <select
                        id="test-mood"
                        value={effectiveTestSelection.mood}
                        onChange={(e) =>
                          setTestSelection({
                            ...effectiveTestSelection,
                            mood: e.target.value,
                          })
                        }
                        className="admin-input mt-1 min-h-[44px] text-xs"
                      >
                        {activePack.allowed.moods.map((id) => (
                          <option key={id} value={id}>
                            {library.moods[id]?.label ?? id}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <pre className="mt-3 max-h-60 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-[var(--border-control)] bg-[var(--surface)] p-3.5 font-mono text-xs leading-relaxed text-[var(--ink)]">
                    {liveCompiled.prompt}
                  </pre>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {liveCompiled.attachments.map((att) => (
                      <span
                        key={att.imageNumber}
                        className="rounded-md border border-[var(--border-control)] bg-[var(--surface)] px-2 py-1 font-mono text-[11px] font-bold text-[var(--ink)]"
                      >
                        Image {att.imageNumber}: {att.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Add New Pack Native Modal Dialog */}
      <dialog
        ref={newPackDialogRef}
        {...({ closedby: 'any' } as Record<string, string>)}
        aria-labelledby="new-pack-title"
        className="w-[min(94vw,480px)]"
      >
        <form onSubmit={handleCreatePack} className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 border-b-2 border-[var(--border-subtle)] pb-3">
            <h3 id="new-pack-title" className="text-lg font-extrabold">
              Create New Prompt Pack
            </h3>
            <button
              type="button"
              onClick={() => newPackDialogRef.current?.close()}
              aria-label="Close new pack dialog"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)]"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="np-title" className="block text-sm font-bold">
                Pack Title
              </label>
              <input
                id="np-title"
                type="text"
                required
                value={newPackTitle}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewPackTitle(val);
                  if (!newPackSlug) setNewPackSlug(slugifyFilename(val));
                }}
                className="admin-input mt-1"
                placeholder="Strawberry 3-Cut Strip"
              />
            </div>

            <div>
              <label htmlFor="np-slug" className="block text-sm font-bold">
                URL Slug
              </label>
              <span className="mb-1 block text-xs text-[var(--ink-muted)]">
                Becomes /pack/your-slug (lowercase letters, numbers, hyphens)
              </span>
              <input
                id="np-slug"
                type="text"
                required
                spellCheck={false}
                value={newPackSlug}
                onChange={(e) => setNewPackSlug(e.target.value.toLowerCase())}
                className="admin-input font-mono text-sm"
                placeholder="strawberry-3cut"
              />
            </div>

            <div>
              <label htmlFor="np-format" className="block text-sm font-bold">
                Strip Format
              </label>
              <select
                id="np-format"
                value={newPackFormat}
                onChange={(e) => setNewPackFormat(e.target.value as PackFormat)}
                className="admin-input mt-1"
              >
                <option value="4-cut">4-Cut Strip (네컷)</option>
                <option value="3-cut">3-Cut Strip (세컷)</option>
                <option value="6-cut">6-Cut Grid (여섯컷)</option>
                <option value="polaroid">Single Polaroid (폴라로이드)</option>
                <option value="haru-2x2">Haru Film 2x2 (하루필름)</option>
              </select>
            </div>

            {newPackError && (
              <p
                role="alert"
                className="rounded-xl border-2 border-[var(--error-text)] bg-[var(--error-bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--error-text)]"
              >
                {newPackError}
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t-2 border-[var(--border-subtle)] pt-4">
            <button
              type="button"
              onClick={() => newPackDialogRef.current?.close()}
              className="btn-outline"
            >
              Cancel
            </button>
            <button type="submit" className="btn-booth">
              Create pack
            </button>
          </div>
        </form>
      </dialog>

      {/* Delete Pack Native Modal Dialog */}
      <dialog
        ref={deleteDialogRef}
        {...({ closedby: 'any' } as Record<string, string>)}
        aria-labelledby="del-pack-title"
        className="w-[min(94vw,440px)]"
      >
        {activePack && (
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 border-b-2 border-[var(--border-subtle)] pb-3">
              <h3 id="del-pack-title" className="text-lg font-extrabold">
                Delete "{activePack.title}"?
              </h3>
              <button
                type="button"
                onClick={() => deleteDialogRef.current?.close()}
                aria-label="Close delete dialog"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)]"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-4 text-sm text-[var(--ink-muted)]">
              This removes <code className="font-mono text-xs">/pack/{activePack.slug}</code> and queues its pack-specific preview and template files for removal when you publish. Shared library items remain untouched.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => deleteDialogRef.current?.close()}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteActivePack}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-[var(--ink)] bg-[var(--error-text)] px-4 py-2 text-sm font-bold text-white hover:opacity-90"
              >
                <TrashIcon className="h-4 w-4" />
                <span>Delete pack</span>
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
